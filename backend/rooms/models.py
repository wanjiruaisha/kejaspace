from django.core.validators import MinValueValidator
from django.db import models


class Room(models.Model):
    room_number = models.CharField(max_length=20, unique=True)

    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    description = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Room {self.room_number}"