from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum


class Charge(models.Model):
    stay = models.ForeignKey(
        "accommodation.Stay",
        on_delete=models.PROTECT,
        related_name="charges",
    )
    billing_month = models.DateField()
    is_initial_rent = models.BooleanField(default=False)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    due_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_charges",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-billing_month", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["stay", "billing_month"],
                name="one_rent_charge_per_stay_month",
            ),
            models.UniqueConstraint(
                fields=["stay"],
                condition=models.Q(is_initial_rent=True),
                name="one_initial_rent_charge_per_stay",
            ),
        ]    

    def __str__(self):
        return f"Stay {self.stay_id} - {self.billing_month:%Y-%m}"

    def get_amount_paid(self):
        total = self.payments.aggregate(
            total=Sum("amount")
        )["total"]

        return total if total is not None else Decimal("0.00")

class Payment(models.Model):
    METHOD_CHOICES = [
        ("cash", "Cash"),
        ("bank", "Bank"),
        ("mpesa", "M-Pesa"),
    ]

    charge = models.ForeignKey(
        Charge,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    method = models.CharField(
        max_length=10,
        choices=METHOD_CHOICES,
    )
    reference = models.CharField(
        max_length=100,
        unique=True,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_payments",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} - KES {self.amount}"         



class MpesaPaymentAttempt(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("successful", "Successful"),
        ("failed", "Failed"),
        ("review", "Needs review"),
    ]

    charge = models.ForeignKey(
        Charge,
        on_delete=models.PROTECT,
        related_name="mpesa_attempts",
    )

    phone_number = models.CharField(max_length=12)

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    checkout_request_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    result_description = models.TextField(blank=True)

    payment = models.OneToOneField(
        Payment,
        on_delete=models.PROTECT,
        related_name="mpesa_attempt",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"M-Pesa attempt {self.pk} - {self.status}"    

class MpesaCallbackEvent(models.Model):
    checkout_request_id = models.CharField(
        max_length=100,
        db_index=True,
    )

    payload = models.JSONField()

    received_at = models.DateTimeField(auto_now_add=True)

    processed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-received_at", "-id"]

    def __str__(self):
        return f"Callback {self.pk} - {self.checkout_request_id}"        