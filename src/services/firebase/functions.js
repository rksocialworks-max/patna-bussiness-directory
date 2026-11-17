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
