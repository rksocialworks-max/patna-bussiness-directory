import { createPermissions } from '@/services/permissions';

export const PROFILES = {
  Admin_c: { label: 'Super Admin', isDefault: false, isPublic: false, canManageTeam: true, reportsTo: null },
  BusinessOwner_c: { label: 'Business Owner', isDefault: true, isPublic: false, canManageTeam: true, reportsTo: 'Admin_c' },
  BranchManager_c: { label: 'Branch Manager', isDefault: false, isPublic: false, canManageTeam: false, reportsTo: 'BusinessOwner_c' },
};

const ADMIN_TABLES = [
  'businesses_c', 'branches_c', 'products_services_c', 'enquiries_c', 'reviews_c',
  'offers_c', 'coupons_c', 'premium_plans_c', 'payments_c', 'advertisements_c',
  'reports_c', 'categories_c', 'notifications_c', 'support_requests_c',
  'business_documents_c', 'branch_activity_c', 'privacy_requests_c',
  'business_analytics_c', 'site_settings_c', 'content_pages_c', 'homepage_banners_c',
];

const TABLE_PERMISSIONS = {
  Admin_c: Object.fromEntries(ADMIN_TABLES.map((table) => [table, { access: 'Full' }])),
  BusinessOwner_c: {
    businesses_c: { access: 'Read,Create,Update' },
    branches_c: { access: 'Read,Create,Update' },
    products_services_c: { access: 'Read,Create,Update,Delete' },
    enquiries_c: { access: 'Read,Update,Delete' },
    reviews_c: { access: 'Read,Update,Delete' },
    offers_c: { access: 'Read,Create,Update' },
    coupons_c: { access: 'Read,Create,Update' },
    premium_plans_c: { access: 'Read' },
    payments_c: { access: 'Read,Create' },
    advertisements_c: { access: 'Read,Create,Update' },
    categories_c: { access: 'Read,Create' },
    notifications_c: { access: 'Read,Update' },
    support_requests_c: { access: 'Read,Create' },
    business_documents_c: { access: 'Read,Create' },
    branch_activity_c: { access: 'Read' },
    privacy_requests_c: { access: 'Read,Create' },
    business_analytics_c: { access: 'Read,Delete' },
    content_pages_c: { access: 'Read' },
    site_settings_c: { access: 'Read' },
  },
  BranchManager_c: {
    branches_c: { access: 'Read,Update' },
    enquiries_c: { access: 'Read,Update' },
  },
};

export const { getProfileMeta, getTableAccess, getFieldAccess } = createPermissions(PROFILES, TABLE_PERMISSIONS);
