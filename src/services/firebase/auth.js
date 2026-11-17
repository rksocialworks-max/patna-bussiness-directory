import {
  confirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

function requireAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to your environment.');
  }
  return auth;
}

export function subscribeToAuth(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return credential.user;
}

export async function signUp({ email, password, displayName }) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (displayName) await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireAuth(), email.trim());
}

export async function confirmUserPasswordReset(oobCode, newPassword) {
  if (!oobCode || typeof oobCode !== 'string') throw new Error('Password reset link is invalid or expired.');
  if (typeof newPassword !== 'string' || newPassword.length < 6) throw new Error('Password must contain at least 6 characters.');
  return confirmPasswordReset(requireAuth(), oobCode, newPassword);
}

export async function changeCurrentPassword(currentPassword, newPassword) {
  const activeAuth = requireAuth();
  const user = activeAuth.currentUser;
  if (!user || !user.email) throw new Error('Please sign in again before changing your password.');
  if (typeof currentPassword !== 'string' || !currentPassword) throw new Error('Enter your current password.');
  if (typeof newPassword !== 'string' || newPassword.length < 6) throw new Error('New password must contain at least 6 characters.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  return updatePassword(user, newPassword);
}

export async function signOutCurrentUser() {
  return signOut(requireAuth());
}
