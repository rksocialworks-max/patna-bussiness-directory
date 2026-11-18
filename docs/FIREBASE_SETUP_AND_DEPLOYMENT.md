# Firebase setup and deployment checklist

This project uses Firebase project `patnabiz-b2fcb`, Firebase Authentication, Cloud Firestore, Cloud Storage and Cloud Functions (region `asia-south1`). The frontend is a Vite SPA and can also be hosted on another static hosting provider.

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
- Storage: initialize the bucket and review `storage.rules`.
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

The manual workflow `.github/workflows/firebase-hosting-deploy.yml` deploys **Hosting only** to `patnabiz-b2fcb`. It can run only from `firebase-integration/draft`, requires the manual confirmation input, and uses Google Cloud Workload Identity Federation (WIF). It does not deploy Firestore rules, Storage rules, or Functions.

Before using it, configure a WIF provider for GitHub Actions in Google Cloud and grant its deploy service account the minimum Firebase Hosting deployment permissions for this project. Add these repository settings under Settings → Secrets and variables → Actions:

**Repository Variables**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID` (must be `patnabiz-b2fcb`)
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_APPCHECK_SITE_KEY` (the Enterprise site key registered for this Web App)

**Repository Secrets**
- `FIREBASE_WORKLOAD_IDENTITY_PROVIDER`
- `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

Do not create or upload a service-account private key JSON file. Use WIF. Verify the App Check key is the Enterprise site key for the registered Firebase Web App and that its allowed domains include the Firebase Hosting domains. A successful workflow run publishes the site publicly; run it only when intentionally approving a live Hosting release.

## 5. Deploy backend services

From the repository root, after verifying the selected Firebase project and reviewing security rules:

```bash
npm install
cd functions
npm install
cd ..
firebase use patnabiz-b2fcb
firebase deploy --only firestore:rules,storage,functions
```

Deploying Functions may require the Firebase project to be on the Blaze plan and may create billable resources. Review current Firebase pricing and project billing before deployment.

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
- Verify uploads are limited by Storage Rules to the authenticated user's own upload path and allowed file types.
- Confirm public mirrors do not contain private owner or verification data.
- Run the emulator suite and inspect GitHub Actions before production deployment.

## Important

GitHub Actions passing means the code builds and the current Firestore/Storage emulator tests pass. It does not prove that production Firebase services, App Check, billing, custom claims, real user flows, or hosting are configured. No production deployment should be treated as complete until the checks above are performed against the intended project.
