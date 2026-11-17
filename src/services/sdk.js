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

// Compatibility facade for legacy screens that still call sdk.table(...).
// All reads and writes go directly to Firestore; no Apper runtime is required.
const TABLES = Object.freeze({
  businesses_c: 'businesses',
  branches_c: 'branches',
  products_services_c: 'products_services',
  enquiries_c: 'enquiries',
  reviews_c: 'reviews',
  offers_c: 'offers',
  coupons_c: 'coupons',
  premium_plans_c: 'premium_plans',
  payments_c: 'payments',
  advertisements_c: 'advertisements',
  reports_c: 'reports',
  categories_c: 'categories',
  business_documents_c: 'business_documents',
  support_requests_c: 'support_requests',
  privacy_requests_c: 'privacy_requests',
  notifications_c: 'notifications',
  branch_activity_c: 'branch_activity',
  business_analytics_c: 'business_analytics',
  site_settings_c: 'site_settings',
  content_pages_c: 'content_pages',
  homepage_banners_c: 'homepage_banners',
  users_c: 'users',
});

function requireDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* environment variables.');
  }
  return db;
}

function normalize(snapshot) {
  return snapshot.exists()
    ? { id: snapshot.id, Id: snapshot.id, ...snapshot.data() }
    : null;
}

function clean(record = {}) {
  const { Id, id, Owner, ...fields } = record;
  return fields;
}

function makeTable(tableName) {
  const collectionName = TABLES[tableName];
  if (!collectionName) throw new Error(`Unsupported data collection: ${tableName}`);

  let filters = [];
  let sort = null;
  let maxRows = 100;

  const builder = {
    select(_fields) {
      return builder;
    },
    where(condition, operator, value) {
      if (typeof condition === 'string') {
        filters.push({ field: condition, op: operator || '==', value });
      } else if (condition && typeof condition.field === 'string') {
        filters.push({
          field: condition.field,
          op: condition.op || condition.operator || '==',
          value: condition.value,
        });
      }
      return builder;
    },
    orderByDesc(field) {
      sort = { field, direction: 'desc' };
      return builder;
    },
    orderByAsc(field) {
      sort = { field, direction: 'asc' };
      return builder;
    },
    limit(count) {
      maxRows = Math.min(Math.max(Number(count) || 100, 1), 100);
      return builder;
    },
    async fetch() {
      const constraints = filters.map(({ field, op, value }) => where(field, op, value));
      if (sort?.field) constraints.push(orderBy(sort.field, sort.direction));
      constraints.push(firestoreLimit(maxRows));
      const snapshot = await getDocs(query(collection(requireDb(), collectionName), ...constraints));
      return {
        success: true,
        data: snapshot.docs.map((item) => ({ id: item.id, Id: item.id, ...item.data() })),
        messages: [],
      };
    },
    async get(id) {
      const snapshot = await getDoc(doc(collection(requireDb(), collectionName), id));
      return { success: true, data: normalize(snapshot), messages: [] };
    },
    async create(record) {
      const now = serverTimestamp();
      const created = await addDoc(collection(requireDb(), collectionName), {
        ...clean(record),
        CreatedOn: now,
        ModifiedOn: now,
      });
      const saved = await getDoc(created);
      return { success: true, data: [normalize(saved)], messages: [] };
    },
    async update(record) {
      const id = record?.Id || record?.id;
      if (!id) throw new Error('A record ID is required for updates.');
      await updateDoc(doc(collection(requireDb(), collectionName), id), {
        ...clean(record),
        ModifiedOn: serverTimestamp(),
      });
      const saved = await getDoc(doc(collection(requireDb(), collectionName), id));
      return { success: true, data: saved.exists() ? [normalize(saved)] : [], messages: [] };
    },
    async remove(id) {
      if (!id) throw new Error('A record ID is required for deletion.');
      await deleteDoc(doc(collection(requireDb(), collectionName), id));
      return { success: true, data: [{ Id: id }], messages: [] };
    },
  };

  return builder;
}

export const sdk = Object.freeze({
  table: makeTable,
  storage: Object.freeze({
    toCreateFormat: (files) => Array.isArray(files) ? files : [],
    toUpdateFormat: (files) => Array.isArray(files) ? files : [],
  }),
});
