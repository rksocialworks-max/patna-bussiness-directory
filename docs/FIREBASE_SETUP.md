# Firebase setup — Patna Business Directory

This repository now contains a Firebase client bootstrap and a first-pass Hosting/Firestore configuration. The current application data layer still uses the Apper Memory Adapter; these files do **not** switch the live UI to Firestore.

## Existing project

- Firebase project: Patnabiz
- Project ID: `patnabiz-b2fcb`
- Preferred region recorded for future data resources: `asia-south1`

No Firebase database, storage bucket, billing plan, or production data is created or changed by this repository commit.

## 1. Add the existing Firebase Web App config

In Firebase Console, open the existing `Patnabiz` project, then Project settings → General → Your apps. Copy the configuration for its registered Web App. If there is no Web App registered, stop and get approval before registering one.

Copy `.env.example` to `.env.local` and fill all six `VITE_FIREBASE_*` values from that Web App config. Do not commit `.env.local`.

The Firebase web config contains project/app identifiers and is not a substitute for Firestore Security Rules. Keep the rules restrictive.

## 2. Install dependencies

Run:

```bash
npm install
```

The Firebase SDK dependency is declared in `package.json`.

## 3. Review the proposed Firestore schema before deployment

The first-pass rules and indexes assume these collections:

- `users/{uid}`
- `businesses/{businessId}`
- `branches/{branchId}`
- `productsServices/{itemId}`
- `reviews/{reviewId}`
- `enquiries/{enquiryId}`
- `payments/{paymentId}`
- `premiumPlans/{planId}`
- `siteSettings/{settingId}`

Use Firebase Auth UIDs as `ownerUid` and keep admin authorization in trusted custom claims. Never allow a browser to grant itself admin, verification, approval, or premium status.

The existing mock schema uses names such as `businesses_c`, `Owner`, `status_c`, and `is_premium_c`. A deliberate migration/adapter is still required before these rules can be deployed against live data.

## 4. Payment security

Razorpay order creation, payment-signature verification, receipt generation, and premium activation must be implemented in a trusted server environment (for example, Cloud Functions or another server backend). Never place Razorpay secret keys in Vite variables or browser code. Do not enable billing or deploy payment functions until the project owner explicitly approves the production setup.

## 5. Build and hosting

After the application data layer is migrated and environment values are supplied:

```bash
npm run build
firebase deploy --only hosting
```

Firestore rules/indexes must be reviewed and separately approved before deploying them:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

For non-Firebase static hosts, publish the generated `dist/` directory and configure SPA fallback to `/index.html`.
