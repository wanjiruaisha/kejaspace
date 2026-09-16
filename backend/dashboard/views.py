from decimal import Decimal
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend

from django.db.models import Count, Q, Sum
from django.utils import timezone

from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationApplication, Stay
from maintenance.models import MaintenanceRequest
from payments.models import Payment, MpesaPaymentAttempt
from rooms.models import Room
from rest_framework import generics, serializers, filters

class StaffDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()

        active_rooms = Room.objects.filter(
            is_active=True
        ).annotate(
            allocated_spaces=Count(
                "stays",
                filter=(
                    Q(stays__status__in=["reserved", "checked_in"])
                    | Q(
                        stays__status="awaiting_payment",
                        stays__payment_deadline__gt=now,
                    )
                ),
            )
        )

        total_capacity = 0
        available_spaces = 0
        active_room_count = 0

        for room in active_rooms:
            active_room_count += 1
            total_capacity += room.capacity
            available_spaces += max(
                room.capacity - room.allocated_spaces,
                0,
            )

        recorded_payments = Payment.objects.aggregate(
            total=Sum("amount")
        )["total"]

        if recorded_payments is None:
            recorded_payments = Decimal("0.00")

        return Response(
            {
                "rooms": {
                    "total": Room.objects.count(),
                    "active": active_room_count,
                    "active_room_capacity": total_capacity,
                    "available_spaces": available_spaces,
                },
                "stays": {
                    "checked_in": Stay.objects.filter(
                        status="checked_in"
                    ).count(),
                    "reserved": Stay.objects.filter(
                        status="reserved"
                    ).count(),
                    "unexpired_payment_holds": Stay.objects.filter(
                        status="awaiting_payment",
                        payment_deadline__gt=now,
                    ).count(),
                },
                "applications": {
                    "pending": AccommodationApplication.objects.filter(
                        status="pending"
                    ).count(),
                },
                "maintenance": {
                    "unresolved": MaintenanceRequest.objects.filter(
                        status__in=["pending", "in_progress"]
                    ).count(),
                },
                "payments": {
                    "currency": "KES",
                    "recorded_total_all_time": format(
                        recorded_payments,
                        ".2f",
                    ),
                    "mpesa_attempts_needing_review": (
                        MpesaPaymentAttempt.objects.filter(
                            status="review"
                        ).count()
                    ),
                },
            }
        )



class OccupancyReportSerializer(serializers.ModelSerializer):
    checked_in = serializers.IntegerField(read_only=True)
    reserved = serializers.IntegerField(read_only=True)
    payment_holds = serializers.IntegerField(read_only=True)
    available_spaces = serializers.SerializerMethodField()
    residents = serializers.SerializerMethodField()



    class Meta:
        model = Room
        fields = [
            "id",
            "room_number",
            "is_active",
            "capacity",
            "checked_in",
            "reserved",
            "payment_holds",
            "available_spaces",
            "residents",

        ]
        

    def get_available_spaces(self, obj):
        if not obj.is_active:
            return 0

        allocated = (
            obj.checked_in
            + obj.reserved
            + obj.payment_holds
        )

        return max(obj.capacity - allocated, 0)

    def get_residents(self, obj):
        return [
            {
                "resident_id": stay.resident_id,
                "name": (
                    stay.resident.get_full_name().strip()
                    or stay.resident.username
                ),
                "stay_status": stay.status,
            }
            for stay in obj.report_stays
        ]    


class OccupancyReportView(generics.ListAPIView):
    serializer_class = OccupancyReportSerializer
    permission_classes = [IsAdminUser]

    filterset_fields = ["is_active", "capacity"]
    search_fields = ["room_number"]
    ordering_fields = ["room_number", "capacity"]
    ordering = ["room_number", "id"]

    def get_queryset(self):
        now = timezone.now()

        relevant_stays = Stay.objects.filter(
            Q(status__in=["reserved", "checked_in"])
            | Q(
                status="awaiting_payment",
                payment_deadline__gt=now,
            )
        ).select_related("resident").order_by("id")

        return Room.objects.annotate(
            checked_in=Count(
                "stays",
                filter=Q(stays__status="checked_in"),
            ),
            reserved=Count(
                "stays",
                filter=Q(stays__status="reserved"),
            ),
            payment_holds=Count(
                "stays",
                filter=Q(
                    stays__status="awaiting_payment",
                    stays__payment_deadline__gt=now,
                ),
            ),
        ).prefetch_related(
            Prefetch(
                "stays",
                queryset=relevant_stays,
                to_attr="report_stays",
            )
        )    


class PaymentReportSerializer(serializers.ModelSerializer):
    resident_name = serializers.SerializerMethodField()

    room_number = serializers.CharField(
        source="charge.stay.room.room_number",
        read_only=True,
    )

    billing_month = serializers.DateField(
        source="charge.billing_month",
        read_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "charge",
            "resident_name",
            "room_number",
            "billing_month",
            "amount",
            "method",
            "reference",
            "created_at",
        ]
        read_only_fields = fields

    def get_resident_name(self, obj):
        resident = obj.charge.stay.resident

        return (
            resident.get_full_name().strip()
            or resident.username
        )


class PaymentReportDateSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")

        if start and end and start > end:
            raise serializers.ValidationError(
                {
                    "end_date": (
                        "End date must be on or after start date."
                    )
                }
            )

        return attrs


class PaymentReportView(generics.ListAPIView):
    serializer_class = PaymentReportSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = ["method", "charge"]

    search_fields = [
        "reference",
        "charge__stay__resident__username",
        "charge__stay__resident__first_name",
        "charge__stay__resident__last_name",
        "charge__stay__room__room_number",
    ]

    ordering_fields = ["id", "amount", "created_at"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        date_serializer = PaymentReportDateSerializer(
            data=self.request.query_params
        )
        date_serializer.is_valid(raise_exception=True)

        dates = date_serializer.validated_data

        queryset = Payment.objects.select_related(
            "charge__stay__resident",
            "charge__stay__room",
        )

        start = dates.get("start_date")
        end = dates.get("end_date")

        if start:
            queryset = queryset.filter(
                created_at__date__gte=start
            )

        if end:
            queryset = queryset.filter(
                created_at__date__lte=end
            )

        return queryset    