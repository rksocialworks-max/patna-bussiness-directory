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
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';

// Compatibility facade for older screens. All data now uses Firebase Firestore.
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

const OWNER_RELATION_TABLES = new Set([
  'branches_c', 'products_services_c', 'enquiries_c', 'reviews_c',
  'offers_c', 'coupons_c', 'payments_c', 'advertisements_c',
  'business_documents_c', 'business_analytics_c',
]);

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

function timestampValue(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getCallerScope() {
  const user = auth?.currentUser;
  if (!user) return { role: '', uid: '', businessIds: [], branchIds: [] };
  const token = await user.getIdTokenResult();
  const claims = token.claims || {};
  const role = claims.role || claims.profile || '';
  if (role === 'Admin_c' || claims.superAdmin === true) {
    return { role: 'Admin_c', uid: user.uid, businessIds: [], branchIds: [] };
  }

  const database = requireDb();
  if (role === 'BusinessOwner_c') {
    const owned = await getDocs(query(
      collection(database, 'businesses'),
      where('ownerUid', '==', user.uid),
      firestoreLimit(100),
    ));
    const businessIds = owned.docs.map((item) => item.id);
    let branchIds = [];
    for (const group of chunks(businessIds, 30)) {
      if (!group.length) continue;
      const snapshot = await getDocs(query(
        collection(database, 'branches'),
        where('business_c', 'in', group),
        firestoreLimit(100),
      ));
      branchIds.push(...snapshot.docs.map((item) => item.id));
    }
    return { role, uid: user.uid, businessIds, branchIds };
  }

  if (role === 'BranchManager_c') {
    const assigned = await getDocs(query(
      collection(database, 'branches'),
      where('manager_c', 'array-contains', { User: user.uid }),
      firestoreLimit(100),
    ));
    const branches = assigned.docs.map((item) => ({ id: item.id, ...item.data() }));
    return {
      role,
      uid: user.uid,
      businessIds: [],
      branchIds: branches.map((item) => item.id),
    };
  }

  return { role, uid: user.uid, businessIds: [], branchIds: [] };
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

// Collections that have a server-maintained, curated public mirror.
// Never expose private source collections to anonymous visitors.
const PUBLIC_READ_COLLECTIONS = Object.freeze({
  businesses_c: 'business_public',
  categories_c: 'categories_public',
  branches_c: 'branches_public',
  products_services_c: 'products_services_public',
  reviews_c: 'reviews_public',
  offers_c: 'offers_public',
  coupons_c: 'coupons_public',
  premium_plans_c: 'premium_plans_public',
  site_settings_c: 'site_settings_public',
  content_pages_c: 'content_pages_public',
  homepage_banners_c: 'homepage_banners_public',
});

function mapReadCollection(tableName, role) {
  if (role === 'Admin_c') return TABLES[tableName];

  // Owners and branch managers need private source records for their own
  // dashboards. Other public-facing tables can safely use curated mirrors.
  if (role === 'BusinessOwner_c' && ['businesses_c', 'branches_c', ...OWNER_RELATION_TABLES].includes(tableName)) {
    return TABLES[tableName];
  }
  if (role === 'BranchManager_c' && ['branches_c', 'enquiries_c', 'branch_activity_c'].includes(tableName)) {
    return TABLES[tableName];
  }

  return PUBLIC_READ_COLLECTIONS[tableName] || null;
}

function makeTable(tableName) {
  if (!TABLES[tableName]) throw new Error(`Unsupported data collection: ${tableName}`);

  let filters = [];
  let sort = null;
  let maxRows = 100;
  let offsetRows = 0;

  const builder = {
    select(_fields) { return builder; },
    where(condition, operator, value) {
      if (typeof condition === 'string') {
        filters.push({ field: condition, op: operator || '==', value });
      } else if (condition && typeof condition.field === 'string') {
        filters.push({ field: condition.field, op: condition.op || condition.operator || '==', value: condition.value });
      }
      return builder;
    },
    orderByDesc(field) { sort = { field, direction: 'desc' }; return builder; },
    orderByAsc(field) { sort = { field, direction: 'asc' }; return builder; },
    limit(count) { maxRows = Math.min(Math.max(Number(count) || 100, 1), 100); return builder; },
    page(pageNumber = 1, pageSize = 20) {
      maxRows = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
      offsetRows = Math.max(0, (Math.max(1, Number(pageNumber) || 1) - 1) * maxRows);
      return builder;
    },

    async fetch() {
      const database = requireDb();
      const scope = await getCallerScope();
      const sourceName = mapReadCollection(tableName, scope.role);
      if (!sourceName) return { success: true, data: [], messages: [] };
      const baseRef = collection(database, sourceName);
      const serverFilters = filters.filter(({ op }) => op !== 'contains');
      const localFilters = filters.filter(({ op }) => op === 'contains');
      const constraints = serverFilters.map(({ field, op, value }) => where(field, op, value));
      let snapshots = [];

      if (scope.role === 'Admin_c') {
        if (sort?.field) constraints.push(orderBy(sort.field, sort.direction));
        constraints.push(firestoreLimit(maxRows));
        const snapshot = await getDocs(query(baseRef, ...constraints));
        snapshots = snapshot.docs;
      } else if (tableName === 'businesses_c' && scope.role === 'BusinessOwner_c') {
        const snapshot = await getDocs(query(
          baseRef,
          where('ownerUid', '==', scope.uid),
          ...constraints,
          firestoreLimit(maxRows),
        ));
        snapshots = snapshot.docs;
      } else if (OWNER_RELATION_TABLES.has(tableName) && scope.role === 'BusinessOwner_c') {
        for (const group of chunks(scope.businessIds, 30)) {
          if (!group.length) continue;
          const snapshot = await getDocs(query(
            baseRef,
            where('business_c', 'in', group),
            ...constraints,
            firestoreLimit(maxRows),
          ));
          snapshots.push(...snapshot.docs);
        }
      } else if (tableName === 'branch_activity_c' && scope.role === 'BusinessOwner_c') {
        for (const group of chunks(scope.branchIds, 30)) {
          if (!group.length) continue;
          const snapshot = await getDocs(query(
            baseRef,
            where('branch_c', 'in', group),
            ...constraints,
            firestoreLimit(maxRows),
          ));
          snapshots.push(...snapshot.docs);
        }
      } else if (['notifications_c', 'support_requests_c', 'privacy_requests_c'].includes(tableName)
        && scope.role === 'BusinessOwner_c') {
        const snapshot = await getDocs(query(
          baseRef,
          where('ownerUid', '==', scope.uid),
          ...constraints,
          firestoreLimit(maxRows),
        ));
        snapshots = snapshot.docs;
      } else if (tableName === 'branches_c' && scope.role === 'BranchManager_c') {
        for (const group of chunks(scope.branchIds, 30)) {
          if (!group.length) continue;
          const snapshot = await getDocs(query(
            baseRef,
            where('__name__', 'in', group),
            ...constraints,
            firestoreLimit(maxRows),
          ));
          snapshots.push(...snapshot.docs);
        }
      } else if (['enquiries_c', 'branch_activity_c'].includes(tableName) && scope.role === 'BranchManager_c') {
        const field = 'branch_c';
        for (const group of chunks(scope.branchIds, 30)) {
          if (!group.length) continue;
          const snapshot = await getDocs(query(
            baseRef,
            where(field, 'in', group),
            ...constraints,
            firestoreLimit(maxRows),
          ));
          snapshots.push(...snapshot.docs);
        }
      } else if (PUBLIC_READ_COLLECTIONS[tableName] && (
        !scope.uid || scope.role === 'Customer_c' ||
        (scope.role === 'BusinessOwner_c' && !OWNER_RELATION_TABLES.has(tableName) && !['businesses_c', 'branches_c'].includes(tableName)) ||
        (scope.role === 'BranchManager_c' && !['branches_c', 'enquiries_c', 'branch_activity_c'].includes(tableName))
      )) {
        // Public pages (including signed-out visitors) read only curated
        // server-generated mirrors. Firestore rules independently enforce
        // read-only access to these mirror collections.
        if (sort?.field) constraints.push(orderBy(sort.field, sort.direction));
        constraints.push(firestoreLimit(maxRows));
        const snapshot = await getDocs(query(baseRef, ...constraints));
        snapshots = snapshot.docs;
      } else {
        return { success: true, data: [], messages: [] };
      }

      const unique = new Map(snapshots.map((item) => [item.id, item]));
      const data = [...unique.values()].map((item) => ({ id: item.id, Id: item.id, ...item.data() }));
      if (sort?.field) {
        data.sort((a, b) => {
          const delta = timestampValue(a[sort.field]) - timestampValue(b[sort.field]);
          return sort.direction === 'desc' ? -delta : delta;
        });
      }
      const searched = data.filter((row) => localFilters.every(({ field, value }) => String(row[field] ?? '').toLocaleLowerCase().includes(String(value ?? '').toLocaleLowerCase())));
      return { success: true, data: searched.slice(offsetRows, offsetRows + maxRows), messages: [] };
    },

    async get(id) {
      const scope = await getCallerScope();
      const collectionName = mapReadCollection(tableName, scope.role);
      if (!collectionName) return { success: true, data: null, messages: [] };
      const snapshot = await getDoc(doc(collection(requireDb(), collectionName), id));
      return { success: true, data: normalize(snapshot), messages: [] };
    },

    async create(record) {
      const database = requireDb();
      const scope = await getCallerScope();
      const payload = clean(record);
      if (scope.role === 'BusinessOwner_c') {
        if (['payments_c', 'support_requests_c', 'privacy_requests_c', 'notifications_c'].includes(tableName)) {
          payload.ownerUid = scope.uid;
        }
        if (tableName === 'branch_activity_c' && payload.branch_c) {
          const branch = await getDoc(doc(collection(database, 'branches'), String(payload.branch_c)));
          if (branch.exists()) payload.business_c = branch.data().business_c;
        }
      }
      const now = serverTimestamp();
      const created = await addDoc(collection(database, TABLES[tableName]), {
        ...payload,
        CreatedOn: now,
        ModifiedOn: now,
      });
      const saved = await getDoc(created);
      return { success: true, data: [normalize(saved)], messages: [] };
    },

    async update(record) {
      const id = record?.Id || record?.id;
      if (!id) throw new Error('A record ID is required for updates.');
      const payload = clean(record);
      await updateDoc(doc(collection(requireDb(), TABLES[tableName]), id), {
        ...payload,
        ModifiedOn: serverTimestamp(),
      });
      const saved = await getDoc(doc(collection(requireDb(), TABLES[tableName]), id));
      return { success: true, data: saved.exists() ? [normalize(saved)] : [], messages: [] };
    },

    async remove(id) {
      if (!id) throw new Error('A record ID is required for deletion.');
      await deleteDoc(doc(collection(requireDb(), TABLES[tableName]), id));
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
