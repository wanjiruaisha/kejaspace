from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import AccommodationApplication, Stay
from .serializers import ApplicationSerializer, StaySerializer

from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.models import Room
from django.utils import timezone


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AccommodationApplication.objects.filter(
            applicant=self.request.user
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(
                pk=self.request.user.pk
            )

            if Stay.objects.filter(
                resident=user,
                status__in=["reserved", "checked_in"],
            ).exists():
                raise ValidationError(
                    {"detail": "You already have an active stay."}
                )         

            if AccommodationApplication.objects.filter(
                applicant=user,
                status="pending",
            ).exists():
                raise ValidationError(
                    {"detail": "You already have a pending application."}
                )

            serializer.save(applicant=user)

class StaffApplicationListView(generics.ListAPIView):
    queryset = AccommodationApplication.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAdminUser]            


class CancelApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            application = get_object_or_404(
                AccommodationApplication.objects.select_for_update(),
                pk=pk,
                applicant=request.user,
            )

            if application.status != "pending":
                raise ValidationError(
                    {"detail": "Only pending applications can be cancelled."}
                )

            application.status = "cancelled"
            application.save(update_fields=["status"])

        return Response(ApplicationSerializer(application).data)


class RejectApplicationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        with transaction.atomic():
            application = get_object_or_404(
                AccommodationApplication.objects.select_for_update(),
                pk=pk,
            )

            if application.status != "pending":
                raise ValidationError(
                    {"detail": "Only pending applications can be rejected."}
                )

            application.status = "rejected"
            application.save(update_fields=["status"])

        return Response(ApplicationSerializer(application).data)    

class ApproveApplicationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        original = get_object_or_404(
            AccommodationApplication,
            pk=pk,
        )

        with transaction.atomic():
            resident = get_user_model().objects.select_for_update().get(
                pk=original.applicant_id
            )

            application = get_object_or_404(
                AccommodationApplication.objects.select_for_update(),
                pk=pk,
            )

            if application.status != "pending":
                raise ValidationError(
                    {"detail": "Only pending applications can be approved."}
                )

            if application.move_in_date < timezone.localdate():
                raise ValidationError(
                    {"detail": "The requested move-in date has passed."}
                )

            room = Room.objects.select_for_update().get(
                pk=application.room_id
            )

            if not room.is_active:
                raise ValidationError(
                    {"detail": "This room is not open for allocation."}
                )

            active_statuses = ["reserved", "checked_in"]

            if Stay.objects.filter(
                resident=resident,
                status__in=active_statuses,
            ).exists():
                raise ValidationError(
                    {"detail": "This resident already has an active stay."}
                )

            used_spaces = Stay.objects.filter(
                room=room,
                status__in=active_statuses,
            ).count()

            if used_spaces >= room.capacity:
                raise ValidationError(
                    {"detail": "This room has no available spaces."}
                )

            stay = Stay.objects.create(
                application=application,
                resident=resident,
                room=room,
            )

            application.status = "approved"
            application.save(update_fields=["status"])

        return Response(StaySerializer(stay).data, status=201)    


class MyStayListView(generics.ListAPIView):
    serializer_class = StaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Stay.objects.filter(resident=self.request.user)

class StaffStayListView(generics.ListAPIView):
    queryset = Stay.objects.all()
    serializer_class = StaySerializer
    permission_classes = [IsAdminUser]        

class StaffStayActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk, action):
        transitions = {
            "check-in": ("reserved", "checked_in", "check_in_at"),
            "check-out": ("checked_in", "checked_out", "check_out_at"),
            "cancel": ("reserved", "cancelled", None),
        }

        expected_status, new_status, timestamp_field = transitions[action]

        original = get_object_or_404(Stay, pk=pk)

        with transaction.atomic():
            get_user_model().objects.select_for_update().get(
                pk=original.resident_id
            )

            Room.objects.select_for_update().get(
                pk=original.room_id
            )

            stay = get_object_or_404(
                Stay.objects.select_for_update(),
                pk=pk,
            )

            if stay.status != expected_status:
                raise ValidationError(
                    {
                        "detail": (
                            f"Cannot {action} a stay with status "
                            f"'{stay.status}'. Expected '{expected_status}'."
                        )
                    }
                )

            stay.status = new_status
            updated_fields = ["status"]

            if timestamp_field is not None:
                setattr(stay, timestamp_field, timezone.now())
                updated_fields.append(timestamp_field)

            stay.save(update_fields=updated_fields)

        return Response(StaySerializer(stay).data)    