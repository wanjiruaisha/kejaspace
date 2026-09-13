from django.urls import path

from .views import (
    VisitorListCreateView,
    StaffVisitorListView,
    StaffVisitorActionView,
    CancelVisitorView,
)


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
    path(
        "staff/visitors/<int:pk>/check-in/",
        StaffVisitorActionView.as_view(),
        {"action": "check-in"},
        name="visitor_check_in",
    ),
    path(
        "staff/visitors/<int:pk>/check-out/",
        StaffVisitorActionView.as_view(),
        {"action": "check-out"},
        name="visitor_check_out",
    ),
    path(
        "visitors/<int:pk>/cancel/",
        CancelVisitorView.as_view(),
        name="visitor_cancel",
    ),
]