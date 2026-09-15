from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated


from .models import User
from .serializers import RegisterSerializer, UserSerializer, AdminUserSerializer

from .permissions import IsSystemAdmin


from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LogoutSerializer




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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(
                serializer.validated_data["refresh"]
            )

            token_user_id = token.get(
                api_settings.USER_ID_CLAIM
            )
            current_user_id = getattr(
                request.user,
                api_settings.USER_ID_FIELD,
            )

            if str(token_user_id) != str(current_user_id):
                raise ValidationError(
                    {
                        "refresh": (
                            "This refresh token does not belong to you."
                        )
                    }
                )

            token.blacklist()

        except TokenError:
            raise ValidationError(
                {
                    "refresh": (
                        "This refresh token is invalid, expired, "
                        "or already blacklisted."
                    )
                }
            )

        return Response(status=204)    