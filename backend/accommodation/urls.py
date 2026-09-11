from django.urls import path

from .views import (
    ApplicationListCreateView,
    StaffApplicationListView,
    CancelApplicationView,
    RejectApplicationView,
    ApproveApplicationView,
    MyStayListView,
)

urlpatterns = [
    path(
        "applications/",
        ApplicationListCreateView.as_view(),
        name="application_list_create",
    ),
     path(
        "applications/<int:pk>/cancel/",
        CancelApplicationView.as_view(),
        name="application_cancel",
    ),
    path(
        "staff/applications/",
        StaffApplicationListView.as_view(),
        name="staff_application_list",
    ),
     path(
        "staff/applications/<int:pk>/reject/",
        RejectApplicationView.as_view(),
        name="application_reject",
    ),
        path(
        "staff/applications/<int:pk>/approve/",
        ApproveApplicationView.as_view(),
        name="application_approve",
    ),
    path(
        "stays/",
        MyStayListView.as_view(),
        name="my_stays",
    ),

]