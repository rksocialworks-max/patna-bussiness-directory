const { createHash } = require('crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

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
    // Legacy records may store a reference as either a string ID or { Id, Name }.
    // Read and normalize before matching so either representation is kept in sync.
    const snapshot = await db.collection(config.source).get();
    for (const sourceDoc of snapshot.docs) {
      const data = sourceDoc.data();
      if (referenceId(data.business_c) !== businessId) continue;
      const targetRef = db.collection(config.target).doc(sourceDoc.id);
      if (removeOnly || !config.publish(data)) {
        await targetRef.delete();
      } else {
        const safe = pickFields(data, config.fields);
        safe.business_c = businessId;
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


function validateCustomerSubmission(data, maxMessageLength = 2000) {
  const customerName = typeof data?.customerName === 'string' ? data.customerName.trim() : '';
  const mobile = typeof data?.mobile === 'string' ? data.mobile.replace(/\\D/g, '') : '';
  const message = typeof data?.message === 'string' ? data.message.trim() : '';
  if (customerName.length < 2 || customerName.length > 80) {
    throw new HttpsError('invalid-argument', 'Enter a valid customer name.');
  }
  if (!/^\\d{10}$/.test(mobile)) {
    throw new HttpsError('invalid-argument', 'Enter a valid 10-digit mobile number.');
  }
  if (!message || message.length > maxMessageLength) {
    throw new HttpsError('invalid-argument', 'Enter a message within the allowed length.');
  }
  return { customerName, mobile, message };
}

async function requirePublicBusiness(businessId) {
  if (typeof businessId !== 'string' || !businessId.trim() || businessId.length > 128) {
    throw new HttpsError('invalid-argument', 'A valid business ID is required.');
  }
  const publicBusiness = await db.collection('business_public').doc(businessId).get();
  if (!publicBusiness.exists) {
    throw new HttpsError('not-found', 'This business listing is not publicly available.');
  }
  return publicBusiness;
}

exports.submitPublicReview = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    const { customerName, mobile, message } = validateCustomerSubmission(request.data, 1500);
    const businessId = request.data?.businessId;
    const business = await requirePublicBusiness(businessId);
    const rating = Number(request.data?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError('invalid-argument', 'Rating must be a whole number from 1 to 5.');
    }
    const title = typeof request.data?.title === 'string' ? request.data.title.trim().slice(0, 120) : '';
    const reviewId = createHash('sha256').update(businessId + ':' + mobile).digest('hex');
    const reviewRef = db.collection('reviews').doc(reviewId);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(reviewRef);
      if (existing.exists) {
        throw new HttpsError('already-exists', 'A review from this mobile number already exists for this business.');
      }
      transaction.create(reviewRef, {
        Name: title || 'Customer review for ' + (business.data().Name || 'business'),
        business_c: businessId,
        customer_name_c: customerName,
        mobile_c: mobile,
        rating_c: rating,
        title_c: title,
        review_c: message,
        status_c: 'Pending',
        report_status_c: 'None',
        CreatedOn: FieldValue.serverTimestamp(),
        ModifiedOn: FieldValue.serverTimestamp(),
      });
    });
    return { success: true, status: 'Pending' };
  },
);

exports.submitPublicEnquiry = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    const { customerName, mobile, message } = validateCustomerSubmission(request.data, 2000);
    const businessId = request.data?.businessId;
    await requirePublicBusiness(businessId);
    const privateBusiness = await db.collection('businesses').doc(businessId).get();
    if (!privateBusiness.exists || privateBusiness.data().status_c !== 'Approved') {
      throw new HttpsError('not-found', 'This business listing is no longer available.');
    }

    let branchId = null;
    if (request.data?.branchId) {
      branchId = String(request.data.branchId);
      const branch = await db.collection('branches_public').doc(branchId).get();
      if (!branch.exists || branch.data().business_c !== businessId) {
        throw new HttpsError('invalid-argument', 'The selected branch does not belong to this business.');
      }
    }

    const enquiry = {
      Name: 'Enquiry from ' + customerName,
      business_c: businessId,
      ownerUid: privateBusiness.data().ownerUid || null,
      customer_name_c: customerName,
      mobile_c: mobile,
      message_c: message,
      source_c: 'Form',
      branch_c: branchId,
      status_c: 'New',
      CreatedOn: FieldValue.serverTimestamp(),
      ModifiedOn: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('enquiries').add(enquiry);
    return { success: true, enquiryId: ref.id };
  },
);

exports.submitBusinessReport = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    const businessId = request.data?.businessId;
    const business = await requirePublicBusiness(businessId);
    const allowedReasons = new Set(['Incorrect Info', 'Spam', 'Closed', 'Other']);
    const reason = typeof request.data?.reason === 'string' ? request.data.reason : '';
    const description = typeof request.data?.description === 'string' ? request.data.description.trim() : '';
    if (!allowedReasons.has(reason) || description.length < 5 || description.length > 1500) {
      throw new HttpsError('invalid-argument', 'Select a report reason and enter a short description.');
    }
    const ref = await db.collection('reports').add({
      Name: 'Report: ' + (business.data().Name || 'Business listing'),
      business_c: businessId,
      reason_c: reason,
      description_c: description,
      status_c: 'New',
      CreatedOn: FieldValue.serverTimestamp(),
      ModifiedOn: FieldValue.serverTimestamp(),
    });
    return { success: true, reportId: ref.id };
  },
);

exports.cleanupOldEnquiries = onSchedule(
  { schedule: 'every day 03:00', timeZone: 'Asia/Kolkata', region: REGION },
  async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let deleted = 0;
    while (true) {
      const page = await db.collection('enquiries')
        .where('CreatedOn', '<', cutoff)
        .limit(400)
        .get();
      if (page.empty) break;
      const batch = db.batch();
      page.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
      deleted += page.size;
      if (page.size < 400) break;
    }
    return { deleted };
  },
);


// One-time repair for data that was already in Firestore before mirror triggers
// were installed. Only the Super Admin can run this operation.
async function replacePublicMirror(sourceName, targetName, project) {
  const sourceSnapshot = await db.collection(sourceName).get();
  const publishedIds = new Set();
  const operations = [];

  for (const sourceDoc of sourceSnapshot.docs) {
    const record = project(sourceDoc.id, sourceDoc.data());
    if (!record) continue;
    publishedIds.add(sourceDoc.id);
    operations.push({
      type: 'set',
      ref: db.collection(targetName).doc(sourceDoc.id),
      data: { id: sourceDoc.id, ...record },
    });
  }

  const currentPublic = await db.collection(targetName).get();
  for (const publicDoc of currentPublic.docs) {
    if (!publishedIds.has(publicDoc.id)) {
      operations.push({ type: 'delete', ref: publicDoc.ref });
    }
  }

  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(index, index + 400)) {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data);
    }
    await batch.commit();
  }

  return { scanned: sourceSnapshot.size, published: publishedIds.size };
}

exports.backfillPublicDirectory = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    if (!request.auth || request.auth.token.superAdmin !== true) {
      throw new HttpsError('permission-denied', 'Only the Super Admin can rebuild public directory data.');
    }

    const businessResult = await replacePublicMirror(
      'businesses',
      'business_public',
      (_id, source) => {
        if (source.status_c !== 'Approved') return null;
        const safe = pickFields(source, BUSINESS_PUBLIC_FIELDS);
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

    const publicBusinessIds = new Set(
      (await db.collection('business_public').get()).docs.map((document) => document.id),
    );
    const childIsPublic = (source) => {
      const businessId = referenceId(source.business_c);
      return Boolean(businessId && publicBusinessIds.has(businessId));
    };
    const relation = (source) => ({ business_c: referenceId(source.business_c) });

    const results = {};
    results.categories = await replacePublicMirror(
      'categories', 'categories_public',
      (_id, source) => source.status_c === 'Active'
        ? pickFields(source, ['Name', 'parent_c', 'description_c', 'status_c', 'sort_order_c'])
        : null,
    );
    results.branches = await replacePublicMirror(
      'branches', 'branches_public',
      (_id, source) => source.status_c === 'Active' && childIsPublic(source)
        ? { ...pickFields(source, ['Name', 'address_c', 'district_c', 'city_c', 'phone_c', 'map_url_c', 'hours_c', 'photos_c']), ...relation(source) }
        : null,
    );
    results.productsServices = await replacePublicMirror(
      'products_services', 'products_services_public',
      (_id, source) => source.status_c === 'Active' && childIsPublic(source)
        ? { ...pickFields(source, ['Name', 'item_type_c', 'price_type_c', 'price_c', 'price_to_c', 'image_c']), ...relation(source) }
        : null,
    );
    results.reviews = await replacePublicMirror(
      'reviews', 'reviews_public',
      (_id, source) => source.status_c === 'Approved' && source.report_status_c !== 'Hidden' && childIsPublic(source)
        ? { ...pickFields(source, ['Name', 'customer_name_c', 'rating_c', 'title_c', 'review_c', 'owner_reply_c', 'CreatedOn']), ...relation(source) }
        : null,
    );
    results.offers = await replacePublicMirror(
      'offers', 'offers_public',
      (_id, source) => source.status_c === 'Approved' && childIsPublic(source)
        ? { ...pickFields(source, ['Name', 'description_c', 'discount_c', 'start_date_c', 'end_date_c', 'is_homepage_featured_c']), ...relation(source) }
        : null,
    );
    results.coupons = await replacePublicMirror(
      'coupons', 'coupons_public',
      (_id, source) => source.status_c === 'Approved' && childIsPublic(source)
        ? { ...pickFields(source, ['Name', 'code_c', 'discount_c', 'valid_from_c', 'valid_to_c']), ...relation(source) }
        : null,
    );
    results.banners = await replacePublicMirror(
      'homepage_banners', 'homepage_banners_public',
      (_id, source) => source.status_c === 'Active'
        ? pickFields(source, ['Name', 'caption_c', 'image_c', 'link_url_c', 'sort_order_c'])
        : null,
    );
    results.siteSettings = await replacePublicMirror(
      'site_settings', 'site_settings_public',
      (_id, source) => PUBLIC_SETTING_KEYS.has(source.setting_key_c)
        ? pickFields(source, ['setting_key_c', 'setting_value_c', 'setting_group_c'])
        : null,
    );
    results.contentPages = await replacePublicMirror(
      'content_pages', 'content_pages_public',
      (_id, source) => source.status_c === 'Published'
        ? pickFields(source, ['Name', 'slug_c', 'body_c', 'seo_title_c', 'meta_description_c'])
        : null,
    );
    results.premiumPlans = await replacePublicMirror(
      'premium_plans', 'premium_plans_public',
      (_id, source) => ['Active', 'Approved'].includes(source.status_c)
        ? pickFields(source, ['Name', 'duration_days_c', 'price_c', 'features_c'])
        : null,
    );

    return { success: true, results };
  },
);
