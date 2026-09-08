from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Room
from .serializers import RoomSerializer


class RoomListView(generics.ListAPIView):
    queryset = Room.objects.filter(is_active=True).order_by("room_number")
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]


class RoomDetailView(generics.RetrieveAPIView):
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]