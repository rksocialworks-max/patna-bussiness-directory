import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { approveManualPremiumPayment } from '@/services/firebase/functions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ApperIcon from '@/components/ApperIcon';
import { toPeopleWrite } from '@/components/PeoplePicker';
import BranchManagerPicker from '@/components/BranchManagerPicker';
import FilePicker from '@/components/FilePicker';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
const eq = (field, value) => ({ field, op: '==', value });

const CONFIG = [
  { key: 'branches_c', label: 'Branches', icon: 'Building2', title: 'Branch Management', fields: [
    { key: 'business_c', label: 'Main Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Branch Name', type: 'Text' },
    { key: 'address_c', label: 'Branch Address', type: 'Text' },
    { key: 'district_c', label: 'District', type: 'Text' },
    { key: 'city_c', label: 'City', type: 'Text' },
    { key: 'phone_c', label: 'Branch Phone', type: 'Text' },
    { key: 'map_url_c', label: 'Google Maps URL', type: 'Text' },
    { key: 'hours_c', label: 'Branch Business Hours', type: 'MultilineText' },
    { key: 'photos_c', label: 'Branch Photos', type: 'Files' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Active', 'Inactive'] },
    { key: 'manager_c', label: 'Assigned Branch Manager', type: 'People' },
  ], status: 'status_c' },
  { key: 'products_services_c', label: 'Products & Services', icon: 'Package', title: 'Products & Services', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Product / Service Name', type: 'Text' },
    { key: 'image_c', label: 'Product / Service Image', type: 'Files' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Active', 'Inactive'] },
  ], status: 'status_c' },
  { key: 'enquiries_c', label: 'Enquiries', icon: 'MessageSquare', title: 'Customer Enquiries', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'branch_c', label: 'Assigned Branch', type: 'Lookup', lookup: 'branches_c' },
    { key: 'Name', label: 'Enquiry Subject', type: 'Text' },
    { key: 'customer_name_c', label: 'Customer Name', type: 'Text' },
    { key: 'mobile_c', label: 'Mobile Number', type: 'Text' },
    { key: 'message_c', label: 'Message', type: 'MultilineText' },
    { key: 'reply_c', label: 'Business Reply', type: 'MultilineText' },
    { key: 'source_c', label: 'Source', type: 'Picklist', options: ['Form', 'Call', 'WhatsApp'] },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['New', 'In Progress', 'Resolved'] },
  ], status: 'status_c' },
  { key: 'reviews_c', label: 'Reviews', icon: 'Star', title: 'Customer Reviews', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Review Headline', type: 'Text' },
    { key: 'customer_name_c', label: 'Customer Name', type: 'Text' },
    { key: 'rating_c', label: 'Rating (1–5)', type: 'Number' },
    { key: 'review_c', label: 'Review', type: 'MultilineText' },
    { key: 'status_c', label: 'Moderation', type: 'Picklist', options: ['Pending', 'Approved', 'Rejected'] },
    { key: 'report_status_c', label: 'Report / Hide Status', type: 'Picklist', options: ['None', 'Reported', 'Under Review', 'Hidden'] },
  ], status: 'status_c' },
  { key: 'offers_c', label: 'Offers', icon: 'Tags', title: 'Offers & Discounts', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Offer Name', type: 'Text' },
    { key: 'description_c', label: 'Details', type: 'MultilineText' },
    { key: 'discount_c', label: 'Discount', type: 'Text' },
    { key: 'start_date_c', label: 'Start Date', type: 'Date' },
    { key: 'end_date_c', label: 'End Date', type: 'Date' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Pending', 'Approved', 'Expired'] },
    { key: 'is_homepage_featured_c', label: 'Feature on Homepage', type: 'Boolean' },
  ], status: 'status_c' },
  { key: 'coupons_c', label: 'Coupons', icon: 'TicketPercent', title: 'Coupon Codes', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Coupon Name', type: 'Text' },
    { key: 'code_c', label: 'Coupon Code', type: 'Text' },
    { key: 'discount_c', label: 'Discount', type: 'Text' },
    { key: 'valid_from_c', label: 'Valid From', type: 'Date' },
    { key: 'valid_to_c', label: 'Valid To', type: 'Date' },
    { key: 'usage_limit_c', label: 'Usage Limit', type: 'Number' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Pending', 'Approved', 'Expired'] },
  ], status: 'status_c' },
  { key: 'premium_plans_c', label: 'Premium Plans', icon: 'Crown', title: 'Premium Plan Management', fields: [
    { key: 'Name', label: 'Plan Name', type: 'Text' },
    { key: 'duration_days_c', label: 'Duration (Days)', type: 'Number' },
    { key: 'price_c', label: 'Price (INR)', type: 'Number' },
    { key: 'features_c', label: 'Features', type: 'MultilineText' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Active', 'Inactive'] },
  ], status: 'status_c' },
  { key: 'payments_c', label: 'Payments', icon: 'Wallet', title: 'Premium Payments', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'plan_c', label: 'Premium Plan', type: 'Lookup', lookup: 'premium_plans_c' },
    { key: 'Name', label: 'Payment Description', type: 'Text' },
    { key: 'amount_c', label: 'Amount (INR)', type: 'Number' },
    { key: 'method_c', label: 'Method', type: 'Picklist', options: ['Razorpay', 'UPI'] },
    { key: 'reference_c', label: 'Transaction Reference', type: 'Text' },
    { key: 'screenshot_c', label: 'UPI Payment Proof', type: 'Files' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Pending', 'Verified', 'Failed', 'Refunded'] },
  ], status: 'status_c' },
  { key: 'advertisements_c', label: 'Advertisements', icon: 'Megaphone', title: 'Advertisement Management', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Campaign Name', type: 'Text' },
    { key: 'ad_type_c', label: 'Ad Type', type: 'Picklist', options: ['Homepage Banner', 'Category', 'Search Sponsored', 'Image Slider'] },
    { key: 'description_c', label: 'Ad Details', type: 'MultilineText' },
    { key: 'start_date_c', label: 'Start Date', type: 'Date' },
    { key: 'end_date_c', label: 'End Date', type: 'Date' },
    { key: 'amount_c', label: 'Package Amount', type: 'Number' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Pending', 'Approved', 'Rejected', 'Expired'] },
  ], status: 'status_c' },
  { key: 'reports_c', label: 'Listing Reports', icon: 'Flag', title: 'Reported Listings', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Report Title', type: 'Text' },
    { key: 'reason_c', label: 'Reason', type: 'Picklist', options: ['Incorrect Info', 'Spam', 'Closed', 'Other'] },
    { key: 'description_c', label: 'Details', type: 'MultilineText' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['New', 'Under Review', 'Resolved', 'Dismissed'] },
  ], status: 'status_c' },
  { key: 'categories_c', label: 'Categories', icon: 'Grid3X3', title: 'Category Management', fields: [
    { key: 'Name', label: 'Category Name', type: 'Text' },
    { key: 'parent_c', label: 'Parent Category', type: 'Text' },
    { key: 'description_c', label: 'Description', type: 'MultilineText' },
    { key: 'sort_order_c', label: 'Display Order', type: 'Number' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Active', 'Pending', 'Inactive'] },
  ], status: 'status_c' },
  { key: 'business_documents_c', label: 'Verification Docs', icon: 'FileCheck', title: 'Business Verification Documents', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'Name', label: 'Document Name', type: 'Text' },
    { key: 'document_type_c', label: 'Document Type', type: 'Picklist', options: ['GST Certificate', 'Trade License', 'Udyam', 'Address Proof', 'Other'] },
    { key: 'file_c', label: 'Document File', type: 'Files' },
    { key: 'status_c', label: 'Review Status', type: 'Picklist', options: ['Pending', 'Verified', 'Rejected'] },
  ], status: 'status_c' },
  { key: 'support_requests_c', label: 'Support', icon: 'LifeBuoy', title: 'Help & Support Requests', fields: [
    { key: 'Name', label: 'Request Subject', type: 'Text' },
    { key: 'email_c', label: 'Email', type: 'Text' },
    { key: 'mobile_c', label: 'Mobile', type: 'Text' },
    { key: 'message_c', label: 'Message', type: 'MultilineText' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['New', 'In Progress', 'Resolved'] },
  ], status: 'status_c' },
  { key: 'privacy_requests_c', label: 'Privacy Requests', icon: 'ShieldCheck', title: 'Data Privacy Requests', fields: [
    { key: 'Name', label: 'Request Name', type: 'Text' },
    { key: 'request_type_c', label: 'Request Type', type: 'Picklist', options: ['Access', 'Correction', 'Deletion', 'Export'] },
    { key: 'description_c', label: 'Details', type: 'MultilineText' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['New', 'In Review', 'Completed', 'Rejected'] },
  ], status: 'status_c' },
  { key: 'notifications_c', label: 'Notifications', icon: 'Bell', title: 'Notification Centre', fields: [
    { key: 'Name', label: 'Notification Title', type: 'Text' },
    { key: 'message_c', label: 'Message', type: 'MultilineText' },
    { key: 'notification_type_c', label: 'Type', type: 'Picklist', options: ['System', 'Enquiry', 'Payment', 'Listing', 'Branch'] },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['New', 'Read'] },
  ], status: 'status_c' },
  { key: 'branch_activity_c', label: 'Branch Activity', icon: 'Activity', title: 'Branch Activity Log', fields: [
    { key: 'branch_c', label: 'Branch', type: 'Lookup', lookup: 'branches_c' },
    { key: 'Name', label: 'Activity', type: 'Text' },
    { key: 'action_c', label: 'Action', type: 'Text' },
    { key: 'details_c', label: 'Details', type: 'MultilineText' },
  ] },
  { key: 'business_analytics_c', label: 'Branch Analytics', icon: 'ChartNoAxesCombined', title: 'Branch-wise Analytics', fields: [
    { key: 'business_c', label: 'Business', type: 'Lookup', lookup: 'businesses_c' },
    { key: 'branch_c', label: 'Branch', type: 'Lookup', lookup: 'branches_c' },
    { key: 'period_c', label: 'Period', type: 'Text' },
    { key: 'profile_views_c', label: 'Profile Views', type: 'Number' },
    { key: 'calls_c', label: 'Calls', type: 'Number' },
    { key: 'whatsapp_clicks_c', label: 'WhatsApp Clicks', type: 'Number' },
    { key: 'enquiries_count_c', label: 'Enquiries', type: 'Number' },
  ] },
  { key: 'site_settings_c', label: 'Website Settings', icon: 'Settings', title: 'Website Settings', fields: [
    { key: 'Name', label: 'Setting Name', type: 'Text' },
    { key: 'setting_key_c', label: 'Setting Key', type: 'Text' },
    { key: 'setting_value_c', label: 'Setting Value', type: 'MultilineText' },
    { key: 'upi_qr_c', label: 'UPI QR Code', type: 'Files' },
    { key: 'setting_group_c', label: 'Group', type: 'Picklist', options: ['General', 'Contact', 'Payments', 'SEO', 'Homepage'] },
  ] },
  { key: 'homepage_banners_c', label: 'Homepage Banners', icon: 'Images', title: 'Homepage Image Slider', fields: [
    { key: 'Name', label: 'Banner Title', type: 'Text' },
    { key: 'caption_c', label: 'Caption', type: 'Text' },
    { key: 'image_c', label: 'Banner Image', type: 'Files' },
    { key: 'link_url_c', label: 'Link URL', type: 'Text' },
    { key: 'sort_order_c', label: 'Display Order', type: 'Number' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Active', 'Inactive'] },
  ], status: 'status_c' },
  { key: 'content_pages_c', label: 'Content Pages', icon: 'FileText', title: 'Essential Website Pages', fields: [
    { key: 'Name', label: 'Page Title', type: 'Text' },
    { key: 'slug_c', label: 'URL Slug', type: 'Text' },
    { key: 'body_c', label: 'Page Content', type: 'MultilineText' },
    { key: 'seo_title_c', label: 'SEO Title', type: 'Text' },
    { key: 'meta_description_c', label: 'Meta Description', type: 'Text' },
    { key: 'status_c', label: 'Status', type: 'Picklist', options: ['Draft', 'Published'] },
  ], status: 'status_c' },
];

const TABLE_ACCESSORS = {
  branches_c: () => sdk.table('branches_c'),
  products_services_c: () => sdk.table('products_services_c'),
  enquiries_c: () => sdk.table('enquiries_c'),
  reviews_c: () => sdk.table('reviews_c'),
  offers_c: () => sdk.table('offers_c'),
  coupons_c: () => sdk.table('coupons_c'),
  premium_plans_c: () => sdk.table('premium_plans_c'),
  payments_c: () => sdk.table('payments_c'),
  advertisements_c: () => sdk.table('advertisements_c'),
  reports_c: () => sdk.table('reports_c'),
  categories_c: () => sdk.table('categories_c'),
  business_documents_c: () => sdk.table('business_documents_c'),
  support_requests_c: () => sdk.table('support_requests_c'),
  privacy_requests_c: () => sdk.table('privacy_requests_c'),
  notifications_c: () => sdk.table('notifications_c'),
  branch_activity_c: () => sdk.table('branch_activity_c'),
  business_analytics_c: () => sdk.table('business_analytics_c'),
  site_settings_c: () => sdk.table('site_settings_c'),
  content_pages_c: () => sdk.table('content_pages_c'),
  homepage_banners_c: () => sdk.table('homepage_banners_c'),
};

const tableFor = (key) => TABLE_ACCESSORS[key]?.();

const OWNER_KEYS = ['branches_c', 'products_services_c', 'enquiries_c', 'reviews_c', 'offers_c', 'coupons_c', 'premium_plans_c', 'payments_c', 'advertisements_c', 'categories_c', 'support_requests_c', 'business_documents_c', 'notifications_c', 'branch_activity_c', 'business_analytics_c', 'privacy_requests_c'];
const MANAGER_KEYS = ['branches_c', 'enquiries_c'];

function displayValue(record, key) {
  const value = record[key];
  if (value && typeof value === 'object') return value.Name || value.User?.Name || '—';
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export default function OperationsConsole({ mode = 'owner' }) {
  const { profile } = useProfile();
  const isAdmin = mode === 'admin';
  const isManager = profile === 'BranchManager_c';
  const available = useMemo(() => {
    const keys = isAdmin ? CONFIG.map((item) => item.key) : isManager ? MANAGER_KEYS : OWNER_KEYS;
    return CONFIG.filter((item) => keys.includes(item.key));
  }, [isAdmin, isManager]);
  const [activeKey, setActiveKey] = useState(available[0]?.key ?? 'branches_c');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [enquiryReplyDrafts, setEnquiryReplyDrafts] = useState({});
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({});
  const active = available.find((item) => item.key === activeKey) ?? available[0];

  const { data: rowsData, loading, error, run } = useFetch(async () => {
    const result = await tableFor(active.key).select(['Id', ...active.fields.map((field) => field.key).filter((key) => key !== 'Name'), 'Name', 'Owner', 'CreatedOn']).orderByDesc('CreatedOn').fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [active.key]);

  const { data: businessesData } = useFetch(async () => {
    if (isManager) return [];
    const result = await sdk.table('businesses_c').select(['Id', 'Name', 'business_type_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [isManager]);
  const { data: plansData } = useFetch(async () => {
    if (isManager) return [];
    const result = await sdk.table('premium_plans_c').select(['Id', 'Name', 'price_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [isManager]);
  const { data: paymentSettings } = useFetch(async () => {
    if (isManager) return [];
    const result = await sdk.table('site_settings_c').select(['setting_key_c', 'setting_value_c', 'upi_qr_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [isManager]);
  const { data: branchesData } = useFetch(async () => {
    const result = await sdk.table('branches_c').select(['Id', 'Name']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, []);

  useEffect(() => {
    setForm({});
    setShowCreate(false);
  }, [activeKey]);

  const rows = rowsData ?? [];
  const createFields = active.fields.filter((field) => isAdmin || !((field.key === 'status_c' && ['offers_c', 'coupons_c', 'payments_c', 'advertisements_c', 'business_documents_c', 'categories_c', 'privacy_requests_c'].includes(active.key)) || field.key === 'is_homepage_featured_c'));
  const editFields = isManager && active.key === 'branches_c'
    ? active.fields.filter((field) => ['Name', 'address_c', 'district_c', 'city_c', 'phone_c', 'map_url_c', 'hours_c', 'photos_c'].includes(field.key))
    : active.fields.filter((field) => isAdmin || !((field.key === 'status_c' && ['offers_c', 'coupons_c', 'advertisements_c'].includes(active.key)) || field.key === 'is_homepage_featured_c'));
  const lookupRows = (table) => table === 'businesses_c' ? (active.key === 'branches_c' ? (businessesData ?? []).filter((business) => business.business_type_c === 'Multiple Branch Business') : businessesData ?? []) : table === 'premium_plans_c' ? plansData ?? [] : branchesData ?? [];

  async function logBranchActivity(branchId, activityName, action, details) {
    if (!branchId) return;
    try {
      await sdk.table('branch_activity_c').create({
        Name: activityName,
        branch_c: branchId,
        action_c: action,
        details_c: details,
      });
    } catch {
      // Activity history must not block the main business operation.
    }
  }

  async function createRecord(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      active.fields.forEach((field) => {
        const value = form[field.key];
        if (field.key === 'Name' || value !== undefined && value !== '') {
          payload[field.key] = field.type === 'Lookup' ? value : field.type === 'Number' ? Number(value) : field.type === 'People' ? toPeopleWrite(value) : field.type === 'Files' ? sdk.storage.toCreateFormat(value ?? []) : value;
        }
      });
      if (active.status && !payload[active.status]) {
        const field = active.fields.find((item) => item.key === active.status);
        payload[active.status] = field?.options?.includes('Pending') ? 'Pending' : field?.options?.[0] ?? '';
      }
      const result = await tableFor(active.key).create(payload);
      if (result.messages?.length) toast.error(result.messages[0]);
      if (!result.data?.length) return;
      if (active.key === 'branches_c') await logBranchActivity(result.data[0].Id, 'Branch Created', 'Create', 'A new branch profile was created.');
      toast.success(`${active.label} item created.`);
      setForm({});
      setShowCreate(false);
      run();
    } catch (err) {
      toast.error(err.message || 'Could not create record.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(record) {
    const values = {};
    active.fields.forEach((field) => {
      const value = record[field.key];
      if (field.type === 'Lookup') values[field.key] = value?.Id ?? value ?? '';
      else if (field.type === 'People') values[field.key] = value ?? [];
      else values[field.key] = value ?? (field.type === 'Files' ? [] : '');
    });
    setEditForm(values);
    setEditingId(record.Id);
  }

  async function saveEdit(event, record) {
    event.preventDefault();
    const payload = {};
    active.fields.forEach((field) => {
      const value = editForm[field.key];
      if (value === undefined) return;
      if (field.type === 'Lookup') payload[field.key] = value || null;
      else if (field.type === 'Number') payload[field.key] = value === '' ? null : Number(value);
      else if (field.type === 'People') payload[field.key] = toPeopleWrite(value);
      else if (field.type === 'Files') payload[field.key] = sdk.storage.toUpdateFormat(value ?? []);
      else payload[field.key] = value;
    });
    const result = await tableFor(active.key).update({ Id: record.Id, ...payload });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      if (active.key === 'branches_c') await logBranchActivity(record.Id, 'Branch Profile Updated', 'Update', 'Branch profile details were updated.');
      toast.success('Record updated.');
      setEditingId('');
      setEditForm({});
      run();
    }
  }

  async function refreshBusinessRating(businessId) {
    if (!businessId) return;
    const approved = await sdk.table('reviews_c')
      .select(['Id', 'rating_c'])
      .where(eq('business_c', businessId))
      .where(eq('status_c', 'Approved'))
      .where(eq('report_status_c', 'None'))
      .fetch();
    if (!approved.success) return;
    const total = approved.data.reduce((sum, review) => sum + Number(review.rating_c || 0), 0);
    await sdk.table('businesses_c').update({
      Id: businessId,
      rating_c: approved.data.length ? Number((total / approved.data.length).toFixed(1)) : 0,
      reviews_count_c: approved.data.length,
    });
  }

  async function deleteRecord(record) {
    const businessId = record.business_c?.Id ?? record.business_c;
    const result = await tableFor(active.key).remove(record.Id);
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      if (active.key === 'reviews_c') await refreshBusinessRating(businessId);
      toast.success('Record deleted.');
      run();
    }
  }

  async function restoreReview(record) {
    const result = await sdk.table('reviews_c').update({ Id: record.Id, status_c: 'Approved', report_status_c: 'None' });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      await refreshBusinessRating(record.business_c?.Id ?? record.business_c);
      toast.success('Review restored.');
      run();
    }
  }

  async function saveEnquiryReply(record) {
    const reply = (enquiryReplyDrafts[record.Id] ?? record.reply_c ?? '').trim();
    if (!reply) return;
    const result = await sdk.table('enquiries_c').update({ Id: record.Id, reply_c: reply });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      await logBranchActivity(record.branch_c?.Id ?? record.branch_c, 'Customer Enquiry Reply', 'Reply', 'A reply was added to a customer enquiry.');
      toast.success('Enquiry reply saved.');
      setEnquiryReplyDrafts((current) => ({ ...current, [record.Id]: '' }));
      run();
    }
  }

  async function saveReviewReply(record) {
    const reply = (replyDrafts[record.Id] ?? '').trim();
    if (!reply) return;
    const result = await sdk.table('reviews_c').update({ Id: record.Id, owner_reply_c: reply });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      toast.success('Business reply saved.');
      setReplyDrafts((current) => ({ ...current, [record.Id]: '' }));
      run();
    }
  }

  async function updateStatus(record, nextStatus) {
    if (active.key === 'payments_c') {
      toast.error('Payment status can only be changed through verified Razorpay callbacks or Admin UPI approval.');
      return;
    }
    if (!active.status) return;
    const result = await tableFor(active.key).update({ Id: record.Id, [active.status]: nextStatus });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (result.data?.length) {
      if (active.key === 'branches_c') await logBranchActivity(record.Id, 'Branch Status Updated', 'Status', `Branch status changed to ${nextStatus}.`);
      if (active.key === 'enquiries_c') await logBranchActivity(record.branch_c?.Id ?? record.branch_c, 'Branch Enquiry Updated', 'Enquiry', `Enquiry status changed to ${nextStatus}.`);
      if (active.key === 'reviews_c') {
        await refreshBusinessRating(record.business_c?.Id ?? record.business_c);
      }
      toast.success('Status updated.');
      run();
    }
  }

  const canCreate = isAdmin || (!isManager && ['branches_c', 'products_services_c', 'offers_c', 'coupons_c', 'advertisements_c', 'categories_c', 'support_requests_c', 'privacy_requests_c', 'business_documents_c'].includes(active.key));
  const canModerate = isAdmin;
  const ownerCanUpdateEnquiry = !isAdmin && active.key === 'enquiries_c';
  const ownerCanMarkNotification = !isAdmin && !isManager && active.key === 'notifications_c';
  const ownerCanReplyReview = !isAdmin && !isManager && active.key === 'reviews_c';
  const canEdit = (isAdmin && active.key !== 'payments_c') || (isManager && active.key === 'branches_c') || (!isManager && ['branches_c', 'products_services_c', 'offers_c', 'coupons_c', 'advertisements_c'].includes(active.key));
  const canDelete = isAdmin || (!isManager && active.key === 'products_services_c');
  const count = rows.length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{isAdmin ? 'Administration' : isManager ? 'Assigned branch workspace' : 'Business owner workspace'}</p>
          <h1 className="mt-2 text-3xl font-extrabold">{isAdmin ? 'Operations Centre' : isManager ? 'Branch Manager Workspace' : 'Business Management'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{isAdmin ? 'Review and manage directory operations from one place.' : 'अपने business और branch से जुड़ी गतिविधियाँ प्रबंधित करें।'}</p>
        </div>
        {canCreate && <Button onClick={() => setShowCreate((value) => !value)}><ApperIcon name={showCreate ? 'X' : 'Plus'} size={16} /> {showCreate ? 'Close Form' : `Add ${active.label.replace(/s$/, '')}`}</Button>}
      </div>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
        {available.map((item) => (
          <Button key={item.key} size="sm" variant={activeKey === item.key ? 'default' : 'outline'} className="shrink-0" onClick={() => setActiveKey(item.key)}>
            <ApperIcon name={item.icon} size={15} /> {item.label}
          </Button>
        ))}
      </div>

      {active.key === 'payments_c' && !isAdmin && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Premium Payment Instructions</p>
          <p className="mt-1 text-xs text-muted-foreground">UPI ID: {paymentSettings?.find((item) => item.setting_key_c === 'upi_id')?.setting_value_c || 'Please contact the Super Admin for UPI details.'}</p>
          {(() => { const qr = paymentSettings?.find((item) => item.setting_key_c === 'upi_id')?.upi_qr_c?.[0]?.url; return qr ? <img src={qr} alt="UPI payment QR code" className="mt-3 size-36 rounded-xl border border-border bg-white object-contain p-2" /> : null; })()}
          <p className="mt-1 text-xs text-muted-foreground">Razorpay checkout and UPI submission are handled through the secure payment flow. This screen shows your payment history only.</p>
        </div>
      )}
      {showCreate && canCreate && active.key !== 'payments_c' && (
        <form onSubmit={createRecord} className="mt-5 rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h2 className="font-bold">Create {active.label}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {createFields.map((field) => (
              <label key={field.key} className={field.type === 'MultilineText' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                <span className="text-xs font-semibold">{field.label}</span>
                {field.type === 'Boolean' ? (
                  <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm"><input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))} /> Enabled</label>
                ) : field.type === 'People' ? (
                  <BranchManagerPicker value={form[field.key] ?? []} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} />
                ) : field.type === 'Picklist' ? (
                  <select required={field.key === 'Name'} value={form[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select {field.label}</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'Lookup' ? (
                  <select value={form[field.key] ?? ''} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, [field.key]: value, ...(active.key === 'payments_c' && field.key === 'plan_c' ? { amount_c: plansData?.find((plan) => plan.Id === value)?.price_c ?? '' } : {}) })); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select {field.label}</option>
                    {lookupRows(field.lookup).map((option) => <option key={option.Id} value={option.Id}>{option.Name}</option>)}
                  </select>
                ) : field.type === 'Files' ? (
                  <FilePicker value={form[field.key] ?? []} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} fieldConfig={{ supportedExtensions: field.key === 'file_c' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png', 'webp'], supportMultipleValues: field.key === 'photos_c', maxValue: field.key === 'image_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'product_image_max_kb')?.setting_value_c || 5120) : field.key === 'photos_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'gallery_max_kb')?.setting_value_c || 5120) : 5120 }} maxFiles={field.key === 'photos_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'gallery_max_files')?.setting_value_c || 10) : 1} />
                ) : field.type === 'MultilineText' ? (
                  <Textarea rows={3} value={form[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={`Enter ${field.label.toLowerCase()}...`} />
                ) : (
                  <Input type={field.type === 'Date' ? 'date' : field.type === 'Number' ? 'number' : 'text'} value={form[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={`Enter ${field.label.toLowerCase()}...`} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Record'}</Button>
          </div>
        </form>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div><h2 className="text-lg font-bold">{active.title}</h2><p className="text-xs text-muted-foreground">{count} records</p></div>
        <Button size="sm" variant="outline" onClick={run}><ApperIcon name="RefreshCw" size={14} /> Refresh</Button>
      </div>

      {error && <div className="mt-5 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></div>}
      {loading && <div className="mt-5 space-y-3"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /></div>}
      {!loading && !error && rows.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center"><ApperIcon name="Inbox" size={30} className="mx-auto text-muted-foreground" /><p className="mt-3 font-semibold">No records found</p><p className="mt-1 text-sm text-muted-foreground">इस section में अभी कोई record नहीं है।</p></div>}

      {!loading && !error && rows.length > 0 && (
        <div className="mt-5 space-y-3">
          {rows.map((record) => {
            const status = active.status ? record[active.status] : '';
            return (
              <article key={record.Id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{record.Name || record.message_c || record.code_c || 'Untitled record'}</h3>
                      {status && <Badge variant={['Approved', 'Active', 'Verified', 'Resolved', 'Read'].includes(status) ? 'secondary' : 'outline'}>{status}</Badge>}
                    </div>
                    <div className="mt-2 grid gap-x-5 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {active.fields.filter((field) => field.key !== 'Name' && field.key !== active.status && record[field.key] !== undefined && record[field.key] !== '').slice(0, 6).map((field) => (
                        <p key={field.key} className="truncate"><span className="font-semibold text-foreground/70">{field.label}:</span> {displayValue(record, field.key)}</p>
                      ))}
                    </div>
                  </div>
                  {editingId === record.Id && canEdit && (
                    <form onSubmit={(event) => saveEdit(event, record)} className="mt-4 grid gap-3 rounded-xl border border-primary/20 bg-muted/30 p-4 sm:grid-cols-2">
                      {editFields.map((field) => (
                        <label key={field.key} className={field.type === 'MultilineText' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                          <span className="text-xs font-semibold">{field.label}</span>
                          {field.type === 'Boolean' ? (
                            <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm"><input type="checkbox" checked={Boolean(editForm[field.key])} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.checked }))} /> Enabled</label>
                          ) : field.type === 'People' ? (
                            <BranchManagerPicker value={editForm[field.key] ?? []} onChange={(value) => setEditForm((current) => ({ ...current, [field.key]: value }))} />
                          ) : field.type === 'Lookup' ? (
                            <select value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select {field.label}</option>{lookupRows(field.lookup).map((option) => <option key={option.Id} value={option.Id}>{option.Name}</option>)}</select>
                          ) : field.type === 'Picklist' ? (
                            <select value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select {field.label}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                          ) : field.type === 'Files' ? (
                            <FilePicker value={editForm[field.key] ?? []} onChange={(value) => setEditForm((current) => ({ ...current, [field.key]: value }))} fieldConfig={{ supportedExtensions: field.key === 'file_c' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png', 'webp'], supportMultipleValues: field.key === 'photos_c', maxValue: field.key === 'image_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'product_image_max_kb')?.setting_value_c || 5120) : field.key === 'photos_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'gallery_max_kb')?.setting_value_c || 5120) : 5120 }} maxFiles={field.key === 'photos_c' ? Number(paymentSettings?.find((item) => item.setting_key_c === 'gallery_max_files')?.setting_value_c || 10) : 1} />
                          ) : field.type === 'MultilineText' ? (
                            <Textarea rows={3} value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                          ) : (
                            <Input type={field.type === 'Date' ? 'date' : field.type === 'Number' ? 'number' : 'text'} value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                          )}
                        </label>
                      ))}
                      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditingId('')}>Cancel</Button><Button type="submit">Save Changes</Button></div>
                    </form>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {active.key === 'payments_c' && (record.receipt_number_c || record.receipt_no_c) && <Button size="sm" variant="outline" asChild><Link to={`/owner/payments/${record.Id}/receipt`}>View Receipt</Link></Button>}
                    {active.key === 'site_settings_c' && <Button size="sm" variant="outline" asChild><Link to={`/admin/settings/${record.Id}`}>Open Setting</Link></Button>}
                    {canEdit && editingId !== record.Id && <Button size="sm" variant="outline" onClick={() => startEdit(record)}>Edit</Button>}
                    {isAdmin && active.key === 'payments_c' && record.provider_c === 'UPI' && record.status_c === 'Pending Verification' && <Button size="sm" onClick={async () => { try { const result = await approveManualPremiumPayment({ paymentId: record.Id }); toast.success(`UPI verified. Receipt: ${result.receiptNumber}`); run(); } catch (error) { toast.error(error.message || 'Could not approve this payment.'); } }}>Approve UPI</Button>}
                    {canDelete && <ConfirmDeleteButton title={`Delete ${record.Name || 'this record'}?`} description="This record will be permanently removed. This cannot be undone." onConfirm={() => deleteRecord(record)} />}
                    {isAdmin && active.key === 'reviews_c' && record.report_status_c === 'Hidden' && <Button size="sm" onClick={() => restoreReview(record)}>Restore Review</Button>}
                  </div>
                  {ownerCanUpdateEnquiry && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Textarea rows={2} value={enquiryReplyDrafts[record.Id] ?? record.reply_c ?? ''} onChange={(event) => setEnquiryReplyDrafts((current) => ({ ...current, [record.Id]: event.target.value }))} placeholder="Write a response for this customer enquiry..." />
                      <Button size="sm" onClick={() => saveEnquiryReply(record)}>Save Reply</Button>
                    </div>
                  )}
                  {ownerCanReplyReview && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input value={replyDrafts[record.Id] ?? record.owner_reply_c ?? ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [record.Id]: event.target.value }))} placeholder="Write a public reply to this review..." />
                      <Button size="sm" onClick={() => saveReviewReply(record)}>Save Reply</Button>
                      {record.report_status_c !== 'Hidden' && <Button size="sm" variant="outline" onClick={async () => { const result = await sdk.table('reviews_c').update({ Id: record.Id, report_status_c: 'Hidden' }); if (result.data?.length) { toast.success('Review hidden pending Admin review.'); run(); } }}>Report & Hide</Button>}
                    </div>
                  )}
                  {(canModerate || ownerCanUpdateEnquiry || ownerCanMarkNotification) && active.status && (
                    <div className="flex flex-wrap gap-2">
                      {(canModerate ? active.fields.find((field) => field.key === active.status)?.options ?? [] : ownerCanMarkNotification ? ['Read'] : ['New', 'In Progress', 'Resolved']).filter((option) => option !== status).map((option) => (
                        <Button key={option} size="sm" variant="outline" onClick={() => updateStatus(record, option)}>{option}</Button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-7 text-xs text-muted-foreground">Demo mode: payment, OTP, email, WhatsApp, document verification and push-notification providers are not connected. Status changes and records here are sample workspace data.</p>
    </div>
  );
}
