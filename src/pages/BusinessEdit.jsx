import { Link, useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/layouts/RootLayout';
import { sdk } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import BusinessEditor from '@/components/BusinessEditor';
import ApperIcon from '@/components/ApperIcon';

const FIELDS = ['Id', 'Name', 'category_c', 'subcategory_c', 'business_type_c', 'owner_name_c', 'phone_c', 'whatsapp_c', 'email_c', 'district_c', 'city_c', 'area_c', 'pincode_c', 'address_c', 'description_c', 'website_c', 'facebook_c', 'instagram_c', 'youtube_c', 'linkedin_c', 'x_c', 'telegram_c', 'gstin_c', 'map_url_c', 'latitude_c', 'longitude_c', 'hours_c', 'holiday_info_c', 'seo_title_c', 'meta_description_c', 'logo_c', 'cover_c', 'photos_c', 'is_premium_c', 'premium_expiry_c'];

export const route = { path: '/owner/businesses/:id/edit', layout: 'owner', access: "['BusinessOwner_c', 'Admin_c'].includes(profile)" };

export default function BusinessEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const backRoute = user?.profile === 'Admin_c' ? '/admin/businesses' : '/owner/businesses';
  const { data: record, loading, error } = useFetch(async () => {
    const result = await sdk.table('businesses_c').select(FIELDS).get(id);
    return result.data;
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" asChild><Link to={backRoute}><ApperIcon name="ArrowLeft" size={16} /> Back</Link></Button>
      <h1 className="mt-4 text-3xl font-extrabold">Edit Business</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">अपने बिज़नेस की जानकारी अपडेट करें।</p>
      {loading && <div className="h-48 animate-pulse rounded-2xl bg-muted" />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!loading && record && <BusinessEditor record={record} />}
      {!loading && !record && <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">Business record नहीं मिला।</p>}
    </div>
  );
}
