from django.urls import path

from .views import (MyChargeListView, StaffChargeListCreateView,
MyPaymentListView,
StaffPaymentListView,                    
RecordManualPaymentView,)



urlpatterns = [
    path(
        "charges/",
        MyChargeListView.as_view(),
        name="my_charge_list",
    ),
    path(
        "staff/charges/",
        StaffChargeListCreateView.as_view(),
        name="staff_charge_list_create",
    ),
        path(
        "payments/",
        MyPaymentListView.as_view(),
        name="my_payment_list",
    ),
    path(
        "staff/payments/",
        StaffPaymentListView.as_view(),
        name="staff_payment_list",
    ),
    path(
        "staff/payments/record/",
        RecordManualPaymentView.as_view(),
        name="record_manual_payment",
    ),
]