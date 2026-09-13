from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Charge(models.Model):
    stay = models.ForeignKey(
        "accommodation.Stay",
        on_delete=models.PROTECT,
        related_name="charges",
    )
    billing_month = models.DateField()
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
        ]

    def __str__(self):
        return f"Stay {self.stay_id} - {self.billing_month:%Y-%m}"