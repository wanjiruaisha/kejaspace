from django.db import transaction, IntegrityError
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from .models import Charge

from .models import Charge, Payment
from .serializers import (
    ChargeSerializer,
    PaymentSerializer,
    ManualPaymentSerializer,
)
from rest_framework import filters
from rest_framework.generics import ListCreateAPIView


class MyChargeListView(generics.ListAPIView):
    serializer_class = ChargeSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["stay", "billing_month", "due_date"]
    search_fields = ["stay__room__room_number"]
    ordering_fields = [
        "id",
        "amount",
        "billing_month",
        "due_date",
        "created_at",
    ]
    ordering = ["-billing_month", "-id"]    

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

    filterset_fields = ["stay", "billing_month", "due_date"]
    search_fields = ["stay__room__room_number"]
    ordering_fields = [
        "id",
        "amount",
        "billing_month",
        "due_date",
        "created_at",
    ]
    ordering = ["-billing_month", "-id"]


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


class MyPaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["charge", "method"]
    search_fields = ["reference"]
    ordering_fields = ["id", "amount", "created_at"]
    ordering = ["-created_at", "-id"]


    def get_queryset(self):
        return Payment.objects.filter(
            charge__stay__resident=self.request.user
        )


class StaffPaymentListView(generics.ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminUser]


    filterset_fields = ["charge", "method"]
    search_fields = ["reference"]
    ordering_fields = ["id", "amount", "created_at"]
    ordering = ["-created_at", "-id"]    


class RecordManualPaymentView(generics.CreateAPIView):
    serializer_class = ManualPaymentSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        reference = serializer.validated_data["reference"]

        try:
            with transaction.atomic():
                charge = Charge.objects.select_for_update().get(
                    pk=serializer.validated_data["charge"].pk
                )

                amount_paid = charge.get_amount_paid()
                balance = charge.amount - amount_paid
                amount = serializer.validated_data["amount"]

                if amount > balance:
                    raise ValidationError(
                        {
                            "amount": (
                                f"Payment cannot exceed the remaining "
                                f"balance of KES {balance:.2f}."
                            )
                        }
                    )

                serializer.save(
                    charge=charge,
                    recorded_by=self.request.user,
                )

        except IntegrityError:
            if Payment.objects.filter(reference=reference).exists():
                raise ValidationError(
                    {
                        "reference": (
                            "A payment with this reference already exists."
                        )
                    }
                )
            raise            