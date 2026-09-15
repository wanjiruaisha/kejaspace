import requests
from django.conf import settings

import base64
from datetime import datetime
from zoneinfo import ZoneInfo


def get_mpesa_access_token():
    if settings.MPESA_ENVIRONMENT != "sandbox":
        raise ValueError("Only the sandbox environment is configured.")

    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    if not consumer_key or not consumer_secret:
        raise ValueError("M-Pesa credentials are missing from .env.")

    response = requests.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(consumer_key, consumer_secret),
        timeout=20,
    )

    response.raise_for_status()

    data = response.json()
    access_token = data.get("access_token")

    if not access_token:
        raise ValueError("Safaricom did not return an access token.")

    return access_token


def send_stk_push(*, access_token, phone_number, amount, charge_id):
    if settings.MPESA_ENVIRONMENT != "sandbox":
        raise ValueError("Only sandbox payments are configured.")

    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY
    callback_url = settings.MPESA_CALLBACK_URL

    if not shortcode or not passkey or not callback_url:
        raise ValueError("M-Pesa payment settings are incomplete.")

    if not callback_url.startswith("https://"):
        raise ValueError("The callback URL must use HTTPS.")

    if amount <= 0 or amount != amount.to_integral_value():
        raise ValueError(
            "This integration requires a positive whole-shilling amount."
        )

    timestamp = datetime.now(
        ZoneInfo("Africa/Nairobi")
    ).strftime("%Y%m%d%H%M%S")

    password = base64.b64encode(
        f"{shortcode}{passkey}{timestamp}".encode("utf-8")
    ).decode("utf-8")

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": f"Rent{charge_id}"[:12],
        "TransactionDesc": "Hostel rent",
    }

    response = requests.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
        json=payload,
        timeout=20,
    )

    response.raise_for_status()

    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Unexpected response from Safaricom.")

    return data