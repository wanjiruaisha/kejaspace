from django.urls import path

from .views import AdminUserListView, AdminUserAccessView


urlpatterns = [
    path(
        "users/",
        AdminUserListView.as_view(),
        name="admin_user_list",
    ),
    path(
        "users/<int:pk>/access/",
        AdminUserAccessView.as_view(),
        name="admin_user_access",
    ),
]