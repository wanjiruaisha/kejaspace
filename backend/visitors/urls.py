from django.urls import path

from .views import VisitorListCreateView, StaffVisitorListView


urlpatterns = [
    path(
        "visitors/",
        VisitorListCreateView.as_view(),
        name="visitor_list_create",
    ),
    path(
        "staff/visitors/",
        StaffVisitorListView.as_view(),
        name="staff_visitor_list",
    ),
]