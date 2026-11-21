import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

// Keep the legacy-to-Firestore mapping explicit. Never accept arbitrary collection names
// from URL parameters or user input. Firestore Security Rules remain the real access boundary.
export const COLLECTIONS = Object.freeze({
  users: 'users',
  businesses: 'businesses',
  businessPublic: 'business_public',
  categories: 'categories',
  categoriesPublic: 'categories_public',
  branches: 'branches',
  branchesPublic: 'branches_public',
  productsServices: 'products_services',
  productsServicesPublic: 'products_services_public',
  reviews: 'reviews',
  reviewsPublic: 'reviews_public',
  enquiries: 'enquiries',
  businessDocuments: 'business_documents',
  businessAnalytics: 'business_analytics',
  branchActivity: 'branch_activity',
  premiumPlans: 'premium_plans',
  premiumPlansPublic: 'premium_plans_public',
  payments: 'payments',
  offers: 'offers',
  offersPublic: 'offers_public',
  couponsPublic: 'coupons_public',
  coupons: 'coupons',
  advertisements: 'advertisements',
  homepageBanners: 'homepage_banners',
  homepageBannersPublic: 'homepage_banners_public',
  notifications: 'notifications',
  contentPages: 'content_pages',
  contentPagesPublic: 'content_pages_public',
  siteSettings: 'site_settings',
  siteSettingsPublic: 'site_settings_public',
  supportRequests: 'support_requests',
  reports: 'reports',
  privacyRequests: 'privacy_requests',
});

function requireDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* environment variables.');
  }
  return db;
}

function collectionRef(name) {
  if (!Object.values(COLLECTIONS).includes(name)) {
    throw new Error(`Unsupported Firestore collection: ${name}`);
  }
  return collection(requireDb(), name);
}

function cleanData(data) {
  const { id, ...fields } = data ?? {};
  return fields;
}

export async function getDocument(collectionName, id) {
  const snapshot = await getDoc(doc(collectionRef(collectionName), id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function listDocuments(collectionName, options = {}) {
  const { filters = [], sort, direction = 'asc', pageSize = 50 } = options;
  const constraints = filters.map(({ field, op = '==', value }) => where(field, op, value));
  if (sort) constraints.push(orderBy(sort, direction));
  constraints.push(firestoreLimit(Math.min(Math.max(Number(pageSize) || 50, 1), 100)));
  const snapshot = await getDocs(query(collectionRef(collectionName), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createDocument(collectionName, data) {
  const now = serverTimestamp();
  const ref = await addDoc(collectionRef(collectionName), {
    ...cleanData(data),
    CreatedOn: now,
    ModifiedOn: now,
  });
  return getDocument(collectionName, ref.id);
}

export async function updateDocument(collectionName, id, data, options = {}) {
  await updateDoc(doc(collectionRef(collectionName), id), {
    ...cleanData(data),
    ModifiedOn: serverTimestamp(),
  });
  // Avoid a redundant read after a successful write when the caller only needs
  // confirmation. This prevents saves from waiting on a separate read request.
  if (options.skipRead) return { id };
  return getDocument(collectionName, id);
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(collectionRef(collectionName), id));
}
