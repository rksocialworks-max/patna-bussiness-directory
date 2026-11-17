# Firebase Storage setup

The Storage client uploads files to `users/{uid}/uploads/{file}`. The matching `storage.rules` file keeps these objects private and permits only the signed-in uploader or a trusted administrator custom claim to read them.

## Before deployment

1. Confirm Firebase Storage is enabled in the existing Firebase project.
2. Confirm Authentication is enabled and users sign in with Firebase Auth.
3. Review the administrator custom-claim values in `storage.rules`. The current rule accepts `Admin_c`, `admin`, or `super_admin` in the token's `role` claim.
4. Test upload, read, update, and delete behavior with the Firebase Emulator before production use.

## Deploy Storage rules only

This repository's `firebase.json` intentionally configures Storage only. From the project root, after installing and logging in to Firebase CLI and selecting the correct existing project:

```bash
firebase use patnabiz-b2fcb
firebase deploy --only storage
```

Do not use a broad `firebase deploy` command for this draft. Firestore currently has a deny-all placeholder ruleset and has not yet been replaced with the final tested policy.

## Current restrictions

- Upload path: `users/{uid}/uploads/{fileName}`
- Maximum object size: 10 MiB
- Accepted content types: JPEG, PNG, WebP, and PDF
- Objects are not publicly readable.
- Business owners cannot read another user's upload.
- The app must store the returned Storage path and resolve a download URL only when the authorized user needs it.

These rules are a conservative first pass, not the complete final access model for business documents, branch managers, or moderation workflows.

## Cloud Functions role management draft

The repository also includes a callable function named `assignManagedRole` in `functions/src/index.js`. It allows a separately bootstrapped Super Admin (custom claim `superAdmin: true`) to assign only `BusinessOwner_c` or `BranchManager_c`. It deliberately cannot create or promote an Admin account.

Before deploying this function:

1. Configure Firebase App Check for the web app because the callable enforces App Check.
2. Bootstrap the single Super Admin securely using a trusted administrative process; never let public signup assign this claim.
3. Review the role/profile claim names against the app's auth guard.
4. Install the Functions dependencies from the `functions` directory and run the Firebase Emulator Suite.
5. Deploy Functions only after the tests pass.

The function is source code only. It has not been installed, emulator-tested, or deployed from this work session.

## Super Admin account management

The admin dashboard page is available at `/admin/users` for accounts whose app profile is `Admin_c`. It calls the protected `listManagedUsers` and `assignManagedRole` Functions; it does not query the Auth users collection from the browser.

### App Check

The browser initializes reCAPTCHA v3 App Check when `VITE_FIREBASE_APPCHECK_SITE_KEY` is present. Add the site key to the local `.env.local` and hosting environment after registering the matching site in Firebase App Check. Do not enable App Check enforcement for production callable functions until the deployed web app is correctly registered and verified.

### One-time Super Admin bootstrap

The callable role-management functions require the trusted boolean custom claim `superAdmin: true`. This claim must be assigned once to the intended administrator by an authorized project administrator in a trusted server-side environment. Never expose service-account credentials in the repository, browser bundle, chat, or client environment variables. Do not bootstrap by allowing public signup or by adding a client-side button. Confirm the account's email and identity independently before assigning the claim.

The functions intentionally do not create or promote Admin accounts. Account roles returned to the browser are limited metadata (UID, email, display name, disabled state, role, email verification, and creation time).

### Role assignment limitations

- The callable function supports only `BusinessOwner_c` and `BranchManager_c`.
- A role update writes Firebase Auth custom claims and a minimal user record.
- The user may need to sign out and sign in again to refresh their ID token.
- Branch-to-manager assignment and business ownership mapping remain separate workflows and are not granted by this function.
