from django.urls import path

from .views import (
    AnnouncementListView,
    AnnouncementDetailView,
    AdminAnnouncementListCreateView,
    AdminAnnouncementDetailView,
)


urlpatterns = [
    path(
        "announcements/",
        AnnouncementListView.as_view(),
        name="announcement_list",
    ),
    path(
        "announcements/<int:pk>/",
        AnnouncementDetailView.as_view(),
        name="announcement_detail",
    ),
    path(
        "admin/announcements/",
        AdminAnnouncementListCreateView.as_view(),
        name="admin_announcement_list_create",
    ),
    path(
        "admin/announcements/<int:pk>/",
        AdminAnnouncementDetailView.as_view(),
        name="admin_announcement_detail",
    ),
]