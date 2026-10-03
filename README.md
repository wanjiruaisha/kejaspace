# KejaSpace

**Your space. Your stay. Simplified.**

KejaSpace is a full-stack hostel management application that brings room applications, resident stays, rent records and everyday hostel services into one system. Residents manage their accommodation through a React website, while staff and administrators use a separate management interface.

Built as a Software Developer Core project at Zindua School.


## Features

### Public website and resident services

- Browse rooms, prices, capacity, availability and illustrative photographs.
- View room details and submit an accommodation application.
- Register, log in and log out using JWT authentication.
- Follow application decisions and cancel eligible applications.
- View assigned stays, payment deadlines and check-in/check-out status.
- View rent charges, recorded payments and outstanding balances.
- Initiate M-Pesa payment attempts and check verification outcomes.
- Submit maintenance requests when checked in.
- Register expected visitors and cancel eligible visits.
- Read published hostel announcements.

### Management interface

- Review, approve or reject accommodation applications.
- Manage resident stays, arrivals, departures and eligible cancellations.
- Create later monthly rent charges and record confirmed cash or bank payments.
- Track maintenance requests and add staff notes.
- Record visitor check-in and check-out.
- View dashboard summaries for rooms, stays, pending applications, maintenance and recorded payments.
- View occupancy and payment reports.
- Search, filter, order and paginate supported record lists.
- Manage rooms, user access and announcements through administrator pages.

The frontend uses responsive layouts, compact record lists, expandable details, loading indicators and error feedback. Management navigation is separate from the public website.

## Roles and permissions

| Role | Access |
| --- | --- |
| Guest | Browse public pages and rooms; register or log in. |
| Resident | Manage their own applications, stays, charges, visitors and maintenance requests; read published announcements. |
| Staff | Review applications, manage stays, record manual payments, handle maintenance and visitors, and view management reports. |
| Administrator | Access management tools and manage rooms, non-superuser account access and announcements. |

The frontend identifies staff through `is_staff` and administrators through `is_superuser`. Backend views enforce permissions independently of visible navigation. DRF's `IsAdminUser` checks `is_staff`; administrator-only views use the project's `IsSystemAdmin` permission.

Public registration must not grant staff or administrator access. User-access endpoints exclude superuser accounts from their editable queryset.

## Accommodation workflow

1. A resident browses rooms and applies with a preferred move-in date.
2. Staff review the application and check allocation availability.
3. Approval creates an awaiting-payment stay, a temporary payment hold and an initial rent charge.
4. The first month's rent must be paid in full before the payment deadline. A verified payment that passes the backend checks changes the stay to `reserved`.
5. Staff check the resident in on arrival.
6. Checked-in residents can register visitors and report maintenance issues.
7. Staff record check-out when the resident leaves; historical records remain available.

**An application is not a reservation. Approval alone does not complete the reservation either: initial payment must be confirmed within the hold period.**

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Tailwind CSS |
| Backend | Python, Django, Django REST Framework |
| Database | PostgreSQL; Neon for hosted PostgreSQL |
| Authentication | SimpleJWT access and refresh tokens |
| API filtering | django-filter and DRF search/ordering |
| Payments | Safaricom Daraja M-Pesa integration; manual cash/bank payment records |
| API testing | Postman |
| Backend hosting | Render |

Dependency manifests and lockfiles are the source of truth for exact installed versions. Dashboard chart dependencies should be included in the frontend manifest when used.

## Project structure

This README belongs at the repository root, alongside `frontend/` and `backend/`.

```text
kejaspace/
├── README.md
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── keja_project/
│   ├── users/
│   ├── rooms/
│   ├── accommodation/
│   ├── payments/
│   ├── maintenance/
│   ├── announcements/
│   ├── visitors/
│   └── dashboard/
└── frontend/
    ├── package.json
    ├── public/
    │   └── images/
    └── src/
        ├── App.jsx
        ├── components/
        ├── layouts/
        ├── pages/
        │   ├── auth/
        │   ├── resident/
        │   ├── staff/
        │   └── admin/
        ├── routes/
        ├── hooks/
        ├── services/
        └── utils/
```

## Local setup

### Prerequisites

- Git.
- Python compatible with `backend/requirements.txt`.
- Node.js compatible with the Vite version in `frontend/package.json`, and npm.
- A PostgreSQL database and connection credentials.
- Daraja credentials only if testing the M-Pesa integration.

Clone this repository using its GitHub URL, then open the `kejaspace` directory.

### 1. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment using the command for your terminal:

```bash
# Windows Git Bash
source .venv/Scripts/activate
```

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Install the backend dependencies:

```bash
python -m pip install -r requirements.txt
```

Configure the environment values consumed by `backend/keja_project/settings.py`. Use the repository's environment example if one is available. The table below describes the required configuration; **the Django and database variable names must match the names actually read by your settings file**.

| Configuration | Local value or purpose |
| --- | --- |
| Django secret key | A private, generated development secret. |
| Debug mode | Enabled locally; disabled in production. |
| Allowed hosts | Include `localhost` and `127.0.0.1` locally. |
| Database connection | Your local or Neon PostgreSQL connection; use the database URL or individual fields expected by settings. |
| `CORS_ALLOWED_ORIGINS` | Include `http://localhost:5173`; use the parsing format expected by settings. |
| `MPESA_ENVIRONMENT` | `sandbox` for the currently configured integration. |
| `MPESA_CONSUMER_KEY` | Daraja application consumer key. |
| `MPESA_CONSUMER_SECRET` | Daraja application consumer secret. |
| `MPESA_SHORTCODE` | Shortcode associated with the configured test credentials. |
| `MPESA_PASSKEY` | Passkey associated with that shortcode. |
| `MPESA_CALLBACK_URL` | Public HTTPS URL ending in `/api/payments/mpesa/callback/`. |

If your settings use `os.getenv()`, environment variables must be supplied to the process. `os.getenv()` does not load a `.env` file by itself: use the project's dotenv loader, export the variables in your terminal, or configure them on the hosting service.

Never commit secrets, database credentials, JWTs or M-Pesa credentials. Keep environment files excluded from Git.

With the configured environment loaded, run:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

- Local API base: `http://127.0.0.1:8000/api`
- Django administration: `http://127.0.0.1:8000/admin/`

Create room records through Django administration or the application's administrator interface. Creating a database and applying migrations does not automatically populate rooms.

### 2. Set up the frontend

Open another terminal in the repository root:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Use the API base without a trailing slash because service functions append paths such as `/rooms/`. Frontend `VITE_` values are exposed to the browser: never put private credentials in them.

Start the frontend:

```bash
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`. If Vite selects another port, add that exact origin to the backend CORS configuration. Restart Vite after changing its environment file.



Filters differ between endpoints. The charge search currently targets room numbers. The UI must not imply that resident-name search is supported unless the backend search fields are extended.

## Payments and testing

### Manual payments

Staff record money already received through cash or bank transfer. Recording a payment does not itself transfer money. Each record includes an amount, method and unique receipt/transaction reference.

The backend checks remaining balance and stay eligibility. Initial rent must cover the full charge in one payment while the payment hold is valid. Successful initial payment confirmation reserves the stay.

### M-Pesa

The integration separates initiating a request from verifying its final outcome. A successful STK request acknowledgement or a phone prompt alone does not establish that rent has been paid.

Payment attempts can be `pending`, `successful`, `failed` or `review`. Verification checks the checkout request ID and provider result, then validates the charge and stay before recording a payment. Repeated verification must not create duplicate payment records. An internal `STK-...` reference is not an M-Pesa receipt number.

**Testing limitation:** a handset test in this project was reported to deduct KES 1 and later reverse it. Do not assume a sandbox-labelled STK prompt cannot affect a real wallet. Safaricom's [Daraja FAQ](https://developer.safaricom.co.ke/faqs) describes automatic reversal of test funds; this is not a guarantee about the timing or outcome of any individual transaction.

For demonstrations, use an existing verified test record or clearly labelled simulated data in a separate test environment. Do not present reversed test funds as actual rent collected. Payment success and reversal reconciliation require further end-to-end validation before real hostel use.

If the outcome is uncertain, inspect the attempt and provider records before submitting again. Do not change a payment to successful solely to complete a demonstration.

## Validation and checks

Run backend checks from `backend/` with the configured development environment loaded:

```bash
python manage.py check
python manage.py test
```

Run frontend checks from `frontend/`:

```bash
npm run lint
npm run build
npm run preview
```


Suggested manual/Postman checks:

- Register, log in, refresh an expired access token and log out.
- Confirm residents cannot access staff/admin endpoints or another resident's records.
- Apply for a room and follow approval through payment, reservation and check-in.
- Confirm expired holds and unavailable rooms cannot be incorrectly confirmed.
- Reject duplicate monthly rent charges, duplicate payment references and overpayments.
- Verify repeated payment confirmation cannot record the same attempt twice.
- Confirm maintenance requests and visitor registration require a checked-in stay.
- Confirm visitor entry requires the scheduled date and valid previous status.
- Verify published notices are visible and drafts remain restricted.
- Exercise search, filtering, ordering and pagination on supported endpoints.
- Check mobile navigation, keyboard focus, loading, empty and error states.

Use separate resident, staff and administrator credentials in Postman. Keep access and refresh tokens in local environment variables rather than committed collection files.

## Deployment

The backend uses Render with hosted PostgreSQL. Configure secrets and database values on the server, run migrations and serve the application through the project's production WSGI/ASGI configuration. Use `DEBUG=False`, the correct allowed hostnames, and the required static-file configuration.

For a Vite frontend deployment:

- Set the frontend root directory to `frontend` where required by the host.
- Use `npm run build` and publish `dist`.
- Set `VITE_API_BASE_URL` to the deployed backend's `/api` base before building.
- Add the exact deployed frontend origin to backend CORS settings.
- Configure a single-page application fallback to `index.html` so direct visits to routes such as `/rooms/1` work.

The M-Pesa callback must be publicly reachable over HTTPS. `localhost` is not reachable by Safaricom. After deployment, validate the actual authentication routes, role permissions and payment callback handling against the deployed service.

## Limitations and future improvements

- M-Pesa verification, reversals and reconciliation need further validation before production use.
- Room photographs are illustrative static frontend assets; they are not an administrator upload system.
- Creating later rent charges currently requires a numeric stay ID; a resident-and-room selector would improve usability.
- Notification delivery, password recovery and email verification are future improvements rather than documented completed features.
- Possible extensions include downloadable reports, audit trails and support for multiple hostels.

## Author

**Aisha Wanjiru**

## License

licensed under the MIT license
