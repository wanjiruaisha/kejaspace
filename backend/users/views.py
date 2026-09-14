from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated


from .models import User
from .serializers import RegisterSerializer, UserSerializer, AdminUserSerializer

from .permissions import IsSystemAdmin


from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "registration"

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user    


class LoginView(TokenObtainPairView):
    throttle_scope = "login_attempts"


class RefreshView(TokenRefreshView):
    throttle_scope = "token_refresh"


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.filter(is_superuser=False)
    serializer_class = AdminUserSerializer
    permission_classes = [IsSystemAdmin]

    filterset_fields = ["is_staff", "is_active"]
    search_fields = ["username", "email"]
    ordering_fields = ["id", "username"]
    ordering = ["id"]


class AdminUserAccessView(generics.UpdateAPIView):
    queryset = User.objects.filter(is_superuser=False)
    serializer_class = AdminUserSerializer
    permission_classes = [IsSystemAdmin]
    http_method_names = ["patch", "options"]
    filter_backends = []