import hashlib

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from accommodation.models import Stay
from rooms.models import Room

from .models import Charge, MpesaPaymentAttempt, Payment


def apply_verified_mpesa_result(attempt_id, provider_result):
    original = MpesaPaymentAttempt.objects.select_related(
        "charge__stay"
    ).get(pk=attempt_id)

    original_stay = original.charge.stay

    with transaction.atomic():
        get_user_model().objects.select_for_update().get(
            pk=original_stay.resident_id
        )

        room = Room.objects.select_for_update().get(
            pk=original_stay.room_id
        )

        stay = Stay.objects.select_for_update().get(
            pk=original_stay.pk
        )

        charge = Charge.objects.select_for_update().get(
            pk=original.charge_id
        )

        attempt = MpesaPaymentAttempt.objects.select_for_update().get(
            pk=attempt_id
        )

        def finish(status, message):
            attempt.status = status
            attempt.result_description = message
            attempt.save()

            return {
                "attempt_id": attempt.pk,
                "status": attempt.status,
                "detail": message,
                "payment_recorded": attempt.payment_id is not None,
                "payment_id": attempt.payment_id,
                "stay_status": stay.status,
            }

        # A repeated verification must not create another payment.
        if attempt.payment_id is not None:
            return finish(
                attempt.status,
                "This payment has already been recorded.",
            )

        if (
            provider_result.get("CheckoutRequestID")
            != attempt.checkout_request_id
        ):
            raise ValueError("Checkout ID does not match this attempt.")

        if str(provider_result.get("ResponseCode")) != "0":
            raise ValueError("The query did not return a usable response.")

        raw_code = provider_result.get("ResultCode")

        if (
            isinstance(raw_code, bool)
            or not isinstance(raw_code, (str, int))
            or not str(raw_code).isdigit()
        ):
            raise ValueError("A final result code is required.")

        result_code = int(raw_code)

        # Do not overwrite previously verified success with a later failure.
        previously_successful = (
            str(attempt.verification_result.get("ResultCode")) == "0"
        )

        if previously_successful and result_code != 0:
            return finish(
                "review",
                "Conflicting verification results require staff review.",
            )

        attempt.verification_result = provider_result
        attempt.verified_at = timezone.now()

        if result_code != 0:
            return finish(
                "failed",
                f"Safaricom result {result_code}: "
                f"{provider_result.get('ResultDesc') or 'No explanation provided.'}",
            )       

        # Keep successful but unresolved payments for staff review.
        if previously_successful and attempt.status == "review":
            return finish(
                "review",
                "This verified payment still requires staff review.",
            )

        amount_paid = charge.get_amount_paid()
        balance = charge.amount - amount_paid

        if attempt.amount <= 0 or attempt.amount > balance:
            return finish(
                "review",
                "Payment succeeded, but it conflicts with the current balance.",
            )

        if charge.is_initial_rent:
            if (
                stay.status != "awaiting_payment"
                or stay.payment_deadline is None
                or stay.payment_deadline <= timezone.now()
            ):
                return finish(
                    "review",
                    "Payment succeeded, but the reservation hold is no longer valid.",
                )

            if not room.is_active:
                return finish(
                    "review",
                    "Payment succeeded, but the room is no longer open for allocation.",
                )

            if amount_paid != 0 or attempt.amount != charge.amount:
                return finish(
                    "review",
                    "Initial rent must cover the full charge without another payment.",
                )

        elif stay.status not in [
            "reserved",
            "checked_in",
            "checked_out",
        ]:
            return finish(
                "review",
                "Payment succeeded, but this stay requires staff review.",
            )

        # This is an internal reference, not an M-Pesa receipt number.
        reference = "STK-" + hashlib.sha256(
            attempt.checkout_request_id.encode("utf-8")
        ).hexdigest()

        try:
            with transaction.atomic():
                payment = Payment.objects.create(
                    charge=charge,
                    amount=attempt.amount,
                    method="mpesa",
                    reference=reference,
                    recorded_by=None,
                )
        except IntegrityError:
            if not Payment.objects.filter(reference=reference).exists():
                raise

            return finish(
                "review",
                "A payment with this internal reference already exists.",
            )

        attempt.payment = payment

        if charge.is_initial_rent:
            stay.status = "reserved"
            stay.save(update_fields=["status"])

        return finish(
            "successful",
            "Payment recorded successfully.",
        )