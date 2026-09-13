from django.urls import path

from .views import (
    ApplicationListCreateView,
    StaffApplicationListView,
    CancelApplicationView,
    RejectApplicationView,
    ApproveApplicationView,
    MyStayListView,
    StaffStayListView,
    StaffStayActionView,
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
        path(
        "staff/stays/",
        StaffStayListView.as_view(),
        name="staff_stay_list",
    ),
    path(
        "staff/stays/<int:pk>/check-in/",
        StaffStayActionView.as_view(),
        {"action": "check-in"},
        name="stay_check_in",
    ),
    path(
        "staff/stays/<int:pk>/check-out/",
        StaffStayActionView.as_view(),
        {"action": "check-out"},
        name="stay_check_out",
    ),
    path(
        "staff/stays/<int:pk>/cancel/",
        StaffStayActionView.as_view(),
        {"action": "cancel"},
        name="stay_cancel",
    ),

]