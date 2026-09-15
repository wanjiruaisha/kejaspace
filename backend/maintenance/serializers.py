from rest_framework import serializers

from .models import MaintenanceRequest


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(
        source="stay.resident.username",
        read_only=True,
    )
    room_number = serializers.CharField(
        source="stay.room.room_number",
        read_only=True,
    )

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "title",
            "description",
            "status",
            "staff_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "status",
            "staff_note",
            "created_at",
            "updated_at",
        ]


class MaintenanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = ["id", "status", "staff_note", "updated_at"]
        read_only_fields = ["id", "updated_at"]