from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsSystemAdmin
from .models import Announcement
from .serializers import AnnouncementSerializer


class AnnouncementListView(generics.ListAPIView):
    queryset = Announcement.objects.filter(is_published=True)
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["title", "message"]
    ordering_fields = ["id", "created_at", "updated_at", "title"]
    ordering = ["-created_at", "-id"]


class AnnouncementDetailView(generics.RetrieveAPIView):
    queryset = Announcement.objects.filter(is_published=True)
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []


class AdminAnnouncementListCreateView(generics.ListCreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsSystemAdmin]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_published"]
    search_fields = ["title", "message"]
    ordering_fields = ["id", "created_at", "updated_at", "title"]
    ordering = ["-created_at", "-id"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminAnnouncementDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsSystemAdmin]
    http_method_names = ["get", "patch", "delete", "options"]
    filter_backends = []