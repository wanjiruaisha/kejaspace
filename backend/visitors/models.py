from django.db import models


class Visitor(models.Model):
    STATUS_CHOICES = [
        ("expected", "Expected"),
        ("checked_in", "Checked in"),
        ("checked_out", "Checked out"),
        ("cancelled", "Cancelled"),
    ]

    stay = models.ForeignKey(
        "accommodation.Stay",
        on_delete=models.PROTECT,
        related_name="visitors",
    )
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    visit_date = models.DateField()
    purpose = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="expected",
    )
    check_in_at = models.DateTimeField(null=True, blank=True)
    check_out_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.full_name