from django.contrib.auth import get_user_model
from django.db import transaction

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from .models import MaintenanceRequest
from .serializers import (
    MaintenanceRequestSerializer,
    MaintenanceUpdateSerializer,
)


class MyMaintenanceListCreateView(generics.ListCreateAPIView):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status"]
    search_fields = ["title", "description"]
    ordering_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        return MaintenanceRequest.objects.filter(
            stay__resident=self.request.user
        ).select_related("stay__resident", "stay__room")

    def perform_create(self, serializer):
        with transaction.atomic():
            resident = get_user_model().objects.select_for_update().get(
                pk=self.request.user.pk
            )

            stay = Stay.objects.filter(
                resident=resident,
                status="checked_in",
            ).first()

            if stay is None:
                raise ValidationError(
                    {
                        "detail": (
                            "You must have a checked-in stay "
                            "to submit a maintenance request."
                        )
                    }
                )

            serializer.save(stay=stay)


class StaffMaintenanceListView(generics.ListAPIView):
    queryset = MaintenanceRequest.objects.select_related(
        "stay__resident",
        "stay__room",
    ).all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "stay__room"]
    search_fields = [
        "title",
        "description",
        "stay__room__room_number",
    ]
    ordering_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at", "-id"]


class StaffMaintenanceUpdateView(generics.UpdateAPIView):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceUpdateSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ["patch", "options"]
    filter_backends = []