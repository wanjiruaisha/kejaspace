from rest_framework import serializers

from .models import Charge, Payment


class ChargeSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(
        source="stay.resident.username",
        read_only=True,
    )
    room_number = serializers.CharField(
        source="stay.room.room_number",
        read_only=True,
    )

    payment_summary = serializers.SerializerMethodField()

    class Meta:
        model = Charge
        fields = [
            "id",
            "stay",
            "resident_username",
            "room_number",
            "billing_month",
            "payment_summary",
            "amount",
            "due_date",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "resident_username",
            "room_number",
            "payment_summary",
            "created_by",
            "created_at",
        ]

    def validate_billing_month(self, value):
        if value.day != 1:
            raise serializers.ValidationError(
                "Use the first day of the billing month, for example 2026-09-01."
            )
        return value

    def validate(self, attrs):
        if attrs["due_date"] < attrs["billing_month"]:
            raise serializers.ValidationError(
                {
                    "due_date": (
                        "The due date cannot be before the billing month."
                    )
                }
            )
        return attrs

    def get_payment_summary(self, obj):
        amount_paid = obj.get_amount_paid()
        balance = obj.amount - amount_paid

        if balance <= 0:
            status = "paid"
        elif amount_paid > 0:
            status = "partially_paid"
        else:
            status = "unpaid"

        return {
            "amount_paid": format(amount_paid, ".2f"),
            "balance": format(balance, ".2f"),
            "status": status,
        }    


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "charge",
            "amount",
            "method",
            "reference",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = fields


class ManualPaymentSerializer(PaymentSerializer):
    method = serializers.ChoiceField(
        choices=["cash", "bank"]
    )

    class Meta(PaymentSerializer.Meta):
        read_only_fields = [
            "id",
            "recorded_by",
            "created_at",
        ]    