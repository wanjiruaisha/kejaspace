from django.core.management.base import BaseCommand

from accommodation.models import Stay
from accommodation.services import expire_payment_holds


class Command(BaseCommand):
    help = "Mark overdue payment holds as expired."

    def handle(self, *args, **options):
        resident_ids = list(
            Stay.objects.filter(
                status="awaiting_payment"
            ).order_by().values_list(
                "resident_id",
                flat=True,
            ).distinct()
        )

        total = 0

        for resident_id in resident_ids:
            total += expire_payment_holds(resident_id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Expired {total} payment hold(s)."
            )
        )