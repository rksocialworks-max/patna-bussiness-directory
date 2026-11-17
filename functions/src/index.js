const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

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
