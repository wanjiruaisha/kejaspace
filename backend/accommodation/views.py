from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import AccommodationApplication
from .serializers import ApplicationSerializer


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AccommodationApplication.objects.filter(
            applicant=self.request.user
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(
                pk=self.request.user.pk
            )

            if AccommodationApplication.objects.filter(
                applicant=user,
                status="pending",
            ).exists():
                raise ValidationError(
                    {"detail": "You already have a pending application."}
                )

            serializer.save(applicant=user)