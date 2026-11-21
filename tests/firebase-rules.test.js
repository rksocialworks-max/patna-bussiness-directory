import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
});

after(async () => {
  await env?.cleanup();
});

const ownerBusiness = {
  Name: 'Test Shop',
  category_c: 'Retail',
  district_c: 'Patna',
  address_c: 'Test Road',
  phone_c: '9000000000',
  ownerUid: 'owner-1',
  status_c: 'Pending Approval',
  listing_type_c: 'Free',
  is_premium_c: false,
  is_verified_c: false,
  rating_c: 0,
  reviews_count_c: 0,
  featured_order_c: 99,
};

describe('Firestore private business rules', () => {
  it('does not allow a user to self-assign the Branch Manager role', async () => {
    const db = env.authenticatedContext('self-assign', { email: 'manager@example.com' }).firestore();
    await assertFails(setDoc(doc(db, 'users/self-assign'), {
      uid: 'self-assign',
      email: 'manager@example.com',
      role: 'BranchManager_c',
      profile: 'BranchManager_c',
    }));
  });

  it('allows an already assigned Branch Manager to access only their assigned branch', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      // Branch reads also evaluate the owner path; seed the parent business
      // so the test isolates Branch Manager assignment rather than a missing doc.
      await setDoc(doc(context.firestore(), 'businesses/business-1'), {
        ownerUid: 'business-owner-1',
      });
      await setDoc(doc(context.firestore(), 'branches/assigned-branch'), {
        business_c: 'business-1',
        manager_c: [{ User: { Id: 'manager-1', Name: 'Assigned Manager' } }],
      });
      await setDoc(doc(context.firestore(), 'branches/other-branch'), {
        business_c: 'business-1',
        manager_c: [{ User: { Id: 'manager-2', Name: 'Other Manager' } }],
      });
    });
    const db = env.authenticatedContext('manager-1', { role: 'BranchManager_c' }).firestore();
    await assertSucceeds(getDoc(doc(db, 'branches/assigned-branch')));
    await assertFails(getDoc(doc(db, 'branches/other-branch')));
  });

  it('denies unauthenticated reads and writes to private business records', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'businesses/demo')));
    await assertFails(setDoc(doc(db, 'businesses/demo'), { Name: 'Demo' }));
  });

  it('allows an owner to create a pending free listing linked to their UID', async () => {
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'businesses/owner-shop'), ownerBusiness));
    await assertSucceeds(getDoc(doc(db, 'businesses/owner-shop')));
  });

  it('denies a free owner from setting premium-only fields during creation', async () => {
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(setDoc(doc(db, 'businesses/free-with-website'), {
      ...ownerBusiness,
      website_c: 'https://example.com',
    }));
    await assertFails(setDoc(doc(db, 'businesses/free-with-email'), {
      ...ownerBusiness,
      email_c: 'owner@example.com',
    }));
    await assertFails(setDoc(doc(db, 'businesses/free-with-cover'), {
      ...ownerBusiness,
      cover_c: 'https://example.com/cover.jpg',
    }));
    await assertFails(setDoc(doc(db, 'businesses/free-with-photos'), {
      ...ownerBusiness,
      photos_c: ['https://example.com/photo.jpg'],
    }));
  });

  it('denies an owner from creating an already approved or premium listing', async () => {
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(setDoc(doc(db, 'businesses/approved-shop'), {
      ...ownerBusiness,
      status_c: 'Approved',
    }));
    await assertFails(setDoc(doc(db, 'businesses/premium-shop'), {
      ...ownerBusiness,
      is_premium_c: true,
    }));
  });

  it('denies one owner from reading another owner business record', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses/private-shop'), {
        ...ownerBusiness,
        ownerUid: 'owner-2',
      });
    });
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(getDoc(doc(db, 'businesses/private-shop')));
  });

  it('allows an owner to edit normal fields but not moderation or premium fields', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses/owner-shop'), ownerBusiness);
    });
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    const businessRef = doc(db, 'businesses/owner-shop');
    await assertSucceeds(updateDoc(businessRef, { description_c: 'Updated description' }));
    await assertFails(updateDoc(businessRef, { status_c: 'Approved' }));
    await assertFails(updateDoc(businessRef, { is_premium_c: true }));
    await assertFails(updateDoc(businessRef, { cover_c: [{ url: 'https://example.com/cover.jpg' }] }));
    await assertFails(updateDoc(businessRef, { photos_c: [{ url: 'https://example.com/photo.jpg' }] }));
    await assertFails(updateDoc(businessRef, { ownerUid: 'owner-2' }));
  });

  it('allows an Admin to approve a business listing', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses/pending-shop'), ownerBusiness);
    });
    const adminDb = env.authenticatedContext('admin-1', { role: 'Admin_c' }).firestore();
    await assertSucceeds(updateDoc(doc(adminDb, 'businesses/pending-shop'), {
      status_c: 'Approved',
      is_verified_c: true,
    }));
  });

  it('allows free owners to update Facebook and Instagram, but not premium-only website or email', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses/social-shop'), ownerBusiness);
    });
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    const businessRef = doc(db, 'businesses/social-shop');
    await assertSucceeds(updateDoc(businessRef, { facebook_c: 'https://facebook.com/example' }));
    await assertSucceeds(updateDoc(businessRef, { instagram_c: 'https://instagram.com/example' }));
    await assertFails(updateDoc(businessRef, { website_c: 'https://example.com' }));
    await assertFails(updateDoc(businessRef, { email_c: 'hello@example.com' }));
    await assertFails(updateDoc(businessRef, { youtube_c: 'https://youtube.com/example' }));
    await assertFails(updateDoc(businessRef, { linkedin_c: 'https://linkedin.com/example' }));
  });
});

describe('Payment security rules', () => {
  it('allows an owner to read their payment record but denies client-side creation or status changes', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'payments/payment-1'), {
        ownerUid: 'owner-1',
        business_c: 'owner-business',
        amount_c: 999,
        status_c: 'Pending',
      });
      await setDoc(doc(context.firestore(), 'businesses/owner-business'), ownerBusiness);
    });
    const ownerDb = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'payments/payment-1')));
    await assertFails(setDoc(doc(ownerDb, 'payments/fake-payment'), {
      ownerUid: 'owner-1', business_c: 'owner-business', amount_c: 999, status_c: 'Paid',
    }));
    await assertFails(updateDoc(doc(ownerDb, 'payments/payment-1'), { status_c: 'Paid' }));
    const otherOwnerDb = env.authenticatedContext('owner-2', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(getDoc(doc(otherOwnerDb, 'payments/payment-1')));
    const adminDb = env.authenticatedContext('admin-1', { role: 'Admin_c' }).firestore();
    await assertFails(updateDoc(doc(adminDb, 'payments/payment-1'), { status_c: 'Paid' }));
    await assertFails(setDoc(doc(adminDb, 'payments/admin-fake'), { ownerUid: 'owner-1', status_c: 'Paid' }));
  });
});

describe('Public mirror rules', () => {
  it('allows public reads of curated business documents', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'business_public/public-shop'), {
        id: 'public-shop',
        Name: 'Public Shop',
        status_c: 'Approved',
      });
    });
    const db = env.unauthenticatedContext().firestore();
    const result = await assertSucceeds(getDoc(doc(db, 'business_public/public-shop')));
    assert.equal(result.data().Name, 'Public Shop');
  });

  it('denies clients from creating or editing public mirror documents', async () => {
    const db = env.authenticatedContext('owner-1', { role: 'BusinessOwner_c' }).firestore();
    await assertFails(setDoc(doc(db, 'business_public/fake-shop'), {
      id: 'fake-shop',
      Name: 'Fake approved shop',
    }));
  });

  it('denies public access to private business source records', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses/private-shop'), ownerBusiness);
    });
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'businesses/private-shop')));
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

  it('allows PDF documents in the authenticated uploader folder', async () => {
    const storage = env.authenticatedContext('owner-pdf').storage();
    const object = ref(storage, 'users/owner-pdf/uploads/verification.pdf');
    await assertSucceeds(uploadBytes(object, new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' }));
  });

  it('rejects uploads larger than the 10 MB limit', async () => {
    const storage = env.authenticatedContext('owner-large').storage();
    const object = ref(storage, 'users/owner-large/uploads/oversized.png');
    const oversizedFile = new Uint8Array(10 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(object, oversizedFile, { contentType: 'image/png' }));
  });

  it('allows the uploader to read their own uploaded object', async () => {
    const storage = env.authenticatedContext('owner-read').storage();
    const object = ref(storage, 'users/owner-read/uploads/read-check.png');
    await assertSucceeds(uploadBytes(object, new Uint8Array([4, 5, 6]), { contentType: 'image/png' }));
    await assertSucceeds(getBytes(object));
  });

  it('allows trusted Admin profile claims to read uploaded files for moderation', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const object = ref(context.storage(), 'users/owner-docs/uploads/review.png');
      await uploadBytes(object, new Uint8Array([7, 8, 9]), { contentType: 'image/png' });
    });
    const adminStorage = env.authenticatedContext('admin-1', { profile: 'Admin_c' }).storage();
    await assertSucceeds(getBytes(ref(adminStorage, 'users/owner-docs/uploads/review.png')));
  });

  it('denies unauthenticated access', async () => {
    const storage = env.unauthenticatedContext().storage();
    const object = ref(storage, 'users/owner-1/uploads/logo.png');
    await assertFails(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  });
});
