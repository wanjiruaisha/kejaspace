from django.urls import path

from .views import AdminRoomListCreateView, AdminRoomUpdateView


urlpatterns = [
    path(
        "rooms/",
        AdminRoomListCreateView.as_view(),
        name="admin_room_list_create",
    ),
    path(
        "rooms/<int:pk>/",
        AdminRoomUpdateView.as_view(),
        name="admin_room_update",
    ),
]