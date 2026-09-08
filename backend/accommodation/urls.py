from django.urls import path

from .views import ApplicationListCreateView


urlpatterns = [
    path(
        "applications/",
        ApplicationListCreateView.as_view(),
        name="application_list_create",
    ),
]