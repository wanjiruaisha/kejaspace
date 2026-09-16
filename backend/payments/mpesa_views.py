import requests
import logging

logger = logging.getLogger(__name__)

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accommodation.models import Stay
from rooms.models import Room

from .models import Charge, MpesaPaymentAttempt
from .mpesa import get_mpesa_access_token, send_stk_push
from .serializers import MpesaInitiateSerializer

from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .models import MpesaCallbackEvent
from .serializers import MpesaCallbackSerializer

from django.shortcuts import get_object_or_404

from .mpesa import query_stk_status
from .mpesa_services import apply_verified_mpesa_result



class InitiateMpesaPaymentView(generics.GenericAPIView):
    serializer_class = MpesaInitiateSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selected_charge = serializer.validated_data["charge"]
        phone = serializer.validated_data["phone_number"]

        try:
            access_token = get_mpesa_access_token()
        except (requests.RequestException, ValueError):
            return Response(
                {"detail": "Could not authenticate with Safaricom."},
                status=502,
            )

        with transaction.atomic():
            get_user_model().objects.select_for_update().get(
                pk=request.user.pk
            )

            original_stay = Stay.objects.get(
                pk=selected_charge.stay_id
            )

            Room.objects.select_for_update().get(
                pk=original_stay.room_id
            )

            stay = Stay.objects.select_for_update().get(
                pk=original_stay.pk,
                resident=request.user,
            )

            charge = Charge.objects.select_for_update().get(
                pk=selected_charge.pk,
                stay=stay,
            )

            amount_paid = charge.get_amount_paid()
            amount = charge.amount - amount_paid

            if amount <= 0:
                raise ValidationError(
                    {"detail": "This charge is already fully paid."}
                )

            if charge.is_initial_rent:
                if stay.status != "awaiting_payment":
                    raise ValidationError(
                        {"detail": "This stay is not awaiting initial rent."}
                    )

                if (
                    stay.payment_deadline is None
                    or stay.payment_deadline <= timezone.now()
                ):
                    raise ValidationError(
                        {"detail": "The payment hold has expired."}
                    )

                if amount_paid > 0:
                    raise ValidationError(
                        {
                            "detail": (
                                "This initial charge has a partial payment. "
                                "Please ask staff to review it."
                            )
                        }
                    )

            elif stay.status not in [
                "reserved",
                "checked_in",
                "checked_out",
            ]:
                raise ValidationError(
                    {"detail": "This stay cannot receive rent payments."}
                )

            if amount != amount.to_integral_value():
                raise ValidationError(
                    {
                        "detail": (
                            "This M-Pesa integration requires whole shillings. "
                            "Ask staff to review this charge."
                        )
                    }
                )

            if MpesaPaymentAttempt.objects.filter(
                charge=charge,
                status__in=["pending", "review"],
            ).exists():
                raise ValidationError(
                    {
                        "detail": (
                            "This charge already has an unresolved "
                            "M-Pesa attempt."
                        )
                    }
                )

            attempt = MpesaPaymentAttempt.objects.create(
                charge=charge,
                phone_number=phone,
                amount=amount,
            )

        try:
            result = send_stk_push(
                access_token=access_token,
                phone_number=phone,
                amount=amount,
                charge_id=charge.pk,
            )
        except (requests.RequestException, ValueError) as exc:
            logger.error(
                "STK attempt %s failed: %s",
                attempt.pk,
                type(exc).__name__,
            )

            if isinstance(exc, ValueError):
                logger.error("STK validation error: %s", exc)

            attempt.status = "review"
            attempt.result_description = (
                "Could not establish whether Safaricom accepted the request."
            )
            attempt.save(
                update_fields=[
                    "status",
                    "result_description",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail": "The request outcome needs review. Do not retry yet.",
                    "attempt_id": attempt.pk,
                },
                status=502,
            )        

        checkout_id = result.get("CheckoutRequestID")

        if str(result.get("ResponseCode")) != "0" or not checkout_id:
            attempt.status = "review"
            attempt.result_description = (
                "Safaricom did not return the expected acceptance response."
            )
            attempt.save(
                update_fields=[
                    "status",
                    "result_description",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail": "Could not confirm request acceptance.",
                    "attempt_id": attempt.pk,
                },
                status=502,
            )

        try:
            with transaction.atomic():
                attempt.checkout_request_id = checkout_id
                attempt.save(
                    update_fields=["checkout_request_id", "updated_at"]
                )
        except IntegrityError:
            MpesaPaymentAttempt.objects.filter(pk=attempt.pk).update(
                status="review",
                result_description="Duplicate checkout identifier received.",
                updated_at=timezone.now(),
            )

            return Response(
                {
                    "detail": "The payment request needs review.",
                    "attempt_id": attempt.pk,
                },
                status=502,
            )

        return Response(
            {
                "detail": "Request accepted. Awaiting payment confirmation.",
                "attempt_id": attempt.pk,
                "status": "pending",
                "amount": format(amount, ".2f"),
            },
            status=202,
        )


class MpesaCallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        serializer = MpesaCallbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        callback = serializer.validated_data["Body"]["stkCallback"]

        MpesaCallbackEvent.objects.create(
            checkout_request_id=callback["CheckoutRequestID"],
            payload=serializer.validated_data,
        )

        return Response(
            {
                "ResultCode": 0,
                "ResultDesc": "Callback received",
            },
            status=200,
        )



class VerifyMpesaPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        attempts = MpesaPaymentAttempt.objects.filter(
            charge__stay__resident=request.user
        )

        attempt = get_object_or_404(attempts, pk=pk)

        if not attempt.checkout_request_id:
            return Response(
                {
                    "detail": (
                        "This attempt has no checkout ID yet. "
                        "Its request outcome may need review."
                    )
                },
                status=409,
            )

        try:
            result = query_stk_status(
                attempt.checkout_request_id
            )
        except (requests.RequestException, ValueError) as exc:
            logger.error(
                "STK verification failed: %s",
                type(exc).__name__,
            )        
            print("STK PUSH ERROR:", repr(exc))    
            return Response(
                {
                    "detail": (
                        "Could not check the payment with Safaricom. "
                        "This does not mean the payment failed."
                    )
                },
                status=502,
            )

        if str(result.get("ResponseCode")) != "0":
            return Response(
                {
                    "attempt_id": attempt.pk,
                    "provider_status": "unknown",
                    "detail": "Safaricom has not supplied a usable result.",
                },
                status=202,
            )

        if (
            result.get("CheckoutRequestID")
            != attempt.checkout_request_id
        ):
            return Response(
                {"detail": "Safaricom returned a mismatched checkout ID."},
                status=502,
            )

        result_code = result.get("ResultCode")

        if (
            isinstance(result_code, bool)
            or not isinstance(result_code, (str, int))
            or not str(result_code).isdigit()
        ):
            return Response(
                {
                    "attempt_id": attempt.pk,
                    "provider_status": "unknown",
                    "detail": "A final payment result is not available.",
                },
                status=202,
            )

        try:
            outcome = apply_verified_mpesa_result(
                attempt_id=attempt.pk,
                provider_result=result,
            )
        except ValueError:
            return Response(
                {"detail": "The payment result could not be safely applied."},
                status=502,
            )

        return Response(outcome, status=200)            




