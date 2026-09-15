from django.db import models


class MaintenanceRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In progress"),
        ("resolved", "Resolved"),
    ]

    stay = models.ForeignKey(
        "accommodation.Stay",
        on_delete=models.PROTECT,
        related_name="maintenance_requests",
    )
    title = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    staff_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title