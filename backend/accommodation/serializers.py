from django.utils import timezone
from rest_framework import serializers

from rooms.models import Room
from .models import AccommodationApplication, Stay


class ApplicationSerializer(serializers.ModelSerializer):
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.filter(is_active=True)
    )
    room_number = serializers.CharField(
    source="room.room_number",
    read_only=True,
    )

    class Meta:
        model = AccommodationApplication
        fields = [
            "id",
            "applicant",
            "room",
            "room_number",
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

class StaySerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(
        source="room.room_number",
        read_only=True,
    )

    class Meta:
        model = Stay
        fields = [
            "id",
            "application",
            "resident",
            "room",
            "room_number",
            "status",
            "payment_deadline",
            "check_in_at",
            "check_out_at",
            "created_at",
        ]
        read_only_fields = fields