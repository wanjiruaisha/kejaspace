from django.urls import path

from .views import (
    MyMaintenanceListCreateView,
    StaffMaintenanceListView,
    StaffMaintenanceUpdateView,
)


urlpatterns = [
    path(
        "maintenance/",
        MyMaintenanceListCreateView.as_view(),
        name="my_maintenance",
    ),
    path(
        "staff/maintenance/",
        StaffMaintenanceListView.as_view(),
        name="staff_maintenance_list",
    ),
    path(
        "staff/maintenance/<int:pk>/",
        StaffMaintenanceUpdateView.as_view(),
        name="staff_maintenance_update",
    ),
]