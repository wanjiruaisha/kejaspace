from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Stay


def expire_payment_holds(resident_id):
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(
            pk=resident_id
        )

        return Stay.objects.filter(
            resident_id=resident_id,
            status="awaiting_payment",
        ).filter(
            Q(payment_deadline__lte=timezone.now())
            | Q(payment_deadline__isnull=True)
        ).update(status="expired")