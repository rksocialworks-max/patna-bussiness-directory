# Firebase Backend Blueprint — Patna Business Directory

Status: Firebase integration is implemented in this branch. This document describes the current code; it does not mean the production Firebase project is configured or deployed.

## Project and runtime

- Firebase project configured by the setup guide: `patnabiz-b2fcb`
- Cloud Functions region: `asia-south1`
- Frontend: React 19 + Vite 8 with Firebase JS SDK
- Backend: Firebase Cloud Functions v2 with Firebase Admin SDK
- Data: Cloud Firestore; uploads: Cloud Storage
- Hosting: Firebase Hosting configuration serves the Vite `dist/` build and rewrites SPA routes to `index.html`
- Runtime: Node.js 20 for Cloud Functions

## Implemented backend capabilities

- Firebase Authentication email/password sign-up, sign-in, password reset and email verification.
- Role-based route access using Firebase Auth custom claims. The first Super Admin is provisioned only through a trusted Admin SDK process; public signup cannot grant admin roles.
- Super Admin callable operations for assigning Business Owner / Branch Manager roles and listing managed accounts.
- Firestore source collections with server-maintained public mirrors for approved businesses and published directory content.
- Public callable endpoints for customer reviews, enquiries and business reports, protected by App Check and server-side validation.
- Premium plan validation and calendar-month durations (1, 3 and 12 months), with legacy 30/90/365-day compatibility.
- Razorpay order creation and payment verification on the server; manual UPI reference submission with duplicate UTR protection; Admin approval/rejection.
- Premium activation and payment status updates in server-side Firestore transactions.
- Scheduled downgrade of expired Premium listings to Free.
- Scheduled cleanup of enquiries older than 30 days.
- Firestore and Storage Security Rules restrict private data and client-side payment mutations.

## Important collection groups

Private source collections include `users`, `businesses`, `branches`, `products_services`, `reviews`, `enquiries`, `business_documents`, `payments`, `offers`, `coupons`, `advertisements`, `notifications`, `reports`, `support_requests`, and `privacy_requests`.

Public, read-only mirrors include `business_public`, `branches_public`, `products_services_public`, `reviews_public`, `offers_public`, `coupons_public`, `categories_public`, `premium_plans_public`, `homepage_banners_public`, `content_pages_public`, and `site_settings_public`.

Public mirrors are populated by trusted Cloud Functions. Clients must not create or modify mirror records directly. Private owner data, verification records and payment mutations must remain protected by Security Rules and server-side authorization.

## Required Firebase Console configuration

Before a real end-to-end test or deployment, the project owner must:

1. Confirm the intended Firebase project and register its Web App.
2. Copy `.env.example` to `.env.local` and provide the correct `VITE_FIREBASE_*` values. Keep local environment files and credentials out of Git.
3. Enable Email/Password in Firebase Authentication.
4. Create/confirm Firestore and Storage in the intended region and review the deployed rules.
5. Register App Check for the web app with reCAPTCHA v3 and set `VITE_FIREBASE_APPCHECK_SITE_KEY`. Callable endpoints that enforce App Check will reject requests until this is correctly configured.
6. Bootstrap the first Super Admin custom claim from a trusted environment using Firebase Admin SDK and Application Default Credentials. Never place Admin SDK credentials in browser code.
7. Store `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Firebase Secret Manager before enabling Razorpay calls.
8. Confirm the Firebase billing plan. Deploying Cloud Functions and scheduled functions may require the Blaze plan and can create billable usage.

The owner has stated that GST registration is not available. The payment acknowledgement is therefore non-GST and must not be presented as a GST tax invoice.

## Validation currently available

The GitHub Actions workflow `Firebase Emulator and Build Tests` runs:
- Frontend production build
- Cloud Functions JavaScript syntax check
- Firestore and Storage rules tests against Firebase Emulators

A successful workflow validates those checks only. It does not prove that production Auth, App Check, Firestore, Storage, Razorpay, custom claims, billing, hosting, or full user journeys are configured.

## Deployment safety

All current integration work is confined to `firebase-integration/draft`. Do not deploy to the live Firebase project, change `main`, enable billing, or migrate production data without the project owner's explicit approval.

Refer to [Firebase setup and deployment checklist](./FIREBASE_SETUP_AND_DEPLOYMENT.md) for the operator steps.