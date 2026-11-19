import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const firebaseConfig = readFileSync(new URL('../src/lib/firebase.js', import.meta.url), 'utf8');
const filePicker = readFileSync(new URL('../src/components/FilePicker.jsx', import.meta.url), 'utf8');
const hostingWorkflow = readFileSync(new URL('../.github/workflows/firebase-hosting-deploy.yml', import.meta.url), 'utf8');

test('Spark frontend does not initialize Firebase Storage', () => {
  assert.doesNotMatch(firebaseConfig, /getStorage\s*\(/);
  assert.match(firebaseConfig, /export const storage = null;/);
  assert.doesNotMatch(firebaseConfig, /'VITE_FIREBASE_STORAGE_BUCKET',/);
});

test('file upload controls remain disabled while Storage is inactive', () => {
  assert.match(filePicker, /const FILE_UPLOADS_ENABLED = false;/);
  assert.match(filePicker, /FILE_UPLOADS_ENABLED && !readOnly/);
  assert.match(filePicker, /File uploads are temporarily unavailable/);
});

test('production Hosting workflow does not require a Storage bucket and is main-only', () => {
  assert.doesNotMatch(hostingWorkflow, /VITE_FIREBASE_STORAGE_BUCKET/);
  assert.match(hostingWorkflow, /if: github\.ref == 'refs\/heads\/main' && inputs\.confirm_live_deploy == true/);
});
