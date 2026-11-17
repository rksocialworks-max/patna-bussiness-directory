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
