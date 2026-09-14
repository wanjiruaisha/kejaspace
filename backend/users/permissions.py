from rest_framework.permissions import BasePermission


class IsSystemAdmin(BasePermission):
    message = "Only the system administrator can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.is_active
            and request.user.is_superuser
        )