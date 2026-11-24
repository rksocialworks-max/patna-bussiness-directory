# Firebase setup and deployment checklist

This project uses Firebase project `patnabiz-b2fcb`, Firebase Authentication and Cloud Firestore. The frontend is a Vite SPA and can also be hosted on another static hosting provider. For the Spark-plan configuration, Firebase Storage is not initialized and file uploads are disabled. Cloud Functions are included in the source but production deployment requires a compatible billing plan; do not deploy them while keeping the project on Spark.

## 1. Configure the web app

1. In Firebase Console, open project `patnabiz-b2fcb` and register/confirm the Web App.
2. Copy `.env.example` to `.env.local`.
3. Fill the Firebase Web App values from Project settings → General → Your apps.
4. Keep `.env.local` private; do not commit it or share service-account credentials.
5. Install dependencies and run locally:

```bash
npm install
npm run dev
```

The app intentionally shows a Firebase setup message when required web configuration is absent.

## 2. Enable Firebase services

In Firebase Console for the same project:

- Authentication → Sign-in method: enable Email/Password.
- Firestore Database: create the production database in the intended region and review `firestore.rules`.
- Storage: intentionally leave uninitialized while using the Spark-plan configuration. The web app does not initialize Storage and file-upload controls remain disabled. The Storage rules are retained for a future separately approved activation.
- App Check: register the matching web app with **Fraud Defense (reCAPTCHA Enterprise)**. Create a reCAPTCHA Enterprise website site key for the deployed domains, then put that site key in `VITE_FIREBASE_APPCHECK_SITE_KEY` in `.env.local` and the hosting provider's build environment. The frontend uses Firebase's `ReCaptchaEnterpriseProvider`.

Callable Functions in this project enforce App Check. Do not enforce App Check in production until the web app is registered and the correct Enterprise site key is configured in every deployed frontend environment; otherwise protected callable requests will be rejected.

## 3. First Super Admin setup (trusted operator only)

There is deliberately no public Super Admin signup or bootstrap callable. The first Super Admin custom claim must be granted from a trusted administrative environment by the project owner.

Use Firebase Admin SDK with Application Default Credentials in a trusted environment that is authorized for this Firebase project. Confirm the target UID from Authentication → Users before running. Preserve any existing custom claims and set only the Super Admin claim:

```js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ credential: applicationDefault(), projectId: 'patnabiz-b2fcb' });
const uid = 'REPLACE_WITH_VERIFIED_AUTH_UID';
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, {
  ...(user.customClaims || {}),
  superAdmin: true,
  role: 'Admin_c',
  profile: 'Admin_c',
});
console.log('Super Admin claim assigned to verified UID:', uid);
```

Run this only in a trusted Node.js environment where Firebase Admin SDK is installed and Application Default Credentials are configured for the project. Never put service-account JSON, private keys, or Admin SDK code in the browser. Sign out and sign back in (or refresh the ID token) after setting the claim. Keep the Super Admin account protected with a strong unique password and MFA where available.

After bootstrap, the Super Admin can assign only Business Owner and Branch Manager roles through the protected account-management flow. Admin roles cannot be granted by that callable.

## 4. Configure GitHub Actions authentication for Hosting

The manual workflow `.github/workflows/firebase-hosting-deploy.yml` deploys **Hosting only** to `patnabiz-b2fcb`. It can run only from `main`, requires the manual confirmation input, and uses Google Cloud Workload Identity Federation (WIF). It does not deploy Firestore rules, Storage rules, or Functions.

Before using it, configure a WIF provider for GitHub Actions in Google Cloud and grant its deploy service account the minimum Firebase Hosting deployment permissions for this project. Add these repository settings under Settings → Secrets and variables → Actions:

**Repository Variables**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID` (must be `patnabiz-b2fcb`)
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_APPCHECK_SITE_KEY` (the Enterprise site key registered for this Web App)

**Repository Secrets**
- `FIREBASE_WORKLOAD_IDENTITY_PROVIDER`
- `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

Do not create or upload a service-account private key JSON file. Use WIF. Verify the App Check key is the Enterprise site key for the registered Firebase Web App and that its allowed domains include the Firebase Hosting domains. A successful workflow run publishes the site publicly; run it only when intentionally approving a live Hosting release.

## 5. Deploy backend services on the Spark plan

For the current free-plan configuration, deploy only Firestore rules after verifying the selected project and reviewing the rules:

```bash
firebase use patnabiz-b2fcb
firebase deploy --only firestore:rules
```

Do not deploy Storage or Cloud Functions as part of the Spark-only release. Storage uploads are disabled in the frontend. Cloud Functions are required by some protected workflows (including server-side review/enquiry submissions and premium payment processing); those workflows are not production-operational until Functions are deployed on a compatible billing plan and their required secrets, App Check, and payment settings are configured. Review current Firebase pricing and project billing before enabling them.

## 5a. Cloud Functions runtime permissions (public directory)

Public pages read curated mirrors such as `business_public`, never the private
`businesses` collection. The `syncBusinessPublicOnWrite` Firestore trigger copies
approved listings into those mirrors. The trigger runs as the function's runtime
service account, which needs Firestore read/write access (`roles/datastore.user`).
Without that role every write fails with `PERMISSION_DENIED`, and approved
businesses never appear on the public directory even though Admin shows them as
Approved.

For this project the runtime account is the default compute service account
`607401339320-compute@developer.gserviceaccount.com`. Verify and grant the role
with the Google Cloud CLI (a project Owner is required):

```bash
gcloud projects get-iam-policy patnabiz-b2fcb --format=json \
  | jq '.bindings[] | select(.role == "roles/datastore.user")'

gcloud projects add-iam-policy-binding patnabiz-b2fcb \
  --member='serviceAccount:607401339320-compute@developer.gserviceaccount.com' \
  --role='roles/datastore.user'
```

The deploy service account only needs `roles/datastore.viewer` to deploy; do not
confuse it with the runtime account above. After granting the role, failed
trigger deliveries are retried automatically. An Admin can also use
**Rebuild Public Directory** on `/admin/businesses` to republish existing
approved listings immediately.

## 6. Build and host the frontend

Set the same `VITE_FIREBASE_*` values in the hosting provider's build environment, including `VITE_FIREBASE_APPCHECK_SITE_KEY`. Then:

```bash
npm run build
```

The generated static site is in `dist/`. Configure the hosting provider to serve `dist/` and rewrite unknown routes to `/index.html` for React Router. Firebase Hosting is configured in `firebase.json`; deploy it separately only after confirming the target project and approval:

```bash
firebase deploy --only hosting
```

## 7. Post-deployment checks

- Confirm sign-up and sign-in with a test account.
- Assign the appropriate non-admin role from the Super Admin account.
- Confirm a new business listing starts as Pending Approval and Free.
- Approve a test listing and verify it appears in the public directory mirror.
- Verify a visitor can submit a review/enquiry/report after App Check is configured.
- Verify owners cannot read another owner's private records or write premium/moderation fields.
- Confirm file-upload controls remain disabled in the Spark-plan release.
- Confirm public mirrors do not contain private owner or verification data.
- Run the emulator suite and inspect GitHub Actions before production deployment.

## Important

GitHub Actions passing means the code builds and the current Firestore/Storage emulator tests pass. It does not prove that production Firebase services, App Check, billing, custom claims, Cloud Functions, real user flows, or hosting are configured. The current Spark-plan configuration intentionally disables Storage uploads and does not deploy Cloud Functions. No production deployment should be treated as complete until the applicable checks above are performed against the intended project.
