from django.utils import timezone
from rest_framework import serializers

from rooms.models import Room
from .models import AccommodationApplication


class ApplicationSerializer(serializers.ModelSerializer):
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.filter(is_active=True)
    )

    class Meta:
        model = AccommodationApplication
        fields = [
            "id",
            "applicant",
            "room",
            "move_in_date",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "applicant",
            "status",
            "created_at",
        ]

    def validate_move_in_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "Move-in date cannot be in the past."
            )
        return value