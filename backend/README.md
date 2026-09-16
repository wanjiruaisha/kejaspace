# KejaSpace

KejaSpace is a hostel management project built with Django REST Framework. It helps hostel staff manage rooms, accommodation applications, residents, visitors, rent payments and maintenance requests.

A React frontend is planned. The backend can currently be tested using Postman.

## The problem

Hostel information can become scattered across paper records, messages and spreadsheets. This makes it difficult to track available spaces, resident stays, payments and maintenance issues.

KejaSpace brings these activities into one system with separate permissions for residents, staff and administrators.

## Technologies

- Python and Django
- Django REST Framework
- PostgreSQL
- Simple JWT
- django-filter
- Safaricom Daraja sandbox
- Postman
- Gunicorn and WhiteNoise for deployment

## User roles

| Role | Main responsibilities |
|------|-----------------------|
| Resident | Browse rooms, apply for accommodation, view their stays and charges, initiate and verify their own M-Pesa requests, register visitors and submit maintenance requests. |
| Staff | Review applications, manage check-in and check-out, manage visitors, record manual payments, update maintenance requests and access reports. |
| Administrator | Perform staff functions, manage rooms, manage staff access and publish announcements. |

Staff endpoints use Django's `is_staff` flag. Administrator-only endpoints use the project's `IsSystemAdmin` permission.

## Features

- Registration, login, token refresh and logout
- Room management and availability
- Accommodation applications
- Temporary payment holds and confirmed reservations
- Resident check-in and check-out
- Visitor management
- Rent charges and manual cash/bank payments
- M-Pesa sandbox integration
- Maintenance requests
- Announcements
- Staff dashboard
- Occupancy reports with resident names
- Payment reports with date filtering
- Filtering, searching, ordering, pagination and throttling

## Accommodation workflow

1. A resident applies for an active room.
2. Staff approves the application if allocation checks pass.
3. The system creates a temporary payment hold and an initial rent charge.
4. Full payment of the initial rent confirms an eligible reservation.
5. Staff checks the resident in.
6. Staff checks the resident out when their stay ends.

Unexpired payment holds, confirmed reservations and checked-in stays reduce available spaces. Expired payment holds do not.

## M-Pesa integration status

M-Pesa is configured for sandbox testing, not live rent collection.

The current flow is:

1. The resident initiates an STK request.
2. Safaricom sends a callback, which the backend saves.
3. The resident calls the verification endpoint.
4. The backend queries Safaricom and applies an eligible successful result.

A callback alone does not mark rent as paid. Verification currently applies the result; automatic background processing is not configured.

Sandbox initiation and unsuccessful outcomes have been observed. A successful end-to-end Daraja sandbox transaction has not yet been demonstrated.

Five automated tests pass using mocked Safaricom query responses. They cover:

- Successful payment recording and reservation confirmation
- Duplicate-payment prevention
- Cancelled payments
- Successful payment after hold expiry
- Access restrictions for another resident

These tests validate backend behaviour, not live M-Pesa processing.

Staff can view attempts marked for review. Refunds and a staff workflow for resolving those attempts are not implemented.

## Local setup

### 1. Create and activate a virtual environment

From the backend directory:

```bash
python -m venv env
```

Windows PowerShell:

```powershell
.\env\Scripts\Activate.ps1
```

Windows Git Bash:

```bash
source env/Scripts/activate
```

### 2. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 3. Configure environment variables

Create `backend/.env`:

```env
SECRET_KEY=replace_with_a_private_django_secret
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=kejaspace_db
DB_USER=your_postgresql_user
DB_PASSWORD=your_postgresql_password
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=prefer

CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=

MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
```

Create the PostgreSQL database before running migrations.

For M-Pesa testing, supply valid Daraja sandbox credentials and a public HTTPS callback URL. Add the public hostname to `ALLOWED_HOSTS`.

Do not commit `.env`, passwords or tokens to Git.

### 4. Apply migrations and create an administrator

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Run the backend

```bash
python manage.py runserver
```

Local API base URL:

```text
http://127.0.0.1:8000
```

Django admin:

```text
http://127.0.0.1:8000/admin/
```

## Main API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register/` | Register a resident |
| POST | `/api/auth/login/` | Obtain JWT tokens |
| POST | `/api/auth/refresh/` | Refresh an access token |
| POST | `/api/auth/logout/` | Blacklist the supplied refresh token |
| GET | `/api/auth/me/` | View the logged-in user |
| GET | `/api/rooms/` | Browse active rooms |
| GET, POST | `/api/applications/` | View own applications or apply |
| POST | `/api/staff/applications/<id>/approve/` | Approve an application |
| GET | `/api/stays/` | View own stays |
| POST | `/api/staff/stays/<id>/check-in/` | Check in a resident |
| POST | `/api/staff/stays/<id>/check-out/` | Check out a resident |
| GET, POST | `/api/visitors/` | View or register own visitors |
| GET | `/api/charges/` | View own rent charges |
| GET | `/api/payments/` | View own recorded payments |
| POST | `/api/staff/payments/record/` | Record a manual payment |
| POST | `/api/payments/mpesa/initiate/` | Initiate an STK request |
| POST | `/api/payments/mpesa/callback/` | Receive a callback |
| POST | `/api/payments/mpesa/attempts/<id>/verify/` | Verify and apply the result |
| GET | `/api/staff/payments/mpesa/attempts/` | Inspect payment attempts |
| GET, POST | `/api/maintenance/` | View or submit maintenance requests |
| GET | `/api/announcements/` | View published announcements |
| GET | `/api/staff/dashboard/` | View summary figures |
| GET | `/api/staff/reports/occupancy/` | View current room occupancy |
| GET | `/api/staff/reports/payments/` | View recorded payment reports |

This table highlights the main routes. The Django URL configuration defines the complete route list.

## Postman usage

Set these collection variables:

- `base_url`: `http://127.0.0.1:8000`
- `access_token`
- `refresh_token`

Use Bearer authentication with `{{access_token}}` on protected requests.

Login and refresh requests use No Auth. The callback endpoint does not use a resident JWT.

Logging in as another account replaces the active tokens if the token-saving scripts are enabled.

Logout blacklists the submitted refresh token. An already-issued access token remains valid until it expires.

## Running tests

From the backend directory:

```bash
python manage.py test payments.tests.MpesaVerificationTests --verbosity 2
```

Django creates a separate test database. The PostgreSQL user needs permission to create it.

The mocked tests do not contact Safaricom and do not require ngrok.

## Deployment and remaining work

Deployment preparation uses Gunicorn and WhiteNoise. A live backend URL will be added after deployment is verified.

Remaining work includes:

- Deployment and deployed endpoint checks
- React frontend integration
- Successful Daraja sandbox transaction verification
- Staff resolution of payments requiring review
- Automatic payment verification and scheduled hold cleanup
- Production M-Pesa onboarding before accepting real money