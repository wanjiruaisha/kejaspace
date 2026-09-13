from rest_framework import serializers

from .models import Charge


class ChargeSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(
        source="stay.resident.username",
        read_only=True,
    )
    room_number = serializers.CharField(
        source="stay.room.room_number",
        read_only=True,
    )

    class Meta:
        model = Charge
        fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "billing_month",
            "amount",
            "due_date",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "resident_username",
            "room_number",
            "created_by",
            "created_at",
        ]

    def validate_billing_month(self, value):
        if value.day != 1:
            raise serializers.ValidationError(
                "Use the first day of the billing month, for example 2026-09-01."
            )
        return value

    def validate(self, attrs):
        if attrs["due_date"] < attrs["billing_month"]:
            raise serializers.ValidationError(
                {
                    "due_date": (
                        "The due date cannot be before the billing month."
                    )
                }
            )
        return attrs