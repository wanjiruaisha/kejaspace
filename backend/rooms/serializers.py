from rest_framework import serializers

from .models import Room
from django.db.models import Q
from django.utils import timezone


class RoomSerializer(serializers.ModelSerializer):
    available_spaces = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "room_number",
            "capacity",
            "monthly_price",
            "description",
            "is_active",
            "available_spaces",
        ]

    def get_available_spaces(self, obj):
        used_spaces = obj.stays.filter(
            Q(status__in=["reserved", "checked_in"])
            | Q(
                status="awaiting_payment",
                payment_deadline__gt=timezone.now(),
            )
        ).count()

        return max(obj.capacity - used_spaces, 0)    

class AdminRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "room_number",
            "capacity",
            "monthly_price",
            "description",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_capacity(self, value):
        if self.instance is not None:
            if value != self.instance.capacity:
                raise serializers.ValidationError(
                    "Room capacity cannot be changed after creation."
                )
        return value    