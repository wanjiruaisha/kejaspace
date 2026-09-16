from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from rest_framework.test import APITestCase

from accommodation.models import AccommodationApplication, Stay
from rooms.models import Room

from .models import Charge, MpesaPaymentAttempt, Payment


class MpesaVerificationTests(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.resident = User.objects.create_user(
            username="test_resident",
            email="resident@example.com",
            password="TestPassword123!",
        )

        self.staff = User.objects.create_user(
            username="test_staff",
            email="staff@example.com",
            password="TestPassword123!",
            is_staff=True,
        )

        self.room = Room.objects.create(
            room_number="TEST-A101",
            capacity=2,
            monthly_price=Decimal("8500.00"),
            is_active=True,
        )

        today = timezone.localdate()

        self.application = AccommodationApplication.objects.create(
            applicant=self.resident,
            room=self.room,
            move_in_date=today,
            status="approved",
        )

        self.stay = Stay.objects.create(
            application=self.application,
            resident=self.resident,
            room=self.room,
            status="awaiting_payment",
            payment_deadline=timezone.now() + timedelta(hours=24),
        )

        self.charge = Charge.objects.create(
            stay=self.stay,
            billing_month=today.replace(day=1),
            amount=Decimal("8500.00"),
            due_date=today,
            is_initial_rent=True,
            created_by=self.staff,
        )

        self.attempt = MpesaPaymentAttempt.objects.create(
            charge=self.charge,
            phone_number="254708374149",
            amount=Decimal("8500.00"),
            checkout_request_id="TEST-CHECKOUT-001",
            status="pending",
        )

        self.url = reverse(
            "mpesa-verify",
            kwargs={"pk": self.attempt.pk},
        )

        self.client.force_authenticate(user=self.resident)

    def provider_response(self, code=0, description="Test success"):
        return {
            "ResponseCode": "0",
            "CheckoutRequestID": self.attempt.checkout_request_id,
            "ResultCode": str(code),
            "ResultDesc": description,
        }

    @patch("payments.mpesa_views.query_stk_status")
    def test_success_records_payment_and_reserves_stay(self, mock_query):
        mock_query.return_value = self.provider_response()

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 200, response.data)

        self.attempt.refresh_from_db()
        self.stay.refresh_from_db()

        self.assertEqual(self.attempt.status, "successful")
        self.assertEqual(self.stay.status, "reserved")
        self.assertTrue(response.data["payment_recorded"])

        payment = Payment.objects.get(charge=self.charge)

        self.assertEqual(payment.amount, Decimal("8500.00"))
        self.assertEqual(payment.method, "mpesa")
        self.assertEqual(self.attempt.payment_id, payment.pk)
        self.assertEqual(
            self.charge.get_amount_paid(),
            self.charge.amount,
        )

        mock_query.assert_called_once_with(
            self.attempt.checkout_request_id
        )

    @patch("payments.mpesa_views.query_stk_status")
    def test_repeated_verification_does_not_duplicate_payment(
        self, mock_query
    ):
        mock_query.return_value = self.provider_response()

        first = self.client.post(self.url, {}, format="json")
        second = self.client.post(self.url, {}, format="json")

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)

        self.assertEqual(
            Payment.objects.filter(charge=self.charge).count(),
            1,
        )
        self.assertEqual(
            first.data["payment_id"],
            second.data["payment_id"],
        )

    @patch("payments.mpesa_views.query_stk_status")
    def test_cancelled_payment_does_not_record_payment(self, mock_query):
        mock_query.return_value = self.provider_response(
            code=1032,
            description="Request Cancelled by user.",
        )

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 200, response.data)

        self.attempt.refresh_from_db()
        self.stay.refresh_from_db()

        self.assertEqual(self.attempt.status, "failed")
        self.assertIsNone(self.attempt.payment_id)
        self.assertEqual(self.stay.status, "awaiting_payment")
        self.assertFalse(
            Payment.objects.filter(charge=self.charge).exists()
        )

    @patch("payments.mpesa_views.query_stk_status")
    def test_success_after_hold_expiry_requires_review(self, mock_query):
        self.stay.payment_deadline = (
            timezone.now() - timedelta(minutes=1)
        )
        self.stay.save(update_fields=["payment_deadline"])

        mock_query.return_value = self.provider_response()

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 200, response.data)

        self.attempt.refresh_from_db()
        self.stay.refresh_from_db()

        self.assertEqual(self.attempt.status, "review")
        self.assertEqual(self.stay.status, "awaiting_payment")
        self.assertIsNone(self.attempt.payment_id)
        self.assertFalse(
            Payment.objects.filter(charge=self.charge).exists()
        )
        self.assertEqual(
            str(self.attempt.verification_result["ResultCode"]),
            "0",
        )

    @patch("payments.mpesa_views.query_stk_status")
    def test_another_resident_cannot_verify_attempt(self, mock_query):
        other_resident = get_user_model().objects.create_user(
            username="other_resident",
            email="other@example.com",
            password="TestPassword123!",
        )
        self.client.force_authenticate(user=other_resident)

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 404)
        mock_query.assert_not_called()
        self.assertFalse(
            Payment.objects.filter(charge=self.charge).exists()
        )