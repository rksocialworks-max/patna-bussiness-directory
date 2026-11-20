import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp, isFirebaseConfigured } from '@/lib/firebase';

function requireFunctions() {
  if (!isFirebaseConfigured || !firebaseApp) {
    throw new Error('Firebase is not configured.');
  }
  return getFunctions(firebaseApp, 'asia-south1');
}

/**
 * Assign a limited managed role to an existing Firebase Auth account.
 * The backend enforces the Super Admin custom claim and allowed role list.
 */
export async function assignManagedRole({ uid, role }) {
  if (!uid || typeof uid !== 'string') throw new Error('A valid user ID is required.');
  if (!['BusinessOwner_c', 'BranchManager_c'].includes(role)) {
    throw new Error('Only Business Owner and Branch Manager roles can be assigned here.');
  }
  const callable = httpsCallable(requireFunctions(), 'assignManagedRole');
  const result = await callable({ uid, role });
  return result.data;
}

/** Fetch one page of user account metadata. Backend requires superAdmin=true. */
export async function listManagedUsers({ pageToken } = {}) {
  const callable = httpsCallable(requireFunctions(), 'listManagedUsers');
  const result = await callable(pageToken ? { pageToken } : {});
  return result.data;
}


export async function submitPublicReview(payload) {
  const callable = httpsCallable(requireFunctions(), 'submitPublicReview');
  const result = await callable(payload);
  return result.data;
}

export async function submitPublicEnquiry(payload) {
  const callable = httpsCallable(requireFunctions(), 'submitPublicEnquiry');
  const result = await callable(payload);
  return result.data;
}

export async function submitBusinessReport(payload) {
  const callable = httpsCallable(requireFunctions(), 'submitBusinessReport');
  const result = await callable(payload);
  return result.data;
}


/**
 * Rebuild the public read-only directory mirrors from existing Firestore records.
 * The callable enforces the Super Admin custom claim on the server.
 */
export async function backfillPublicDirectory() {
  const callable = httpsCallable(requireFunctions(), 'backfillPublicDirectory');
  const result = await callable({});
  return result.data;
}


/** Return branch IDs assigned to the signed-in Branch Manager. */
export async function getManagedBranches() {
  const callable = httpsCallable(requireFunctions(), 'getManagedBranches');
  const result = await callable({});
  return result.data.branchIds || [];
}


/** Return only eligible branch manager accounts for branch assignment. */
export async function listBranchManagers() {
  const callable = httpsCallable(requireFunctions(), 'listBranchManagers');
  const result = await callable({});
  return result.data.users || [];
}


/** Create a server-priced Razorpay order for an owned, approved business. */
export async function createPremiumPaymentOrder({ businessId, planId }) {
  const callable = httpsCallable(requireFunctions(), 'createPremiumPaymentOrder');
  const result = await callable({ businessId, planId });
  return result.data;
}

/** Verify Razorpay's callback on the trusted Firebase backend. */
export async function verifyPremiumPayment(payload) {
  const callable = httpsCallable(requireFunctions(), 'verifyPremiumPayment');
  const result = await callable(payload);
  return result.data;
}

/** Submit a UPI reference for manual Admin verification. */
export async function submitManualPremiumPayment({ businessId, planId, utr }) {
  const callable = httpsCallable(requireFunctions(), 'submitManualPremiumPayment');
  const result = await callable({ businessId, planId, utr });
  return result.data;
}

/** Admin-only approval for a pending manual UPI payment. */
export async function approveManualPremiumPayment({ paymentId }) {
  const callable = httpsCallable(requireFunctions(), 'approveManualPremiumPayment');
  const result = await callable({ paymentId });
  return result.data;
}


/** Admin-only rejection for a manual UPI payment that could not be verified. */
export async function rejectManualPremiumPayment({ paymentId, reason }) {
  const callable = httpsCallable(requireFunctions(), 'rejectManualPremiumPayment');
  const result = await callable({ paymentId, reason });
  return result.data;
}
