from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from accommodation.models import Stay
from .models import Visitor
from .serializers import VisitorSerializer

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters
from rest_framework.generics import ListCreateAPIView



class VisitorListCreateView(generics.ListCreateAPIView):
    serializer_class = VisitorSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["status", "visit_date", "stay"]
    search_fields = ["full_name", "stay__room__room_number"]
    ordering_fields = ["id", "full_name", "visit_date", "created_at"]
    ordering = ["-created_at", "-id"]    

    filterset_fields = ["status", "visit_date", "stay"]
    search_fields = ["full_name", "stay__room__room_number"]
    ordering_fields = ["id", "full_name", "visit_date", "created_at"]
    ordering = ["-created_at", "-id"]


    def get_queryset(self):
        return Visitor.objects.filter(
            stay__resident=self.request.user
        ).select_related("stay__resident", "stay__room")

    def perform_create(self, serializer):
        with transaction.atomic():
            resident = get_user_model().objects.select_for_update().get(
                pk=self.request.user.pk
            )

            stay = Stay.objects.filter(
                resident=resident,
                status="checked_in",
            ).first()

            if stay is None:
                raise ValidationError(
                    {
                        "detail": (
                            "You must have a checked-in stay "
                            "to register a visitor."
                        )
                    }
                )

            serializer.save(stay=stay)


class StaffVisitorListView(generics.ListAPIView):
    queryset = Visitor.objects.select_related(
        "stay__resident",
        "stay__room",
    ).all()
    serializer_class = VisitorSerializer
    permission_classes = [IsAdminUser]

    filterset_fields = ["status", "visit_date", "stay"]
    search_fields = ["full_name", "stay__room__room_number"]
    ordering_fields = ["id", "full_name", "visit_date", "created_at"]
    ordering = ["-created_at", "-id"]



    filterset_fields = ["status", "visit_date", "stay"]
    search_fields = ["full_name", "stay__room__room_number"]
    ordering_fields = ["id", "full_name", "visit_date", "created_at"]
    ordering = ["-created_at", "-id"]


class StaffVisitorActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk, action):
        transitions = {
            "check-in": ("expected", "checked_in", "check_in_at"),
            "check-out": ("checked_in", "checked_out", "check_out_at"),
        }

        expected_status, new_status, timestamp_field = transitions[action]

        original = get_object_or_404(
            Visitor.objects.select_related("stay"),
            pk=pk,
        )

        with transaction.atomic():
            get_user_model().objects.select_for_update().get(
                pk=original.stay.resident_id
            )

            visitor = get_object_or_404(
                Visitor.objects.select_for_update(),
                pk=pk,
            )

            if visitor.status != expected_status:
                raise ValidationError(
                    {
                        "detail": (
                            f"Cannot {action} a visitor with status "
                            f"'{visitor.status}'. "
                            f"Expected '{expected_status}'."
                        )
                    }
                )

            if action == "check-in":
                if visitor.stay.status != "checked_in":
                    raise ValidationError(
                        {
                            "detail": (
                                "The host resident must still be checked in."
                            )
                        }
                    )

                if visitor.visit_date != timezone.localdate():
                    raise ValidationError(
                        {
                            "detail": (
                                "Visitors can only check in "
                                "on their scheduled visit date."
                            )
                        }
                    )

            visitor.status = new_status
            setattr(visitor, timestamp_field, timezone.now())

            visitor.save(
                update_fields=["status", timestamp_field]
            )

        return Response(VisitorSerializer(visitor).data)   

class CancelVisitorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            queryset = Visitor.objects.all()

            if not request.user.is_staff:
                queryset = queryset.filter(
                    stay__resident=request.user
                )

            visitor = get_object_or_404(
                queryset.select_for_update(of=("self",)),
                pk=pk,
            )

            if visitor.status != "expected":
                raise ValidationError(
                    {
                        "detail": (
                            "Only expected visitors can be cancelled."
                        )
                    }
                )

            visitor.status = "cancelled"
            visitor.save(update_fields=["status"])

        return Response(VisitorSerializer(visitor).data)     