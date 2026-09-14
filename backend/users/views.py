from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated


from .models import User
from .serializers import RegisterSerializer, UserSerializer

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
    