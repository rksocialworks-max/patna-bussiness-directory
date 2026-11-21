import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingEnv = requiredEnv.filter((key) => !import.meta.env[key]);

export const isFirebaseConfigured = missingEnv.length === 0;
export const missingFirebaseEnv = missingEnv;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // Firebase Storage bucket is now enabled for this project.
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'patnabiz-b2fcb.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

// Use Firestore long-polling auto-detection to support networks/proxies that
// interfere with the default transport. This is especially important for role
// lookups during Owner/Manager sign-in, which need a Firestore read.
export const db = firebaseApp
  ? initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true })
  : null;

// Initialize Storage only when a bucket is explicitly configured. This keeps
// uploads unavailable on deployments that have not enabled/configured Storage.
export const storage = firebaseApp && firebaseConfig.storageBucket
  ? getStorage(firebaseApp)
  : null;

// Firebase App Check uses the reCAPTCHA Enterprise site key registered for this Web App.
// Leave the key unset until it is configured in the hosting environment.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
export const appCheck = firebaseApp && appCheckSiteKey
  ? initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;
