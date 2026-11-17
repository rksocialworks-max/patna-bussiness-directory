const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const ASSIGNABLE_ROLES = new Set(['BusinessOwner_c', 'BranchManager_c']);

// Only a separately bootstrapped Super Admin may assign non-admin roles.
// Admin privileges are intentionally never assignable through this endpoint.
exports.assignManagedRole = onCall({ region: 'asia-south1', enforceAppCheck: true }, async (request) => {
  if (!request.auth || request.auth.token.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'Only the Super Admin can assign account roles.');
  }

  const uid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : '';
  const role = typeof request.data?.role === 'string' ? request.data.role.trim() : '';

  if (!uid || uid.length > 128 || !ASSIGNABLE_ROLES.has(role)) {
    throw new HttpsError('invalid-argument', 'A valid user ID and assignable role are required.');
  }

  let target;
  try {
    target = await getAuth().getUser(uid);
  } catch {
    throw new HttpsError('not-found', 'The target account does not exist.');
  }

  const existingClaims = target.customClaims || {};
  if (existingClaims.superAdmin === true || existingClaims.role === 'Admin_c') {
    throw new HttpsError('failed-precondition', 'The Super Admin account cannot be changed here.');
  }

  await getAuth().setCustomUserClaims(uid, {
    ...existingClaims,
    role,
    profile: role,
  });

  await db.collection('users').doc(uid).set({
    uid,
    email: target.email || null,
    role,
    profile: role,
    roleUpdatedAt: FieldValue.serverTimestamp(),
    roleUpdatedBy: request.auth.uid,
  }, { merge: true });

  return { success: true, uid, role };
});


// Return a limited page of account metadata to the Super Admin only.
exports.listManagedUsers = onCall({ region: 'asia-south1', enforceAppCheck: true }, async (request) => {
  if (!request.auth || request.auth.token.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'Only the Super Admin can view account management.');
  }

  const pageToken = typeof request.data?.pageToken === 'string' ? request.data.pageToken : undefined;
  const page = await getAuth().listUsers(100, pageToken);
  return {
    users: page.users.map((user) => ({
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      disabled: user.disabled,
      role: user.customClaims?.role || user.customClaims?.profile || 'Pending approval',
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime || null,
    })),
    nextPageToken: page.pageToken || null,
  };
});


// -----------------------------------------------------------------------------
// Public directory mirrors
// -----------------------------------------------------------------------------
const REGION = 'asia-south1';

function referenceId(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.Id || value.id || null;
  return null;
}

function pickFields(data, fields) {
  const output = {};
  for (const field of fields) {
    if (data[field] !== undefined) output[field] = data[field];
  }
  return output;
}

async function mirrorDocument(event, destination, fields, shouldPublish, transform = (data) => data) {
  const after = event.data?.after;
  const id = event.params?.docId;
  if (!after || !id) return;

  const destinationRef = db.collection(destination).doc(id);
  if (!after.exists) {
    await destinationRef.delete();
    return;
  }

  const source = after.data();
  if (!shouldPublish(source)) {
    await destinationRef.delete();
    return;
  }

  const safeData = pickFields(source, fields);
  await destinationRef.set({ id, ...transform(safeData, source) });
}

async function parentBusinessIsPublic(data) {
  const businessId = referenceId(data.business_c);
  if (!businessId) return false;
  const parent = await db.collection('business_public').doc(businessId).get();
  return parent.exists;
}

const BUSINESS_PUBLIC_FIELDS = [
  'Name', 'category_c', 'subcategory_c', 'district_c', 'city_c', 'area_c',
  'pincode_c', 'address_c', 'description_c', 'owner_name_c', 'phone_c',
  'whatsapp_c', 'map_url_c', 'hours_c', 'holiday_info_c', 'logo_c',
  'is_premium_c', 'is_verified_c', 'rating_c', 'reviews_count_c',
  'premium_expiry_c', 'latitude_c', 'longitude_c', 'slug_c', 'seo_title_c',
  'meta_description_c', 'is_popular_c', 'featured_order_c', 'listing_type_c',
  'CreatedOn',
];

exports.syncBusinessPublic = onDocumentWritten(
  { document: 'businesses/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    await mirrorDocument(
      event,
      'business_public',
      BUSINESS_PUBLIC_FIELDS,
      (data) => data.status_c === 'Approved',
      (safe, source) => {
        const premiumActive = source.is_premium_c === true
          && (!source.premium_expiry_c || source.premium_expiry_c >= new Date().toISOString().slice(0, 10));
        if (premiumActive) {
          Object.assign(safe, pickFields(source, [
            'website_c', 'email_c', 'facebook_c', 'instagram_c',
            'youtube_c', 'linkedin_c', 'x_c', 'telegram_c', 'cover_c', 'photos_c',
          ]));
        }
        return safe;
      },
    );
    if (after?.exists && after.data().status_c === 'Approved') {
      await refreshRelatedPublicMirrors(event.params.docId);
    } else {
      await removeRelatedPublicMirrors(event.params.docId);
    }
  },
);

exports.syncCategoryPublic = onDocumentWritten(
  { document: 'categories/{docId}', region: REGION },
  (event) => mirrorDocument(
    event, 'categories_public',
    ['Name', 'parent_c', 'description_c', 'status_c', 'sort_order_c'],
    (data) => data.status_c === 'Active',
  ),
);

exports.syncBranchPublic = onDocumentWritten(
  { document: 'branches/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return mirrorDocument(event, 'branches_public', [], () => false);
    const data = after.data();
    return mirrorDocument(
      event, 'branches_public',
      ['Name', 'business_c', 'address_c', 'district_c', 'city_c', 'phone_c', 'map_url_c', 'hours_c', 'photos_c'],
      (record) => record.status_c === 'Active',
      (safe, source) => ({ ...safe, business_c: referenceId(source.business_c) }),
    ).then(async () => {
      if (data.status_c === 'Active' && !(await parentBusinessIsPublic(data))) {
        await db.collection('branches_public').doc(event.params.docId).delete();
      }
    });
  },
);

exports.syncProductServicePublic = onDocumentWritten(
  { document: 'products_services/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return mirrorDocument(event, 'products_services_public', [], () => false);
    const data = after.data();
    if (data.status_c !== 'Active' || !(await parentBusinessIsPublic(data))) {
      await db.collection('products_services_public').doc(event.params.docId).delete();
      return;
    }
    await mirrorDocument(
      event, 'products_services_public',
      ['Name', 'business_c', 'item_type_c', 'price_type_c', 'price_c', 'price_to_c', 'image_c'],
      () => true,
      (safe, source) => ({ ...safe, business_c: referenceId(source.business_c) }),
    );
  },
);

exports.syncReviewPublic = onDocumentWritten(
  { document: 'reviews/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return mirrorDocument(event, 'reviews_public', [], () => false);
    const data = after.data();
    if (data.status_c !== 'Approved' || data.report_status_c === 'Hidden' || !(await parentBusinessIsPublic(data))) {
      await db.collection('reviews_public').doc(event.params.docId).delete();
      return;
    }
    await mirrorDocument(
      event, 'reviews_public',
      ['Name', 'business_c', 'customer_name_c', 'rating_c', 'title_c', 'review_c', 'owner_reply_c', 'CreatedOn'],
      () => true,
      (safe, source) => ({ ...safe, business_c: referenceId(source.business_c) }),
    );
  },
);

exports.syncOfferPublic = onDocumentWritten(
  { document: 'offers/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return mirrorDocument(event, 'offers_public', [], () => false);
    const data = after.data();
    if (data.status_c !== 'Approved' || !(await parentBusinessIsPublic(data))) {
      await db.collection('offers_public').doc(event.params.docId).delete();
      return;
    }
    await mirrorDocument(
      event, 'offers_public',
      ['Name', 'business_c', 'description_c', 'discount_c', 'start_date_c', 'end_date_c', 'is_homepage_featured_c'],
      () => true,
      (safe, source) => ({ ...safe, business_c: referenceId(source.business_c) }),
    );
  },
);

exports.syncHomepageBannerPublic = onDocumentWritten(
  { document: 'homepage_banners/{docId}', region: REGION },
  (event) => mirrorDocument(
    event, 'homepage_banners_public',
    ['Name', 'caption_c', 'image_c', 'link_url_c', 'sort_order_c'],
    (data) => data.status_c === 'Active',
  ),
);

const PUBLIC_SETTING_KEYS = new Set([
  'homepage_section_order', 'support_whatsapp', 'support_email',
  'logo_max_kb', 'cover_max_kb', 'gallery_max_kb', 'gallery_max_files',
  'product_image_max_kb', 'business_description_word_limit',
]);

exports.syncSiteSettingPublic = onDocumentWritten(
  { document: 'site_settings/{docId}', region: REGION },
  (event) => mirrorDocument(
    event, 'site_settings_public',
    ['setting_key_c', 'setting_value_c', 'setting_group_c'],
    (data) => PUBLIC_SETTING_KEYS.has(data.setting_key_c),
  ),
);

exports.syncContentPagePublic = onDocumentWritten(
  { document: 'content_pages/{docId}', region: REGION },
  (event) => mirrorDocument(
    event, 'content_pages_public',
    ['Name', 'slug_c', 'body_c', 'seo_title_c', 'meta_description_c'],
    (data) => data.status_c === 'Published',
  ),
);

exports.syncPremiumPlanPublic = onDocumentWritten(
  { document: 'premium_plans/{docId}', region: REGION },
  (event) => mirrorDocument(
    event, 'premium_plans_public',
    ['Name', 'duration_days_c', 'price_c', 'features_c'],
    (data) => ['Active', 'Approved'].includes(data.status_c),
  ),
);


async function updateRelatedMirrors(businessId, removeOnly = false) {
  const configs = [
    {
      source: 'branches', target: 'branches_public',
      fields: ['Name', 'business_c', 'address_c', 'district_c', 'city_c', 'phone_c', 'map_url_c', 'hours_c', 'photos_c'],
      publish: (data) => data.status_c === 'Active',
    },
    {
      source: 'products_services', target: 'products_services_public',
      fields: ['Name', 'business_c', 'item_type_c', 'price_type_c', 'price_c', 'price_to_c', 'image_c'],
      publish: (data) => data.status_c === 'Active',
    },
    {
      source: 'reviews', target: 'reviews_public',
      fields: ['Name', 'business_c', 'customer_name_c', 'rating_c', 'title_c', 'review_c', 'owner_reply_c', 'CreatedOn'],
      publish: (data) => data.status_c === 'Approved' && data.report_status_c !== 'Hidden',
    },
    {
      source: 'offers', target: 'offers_public',
      fields: ['Name', 'business_c', 'description_c', 'discount_c', 'start_date_c', 'end_date_c', 'is_homepage_featured_c'],
      publish: (data) => data.status_c === 'Approved',
    },
  ];

  for (const config of configs) {
    const snapshot = await db.collection(config.source).where('business_c', '==', businessId).get();
    for (const sourceDoc of snapshot.docs) {
      const targetRef = db.collection(config.target).doc(sourceDoc.id);
      const data = sourceDoc.data();
      if (removeOnly || !config.publish(data)) {
        await targetRef.delete();
      } else {
        const safe = pickFields(data, config.fields);
        safe.business_c = referenceId(data.business_c);
        safe.id = sourceDoc.id;
        await targetRef.set(safe);
      }
    }
  }
}

async function refreshRelatedPublicMirrors(businessId) {
  await updateRelatedMirrors(businessId, false);
}

async function removeRelatedPublicMirrors(businessId) {
  await updateRelatedMirrors(businessId, true);
}


exports.syncCouponPublic = onDocumentWritten(
  { document: 'coupons/{docId}', region: REGION },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return mirrorDocument(event, 'coupons_public', [], () => false);
    const data = after.data();
    if (data.status_c !== 'Approved' || !(await parentBusinessIsPublic(data))) {
      await db.collection('coupons_public').doc(event.params.docId).delete();
      return;
    }
    await mirrorDocument(
      event, 'coupons_public',
      ['Name', 'business_c', 'code_c', 'discount_c', 'valid_from_c', 'valid_to_c'],
      () => true,
      (safe, source) => ({ ...safe, business_c: referenceId(source.business_c) }),
    );
  },
);
