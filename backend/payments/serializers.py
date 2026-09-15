from rest_framework import serializers

from .models import Charge, Payment

import re


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
            "is_initial_rent",
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
            "is_initial_rent",
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


class MpesaInitiateSerializer(serializers.Serializer):
    charge = serializers.PrimaryKeyRelatedField(
        queryset=Charge.objects.none()
    )

    phone_number = serializers.CharField(max_length=20)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            self.fields["charge"].queryset = Charge.objects.filter(
                stay__resident=request.user
            )

    def validate_phone_number(self, value):
        phone = value.strip().replace(" ", "")

        if phone.startswith("+"):
            phone = phone[1:]

        if phone.startswith("0"):
            phone = "254" + phone[1:]

        if not re.fullmatch(r"254[17][0-9]{8}", phone):
            raise serializers.ValidationError(
                "Enter a Kenyan mobile number, "
                "for example 0712345678 or 254712345678."
            )

        return phone


class MpesaCallbackDetailsSerializer(serializers.Serializer):
    MerchantRequestID = serializers.CharField(max_length=100)
    CheckoutRequestID = serializers.CharField(max_length=100)
    ResultCode = serializers.IntegerField()
    ResultDesc = serializers.CharField(max_length=2000)

    CallbackMetadata = serializers.JSONField(required=False)


class MpesaCallbackBodySerializer(serializers.Serializer):
    stkCallback = MpesaCallbackDetailsSerializer()


class MpesaCallbackSerializer(serializers.Serializer):
    Body = MpesaCallbackBodySerializer()            