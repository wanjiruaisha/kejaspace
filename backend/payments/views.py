from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from rooms.models import Room
from .models import Charge, Payment
from .serializers import (
    ChargeSerializer,
    PaymentSerializer,
    ManualPaymentSerializer,
)

class MyChargeListView(generics.ListAPIView):
    serializer_class = ChargeSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["stay", "billing_month", "due_date"]
    search_fields = ["stay__room__room_number"]
    ordering_fields = [
        "id",
        "amount",
        "billing_month",
        "due_date",
        "created_at",
    ]
    ordering = ["-billing_month", "-id"]    

    def get_queryset(self):
        return Charge.objects.filter(
            stay__resident=self.request.user
        ).select_related("stay__resident", "stay__room")


class StaffChargeListCreateView(generics.ListCreateAPIView):
    queryset = Charge.objects.select_related(
        "stay__resident",
        "stay__room",
    ).all()
    serializer_class = ChargeSerializer
    permission_classes = [IsAdminUser]

    filterset_fields = ["stay", "billing_month", "due_date"]
    search_fields = ["stay__room__room_number"]
    ordering_fields = [
        "id",
        "amount",
        "billing_month",
        "due_date",
        "created_at",
    ]
    ordering = ["-billing_month", "-id"]


    def perform_create(self, serializer):
        with transaction.atomic():
            stay = Stay.objects.select_for_update().get(
                pk=serializer.validated_data["stay"].pk
            )

            if stay.status not in ["reserved", "checked_in"]:
                raise ValidationError(
                    {
                        "stay": (
                            "New rent charges require a reserved "
                            "or checked-in stay."
                        )
                    }
                )

            billing_month = serializer.validated_data["billing_month"]

            if Charge.objects.filter(
                stay=stay,
                billing_month=billing_month,
            ).exists():
                raise ValidationError(
                    {
                        "detail": (
                            "This stay already has a rent charge "
                            "for that month."
                        )
                    }
                )

            serializer.save(
                stay=stay,
                created_by=self.request.user,
                is_initial_rent=False,
            )


class MyPaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["charge", "method"]
    search_fields = ["reference"]
    ordering_fields = ["id", "amount", "created_at"]
    ordering = ["-created_at", "-id"]


    def get_queryset(self):
        return Payment.objects.filter(
            charge__stay__resident=self.request.user
        )


class StaffPaymentListView(generics.ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminUser]


    filterset_fields = ["charge", "method"]
    search_fields = ["reference"]
    ordering_fields = ["id", "amount", "created_at"]
    ordering = ["-created_at", "-id"]    


class RecordManualPaymentView(generics.CreateAPIView):
    serializer_class = ManualPaymentSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        reference = serializer.validated_data["reference"]
        selected_charge = serializer.validated_data["charge"]

        original_stay = Stay.objects.get(
            pk=selected_charge.stay_id
        )

        try:
            with transaction.atomic():
                get_user_model().objects.select_for_update().get(
                    pk=original_stay.resident_id
                )

                Room.objects.select_for_update().get(
                    pk=original_stay.room_id
                )

                stay = Stay.objects.select_for_update().get(
                    pk=original_stay.pk
                )

                charge = Charge.objects.select_for_update().get(
                    pk=selected_charge.pk,
                    stay=stay,
                )

                amount_paid = charge.get_amount_paid()
                balance = charge.amount - amount_paid
                amount = serializer.validated_data["amount"]

                if balance <= 0:
                    raise ValidationError(
                        {"detail": "This charge is already fully paid."}
                    )

                if charge.is_initial_rent:
                    if stay.status != "awaiting_payment":
                        raise ValidationError(
                            {
                                "detail": (
                                    "Initial rent can only confirm a stay "
                                    "that is awaiting payment."
                                )
                            }
                        )

                    if stay.payment_deadline is None:
                        raise ValidationError(
                            {
                                "detail": (
                                    "This stay has no payment deadline. "
                                    "An administrator must review it."
                                )
                            }
                        )

                    if stay.payment_deadline <= timezone.now():
                        raise ValidationError(
                            {
                                "detail": (
                                    "The payment hold has expired. "
                                    "Staff must arrange a new allocation "
                                    "before accepting payment for it."
                                )
                            }
                        )

                    if amount_paid > 0:
                        raise ValidationError(
                            {
                                "detail": (
                                    "This initial charge already has a "
                                    "partial payment and needs "
                                    "administrator review."
                                )
                            }
                        )

                    if amount != charge.amount:
                        raise ValidationError(
                            {
                                "amount": (
                                    "Pay the full first month's rent "
                                    f"of KES {charge.amount:.2f} "
                                    "in one payment."
                                )
                            }
                        )

                else:
                    if stay.status not in [
                        "reserved",
                        "checked_in",
                        "checked_out",
                    ]:
                        raise ValidationError(
                            {
                                "detail": (
                                    "Ordinary rent payments are not "
                                    "accepted for this stay's status."
                                )
                            }
                        )

                    if amount > balance:
                        raise ValidationError(
                            {
                                "amount": (
                                    "Payment cannot exceed the remaining "
                                    f"balance of KES {balance:.2f}."
                                )
                            }
                        )

                serializer.save(
                    charge=charge,
                    recorded_by=self.request.user,
                )

                if charge.is_initial_rent:
                    stay.status = "reserved"
                    stay.save(update_fields=["status"])

        except IntegrityError:
            if Payment.objects.filter(reference=reference).exists():
                raise ValidationError(
                    {
                        "reference": (
                            "A payment with this reference already exists."
                        )
                    }
                )
            raise