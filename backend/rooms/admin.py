from django.contrib import admin

from .models import Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "capacity", "monthly_price", "is_active")
    search_fields = ("room_number",)
    list_filter = ("is_active",)
