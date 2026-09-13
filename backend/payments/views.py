from django.db import transaction
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from .models import Charge
from .serializers import ChargeSerializer


class MyChargeListView(generics.ListAPIView):
    serializer_class = ChargeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Charge.objects.filter(
            stay__resident=self.request.user
        ).select_related("stay__resident", "stay__room")


class StaffChargeListCreateView(generics.ListCreateAPIView):
    queryset = Charge.objects.select_related(
        "stay__resident",
        "stay__room",
    ).all()
    serializer_class = ChargeSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        with transaction.atomic():
            stay = Stay.objects.select_for_update().get(
                pk=serializer.validated_data["stay"].pk
            )

            if stay.status not in ["reserved", "checked_in"]:
                raise ValidationError(
                    {
                        "stay": (
                            "New rent charges require a reserved "
                            "or checked-in stay."
                        )
                    }
                )

            billing_month = serializer.validated_data["billing_month"]

            if Charge.objects.filter(
                stay=stay,
                billing_month=billing_month,
            ).exists():
                raise ValidationError(
                    {
                        "detail": (
                            "This stay already has a rent charge "
                            "for that month."
                        )
                    }
                )

            serializer.save(
                stay=stay,
                created_by=self.request.user,
            )