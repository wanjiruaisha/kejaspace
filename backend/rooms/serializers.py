from rest_framework import serializers

from .models import Room


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
            status__in=["reserved", "checked_in"]
        ).count()

        return max(obj.capacity - used_spaces, 0)