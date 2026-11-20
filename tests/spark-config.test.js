import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const firebaseConfig = readFileSync(new URL('../src/lib/firebase.js', import.meta.url), 'utf8');
const filePicker = readFileSync(new URL('../src/components/FilePicker.jsx', import.meta.url), 'utf8');
const hostingWorkflow = readFileSync(new URL('../.github/workflows/firebase-hosting-deploy.yml', import.meta.url), 'utf8');

test('Firebase Storage initializes only when a bucket is configured', () => {
  assert.match(firebaseConfig, /import \{ getStorage \} from 'firebase\/storage'/);
  assert.match(firebaseConfig, /firebaseApp && firebaseConfig\.storageBucket/);
  assert.match(firebaseConfig, /: null;/);
});

test('file uploads are opt-in and respect the parent Storage availability flag', () => {
  assert.match(filePicker, /uploadsEnabled = false/);
  assert.match(filePicker, /const canAdd = uploadsEnabled && !readOnly && !disabled/);
  assert.match(filePicker, /File uploads are temporarily unavailable/);
  assert.doesNotMatch(filePicker, /FILE_UPLOADS_ENABLED/);
});

test('production Hosting workflow remains main-only and requires explicit live confirmation', () => {
  assert.match(hostingWorkflow, /if: github\.ref == 'refs\/heads\/main' && inputs\.confirm_live_deploy == true/);
});
