import {
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
  return onAuthStateChanged(requireAuth(), callback);
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

export async function signOutCurrentUser() {
  return signOut(requireAuth());
}
