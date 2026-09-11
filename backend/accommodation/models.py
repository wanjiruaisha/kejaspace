from django.conf import settings
from django.db import models


class AccommodationApplication(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="accommodation_applications",
    )

    room = models.ForeignKey(
        "rooms.Room",
        on_delete=models.PROTECT,
        related_name="applications",
    )

    move_in_date = models.DateField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="pending",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["applicant"],
                condition=models.Q(status="pending"),
                name="one_pending_application_per_user",
            )
        ]

    def __str__(self):
        return f"{self.applicant} - {self.room} - {self.status}"
class Stay(models.Model):
    STATUS_CHOICES = [
        ("reserved", "Reserved"),
        ("checked_in", "Checked in"),
        ("checked_out", "Checked out"),
        ("cancelled", "Cancelled"),
    ]

    application = models.OneToOneField(
        AccommodationApplication,
        on_delete=models.PROTECT,
        related_name="stay",
    )

    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stays",
    )

    room = models.ForeignKey(
        "rooms.Room",
        on_delete=models.PROTECT,
        related_name="stays",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="reserved",
    )

    check_in_at = models.DateTimeField(null=True, blank=True)
    check_out_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["resident"],
                condition=models.Q(
                    status__in=["reserved", "checked_in"]
                ),
                name="one_active_stay_per_resident",
            )
        ]

    def __str__(self):
        return f"{self.resident} - {self.room} - {self.status}"        