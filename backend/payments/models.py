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