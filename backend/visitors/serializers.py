from django.utils import timezone
from rest_framework import serializers

from .models import Visitor


class VisitorSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(
        source="stay.resident.username",
        read_only=True,
    )
    room_number = serializers.CharField(
        source="stay.room.room_number",
        read_only=True,
    )

    class Meta:
        model = Visitor
        fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "full_name",
            "phone_number",
            "visit_date",
            "purpose",
            "status",
            "check_in_at",
            "check_out_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "status",
            "check_in_at",
            "check_out_at",
            "created_at",
        ]

    def validate_visit_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "The visit date cannot be in the past."
            )
        return value