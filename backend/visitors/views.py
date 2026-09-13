from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from .models import Visitor
from .serializers import VisitorSerializer


class VisitorListCreateView(generics.ListCreateAPIView):
    serializer_class = VisitorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Visitor.objects.filter(
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
                            "to register a visitor."
                        )
                    }
                )

            serializer.save(stay=stay)


class StaffVisitorListView(generics.ListAPIView):
    queryset = Visitor.objects.select_related(
        "stay__resident",
        "stay__room",
    ).all()
    serializer_class = VisitorSerializer
    permission_classes = [IsAdminUser]