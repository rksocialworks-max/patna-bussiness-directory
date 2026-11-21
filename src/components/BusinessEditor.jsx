import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/layouts/RootLayout';
import { createDocument, updateDocument, listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FilePicker from '@/components/FilePicker';
import { CATEGORIES, BIHAR_DISTRICTS } from '@/data/directoryOptions';
import ApperIcon from '@/components/ApperIcon';
import { storage } from '@/lib/firebase';

const blank = {
  Name: '',
  category_c: '',
  subcategory_c: '',
  business_type_c: 'Physical Store / Shop',
  owner_name_c: '',
  phone_c: '',
  whatsapp_c: '',
  email_c: '',
  district_c: '',
  city_c: '',
  area_c: '',
  pincode_c: '',
  address_c: '',
  description_c: '',
  map_url_c: '',
  latitude_c: '',
  longitude_c: '',
  website_c: '',
  facebook_c: '',
  instagram_c: '',
  youtube_c: '',
  linkedin_c: '',
  x_c: '',
  telegram_c: '',
  gstin_c: '',
  hours_c: 'Monday: 9:00 AM – 8:00 PM\nTuesday: 9:00 AM – 8:00 PM\nWednesday: 9:00 AM – 8:00 PM\nThursday: 9:00 AM – 8:00 PM\nFriday: 9:00 AM – 8:00 PM\nSaturday: 9:00 AM – 8:00 PM\nSunday: Closed',
  holiday_info_c: 'Sunday: Weekly off. Special holiday hours may vary.',
  seo_title_c: '',
  meta_description_c: '',
  logo_c: [],
  cover_c: [],
  photos_c: [],
};

const editableFields = Object.keys(blank);
const logoConfig = { supportedExtensions: ['jpg', 'jpeg', 'png', 'webp'], supportMultipleValues: false };
const coverConfig = { supportedExtensions: ['jpg', 'jpeg', 'png', 'webp'], supportMultipleValues: false };
const galleryConfig = { supportedExtensions: ['jpg', 'jpeg', 'png', 'webp'], supportMultipleValues: true };

export default function BusinessEditor({ record = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [saveSlow, setSaveSlow] = useState(false);
  const [preview, setPreview] = useState(false);
  const premium = Boolean(record?.is_premium_c) && (!record?.premium_expiry_c || record.premium_expiry_c >= new Date().toISOString().slice(0, 10));
  const { data: categoryRows } = useFetch(async () => {
    return listDocuments(COLLECTIONS.categoriesPublic, { pageSize: 100 });
  }, []);
  // Keep registration usable if the public Firestore category collection is empty or unavailable.
  const categoryOptions = categoryRows?.length
    ? categoryRows
    : CATEGORIES.map((category) => ({ id: category.name, Name: category.name }));
  const { data: siteSettings } = useFetch(async () => {
    return listDocuments(COLLECTIONS.siteSettingsPublic, { pageSize: 100 });
  }, []);
  const settingNumber = (key, fallback) => Number(siteSettings?.find((item) => item.setting_key_c === key)?.setting_value_c || fallback);
  const imageMaxKb = 1024; // Customer business registration images are limited to 1 MB each.
  const coverMaxKb = imageMaxKb;
  const galleryMaxKb = imageMaxKb;
  const galleryMaxFiles = settingNumber('gallery_max_files', 10);
  const descriptionWordLimit = settingNumber('business_description_word_limit', 250);

  useEffect(() => {
    if (record) {
      const values = {};
      editableFields.forEach((field) => {
        values[field] = record[field] ?? (['logo_c', 'cover_c', 'photos_c'].includes(field) ? [] : '');
      });
      setForm({ ...blank, ...values });
    }
  }, [record]);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveSlow(false);
    const slowTimer = window.setTimeout(() => setSaveSlow(true), 15000);
    const saveStartedAt = Date.now();
    try {
      const payload = {};
      editableFields.forEach((field) => {
        const value = form[field];
        if (['logo_c', 'cover_c', 'photos_c'].includes(field)) {
          payload[field] = Array.isArray(value) ? value : (value ? [value] : []);
        } else if (['latitude_c', 'longitude_c'].includes(field)) {
          payload[field] = value === '' ? null : Number(value);
        } else {
          payload[field] = value ?? '';
        }
      });

      payload.slug_c = form.Name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      payload.seo_title_c = form.seo_title_c || `${form.Name} | Patna Business Directory`;
      payload.meta_description_c = form.meta_description_c || String(form.description_c || '').slice(0, 155);

      if (!user?.uid) throw new Error('Please sign in again before saving your business.');
      if (record) {
        if (record.ownerUid && record.ownerUid !== user.uid && user.profile !== 'Admin_c') {
          throw new Error('You are not allowed to edit this business.');
        }
        // Free owners cannot write premium-only fields, even as empty values.
        if (user.profile !== 'Admin_c') {
          // The selected free/premium listing policy exposes only Facebook
          // and Instagram social links to owners.
          delete payload.youtube_c;
          delete payload.linkedin_c;
          delete payload.x_c;
          delete payload.telegram_c;
        }
        if (user.profile !== 'Admin_c' && !premium) {
          delete payload.email_c;
          delete payload.website_c;
          delete payload.cover_c;
          delete payload.photos_c;
        }
        await updateDocument(COLLECTIONS.businesses, record.id ?? record.Id, payload, { skipRead: true });
      } else {
        // Keep the initial owner submission aligned with the strict Firestore
        // create allowlist. Premium fields and admin-controlled fields are added later.
        const allowedCreateFields = [
          'Name', 'category_c', 'subcategory_c', 'business_type_c',
          'owner_name_c', 'phone_c', 'whatsapp_c',
          'district_c', 'city_c', 'area_c', 'pincode_c', 'address_c',
          'description_c', 'map_url_c', 'latitude_c', 'longitude_c',
          'facebook_c', 'instagram_c', 'gstin_c', 'hours_c',
          'holiday_info_c', 'seo_title_c', 'meta_description_c', 'logo_c', 'slug_c',
        ];
        const createPayload = Object.fromEntries(
          allowedCreateFields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]])
        );
        Object.assign(createPayload, {
          ownerUid: user.uid,
          ownerEmail: user.email ?? '',
          status_c: 'Pending Approval',
          listing_type_c: 'Free',
          is_premium_c: false,
          is_verified_c: false,
          rating_c: 0,
          reviews_count_c: 0,
          featured_order_c: 99,
        });
        await createDocument(COLLECTIONS.businesses, createPayload, { skipRead: true });
      }

      console.info('[BusinessEditor] Save completed', { mode: record ? 'update' : 'create', durationMs: Date.now() - saveStartedAt });
      toast.success(record ? 'Business profile updated.' : 'Business submitted for Admin approval.');
      navigate('/owner/businesses');
    } catch (error) {
      console.error('[BusinessEditor] Save failed', { mode: record ? 'update' : 'create', durationMs: Date.now() - saveStartedAt, code: error?.code, message: error?.message, error });
      toast.error(`${error?.code ? `${error.code}: ` : ''}${error.message || 'Unable to save business.'}`);
    } finally {
      window.clearTimeout(slowTimer);
      setSaveSlow(false);
      setSaving(false);
    }
  }

  const fieldClass = 'space-y-1.5';
  const labelClass = 'text-xs font-semibold text-foreground';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-4">
        <div><p className="font-semibold">Registration Preview</p><p className="mt-1 text-xs text-muted-foreground">आपकी public listing कैसी दिखेगी, पहले देखें।</p></div>
        <Button type="button" variant="outline" size="sm" onClick={() => setPreview((value) => !value)}><ApperIcon name="Eye" size={15} /> {preview ? 'Close Preview' : 'Preview Listing'}</Button>
      </div>

      {preview && <div className="rounded-2xl border border-primary/30 bg-card p-5"><p className="text-xs font-bold uppercase tracking-widest text-primary">Listing Preview</p><h2 className="mt-2 text-xl font-extrabold">{form.Name || 'Your Business Name'}</h2><p className="mt-1 text-sm text-muted-foreground">{form.category_c || 'Category'} • {form.city_c || 'City'}, {form.district_c || 'District'}</p><p className="mt-3 text-sm leading-6">{form.description_c || 'Your business description will appear here.'}</p><p className="mt-3 text-xs text-muted-foreground">{form.address_c || 'Business address'}</p></div>}

      <form onSubmit={submit} className="space-y-7">
        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <div className="mb-5"><h2 className="text-lg font-bold">Business Information</h2><p className="mt-1 text-xs text-muted-foreground">Required fields पर * लगा है। Registration बिल्कुल Free है।</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={fieldClass}><span className={labelClass}>Business Name *</span><Input required value={form.Name} onChange={(event) => change('Name', event.target.value)} placeholder="जैसे Sharma Sweets" /></label>
            <label className={fieldClass}><span className={labelClass}>Category *</span><select required value={form.category_c} onChange={(event) => change('category_c', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Select category</option>{categoryOptions.map((item) => <option key={item.id ?? item.Id ?? item.Name} value={item.Name}>{item.Name}</option>) }</select></label>
            <label className={fieldClass}><span className={labelClass}>Subcategory</span><Input value={form.subcategory_c} onChange={(event) => change('subcategory_c', event.target.value)} placeholder="Subcategory" /></label>
            <label className={fieldClass}><span className={labelClass}>Business Type</span><select value={form.business_type_c} onChange={(event) => change('business_type_c', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Physical Store / Shop</option><option>Multiple Branch Business</option></select></label>
            <label className={fieldClass}><span className={labelClass}>Owner Name *</span><Input required value={form.owner_name_c} onChange={(event) => change('owner_name_c', event.target.value)} placeholder="Owner full name" /></label>
            <label className={fieldClass}><span className={labelClass}>Mobile Number *</span><Input required value={form.phone_c} onChange={(event) => change('phone_c', event.target.value)} placeholder="10-digit mobile number" /></label>
            <label className={fieldClass}><span className={labelClass}>WhatsApp Number</span><Input value={form.whatsapp_c} onChange={(event) => change('whatsapp_c', event.target.value)} placeholder="WhatsApp number" /></label>
            {(premium || user?.profile === 'Admin_c') && <label className={fieldClass}><span className={labelClass}>Email (Premium)</span><Input type="email" value={form.email_c} onChange={(event) => change('email_c', event.target.value)} placeholder="business@example.com" /></label>}
            <label className={fieldClass}><span className={labelClass}>District *</span><select required value={form.district_c} onChange={(event) => change('district_c', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Select district</option>{BIHAR_DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className={fieldClass}><span className={labelClass}>City / Town</span><Input value={form.city_c} onChange={(event) => change('city_c', event.target.value)} placeholder="City or town" /></label>
            <label className={fieldClass}><span className={labelClass}>Area / Locality</span><Input value={form.area_c} onChange={(event) => change('area_c', event.target.value)} placeholder="Area / mohalla" /></label>
            <label className={fieldClass}><span className={labelClass}>PIN Code</span><Input value={form.pincode_c} onChange={(event) => change('pincode_c', event.target.value)} placeholder="PIN code" /></label>
            <label className={fieldClass}><span className={labelClass}>Full Address *</span><Input required value={form.address_c} onChange={(event) => change('address_c', event.target.value)} placeholder="Shop / building, street, locality" /></label>
            <label className={fieldClass}><span className={labelClass}>Google Maps Link</span><Input value={form.map_url_c} onChange={(event) => change('map_url_c', event.target.value)} placeholder="Paste Google Maps link" /></label>
            <label className={fieldClass}><span className={labelClass}>GSTIN (Optional)</span><Input value={form.gstin_c} onChange={(event) => change('gstin_c', event.target.value)} placeholder="GST identification number" /></label>
            <label className={fieldClass}><span className={labelClass}>Latitude (Optional)</span><Input type="number" step="any" value={form.latitude_c} onChange={(event) => change('latitude_c', event.target.value)} placeholder="Map latitude" /></label>
            <label className={fieldClass}><span className={labelClass}>Longitude (Optional)</span><Input type="number" step="any" value={form.longitude_c} onChange={(event) => change('longitude_c', event.target.value)} placeholder="Map longitude" /></label>
            <label className="space-y-1.5 md:col-span-2"><span className={labelClass}>Business Description * (max {descriptionWordLimit} words)</span><Textarea required rows={4} value={form.description_c} onChange={(event) => { const words = event.target.value.trim().split(/\s+/).filter(Boolean); change('description_c', words.length > descriptionWordLimit ? words.slice(0, descriptionWordLimit).join(' ') : event.target.value); }} placeholder="अपने बिज़नेस और सेवाओं के बारे में लिखें..." /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Business Photos</h2>
          <p className="mt-1 text-xs text-muted-foreground">Free listing में एक logo। Cover photo और photo gallery Premium listing के लिए उपलब्ध हैं।</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="space-y-2"><p className="text-xs font-semibold">Business Logo (Max 1 MB)</p><FilePicker value={form.logo_c} onChange={(value) => change('logo_c', value)} fieldConfig={{ ...logoConfig, maxValue: imageMaxKb }} maxFiles={1} compressImages uploadsEnabled={Boolean(storage)} /></div>
            <div className="space-y-2"><p className="text-xs font-semibold">Cover Photo (Premium · Max 1 MB)</p><FilePicker value={form.cover_c} onChange={(value) => change('cover_c', value)} fieldConfig={{ ...coverConfig, maxValue: coverMaxKb }} maxFiles={1} readOnly={!premium} compressImages uploadsEnabled={Boolean(storage)} /><p className="text-[11px] text-muted-foreground">{premium ? 'Premium cover upload enabled.' : 'Premium plan required.'}</p></div>
            <div className="space-y-2"><p className="text-xs font-semibold">Photo Gallery (Premium · Max 1 MB)</p><FilePicker value={form.photos_c} onChange={(value) => change('photos_c', value)} fieldConfig={{ ...galleryConfig, maxValue: galleryMaxKb }} maxFiles={galleryMaxFiles} readOnly={!premium} compressImages uploadsEnabled={Boolean(storage)} /><p className="text-[11px] text-muted-foreground">{premium ? 'Gallery upload enabled.' : 'Premium plan required.'}</p></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Business Hours & Holidays</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5"><span className={labelClass}>Weekly Schedule</span><Textarea rows={5} value={form.hours_c} onChange={(event) => change('hours_c', event.target.value)} /></label>
            <label className="space-y-1.5"><span className={labelClass}>Weekly Off & Special Holidays</span><Textarea rows={5} value={form.holiday_info_c} onChange={(event) => change('holiday_info_c', event.target.value)} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Website & Social Media</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(premium || user?.profile === 'Admin_c') && <label className={fieldClass}><span className={labelClass}>Website (Premium)</span><Input value={form.website_c} onChange={(event) => change('website_c', event.target.value)} placeholder="https://" /></label>}
            <label className={fieldClass}><span className={labelClass}>Facebook</span><Input value={form.facebook_c} onChange={(event) => change('facebook_c', event.target.value)} placeholder="Facebook profile URL" /></label>
            <label className={fieldClass}><span className={labelClass}>Instagram</span><Input value={form.instagram_c} onChange={(event) => change('instagram_c', event.target.value)} placeholder="Instagram profile URL" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Search Engine Optimisation</h2>
          <div className="mt-4 grid gap-4">
            <label className={fieldClass}><span className={labelClass}>SEO Title</span><Input value={form.seo_title_c} onChange={(event) => change('seo_title_c', event.target.value)} placeholder="Business name | Patna Business Directory" /></label>
            <label className={fieldClass}><span className={labelClass}>Meta Description</span><Textarea rows={2} maxLength={160} value={form.meta_description_c} onChange={(event) => change('meta_description_c', event.target.value)} placeholder="Short description for search engines (up to 160 characters)" /></label>
          </div>
        </section>

        {saving && saveSlow && <p role="status" className="text-sm text-amber-600">Save अभी भी चल रहा है (15 सेकंड से अधिक)। Firebase request की जाँच के लिए Console में [BusinessEditor] log देखें।</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/owner/businesses')}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : record ? 'Save Changes' : 'Submit for Approval'} <ApperIcon name="ArrowRight" size={15} /></Button>
        </div>
      </form>
    </div>
  );
}
