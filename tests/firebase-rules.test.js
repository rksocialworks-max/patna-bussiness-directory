import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

const projectId = 'patnabiz-emulator-tests';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
    storage: { rules: fs.readFileSync('storage.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});

after(async () => {
  await env?.cleanup();
});

describe('Firestore security rules (current deny-all baseline)', () => {
  it('denies unauthenticated reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'businesses/demo')));
    await assertFails(setDoc(doc(db, 'businesses/demo'), { Name: 'Demo' }));
  });

  it('denies authenticated client writes until collection rules are implemented', async () => {
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(setDoc(doc(db, 'businesses/demo'), { Name: 'Demo', ownerUid: 'owner-1' }));
  });
});

describe('Storage security rules', () => {
  it('allows an authenticated user to upload an allowed image to their own folder', async () => {
    const storage = env.authenticatedContext('owner-1').storage();
    const object = ref(storage, 'users/owner-1/uploads/logo.png');
    await assertSucceeds(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  });

  it('denies an authenticated user from writing into another user folder', async () => {
    const storage = env.authenticatedContext('owner-1').storage();
    const object = ref(storage, 'users/owner-2/uploads/logo.png');
    await assertFails(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  });

  it('denies unsupported content types', async () => {
    const storage = env.authenticatedContext('owner-1').storage();
    const object = ref(storage, 'users/owner-1/uploads/script.js');
    await assertFails(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'application/javascript' }));
  });

  it('denies unauthenticated access', async () => {
    const storage = env.unauthenticatedContext().storage();
    const object = ref(storage, 'users/owner-1/uploads/logo.png');
    await assertFails(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  });
});
