import { Link, useParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmActionButton from '@/components/ConfirmActionButton';
import ApperIcon from '@/components/ApperIcon';

const FIELDS = [
  'Id', 'Name', 'category_c', 'subcategory_c', 'district_c', 'city_c',
  'area_c', 'pincode_c', 'address_c', 'description_c', 'phone_c',
  'whatsapp_c', 'email_c', 'website_c', 'status_c', 'listing_type_c',
  'is_premium_c', 'is_verified_c', 'rating_c', 'reviews_count_c',
  'hours_c', 'premium_expiry_c', 'slug_c',
];

export const route = {
  path: '/owner/businesses/:id',
  layout: 'owner',
  access: "['BusinessOwner_c', 'Admin_c'].includes(profile)",
};

export default function OwnerBusinessDetail() {
  const { id } = useParams();
  const { profile } = useProfile();
  const isAdmin = profile === 'Admin_c';
  const backRoute = isAdmin ? '/admin/businesses' : '/owner/businesses';

  const { data: business, loading, error, run } = useFetch(async () => {
    const result = await sdk.table('businesses_c').select(FIELDS).get(id);
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [id]);

  async function deactivateBusiness() {
    const result = await sdk.table('businesses_c').update({
      Id: id,
      status_c: 'Deactivated',
      is_premium_c: false,
      listing_type_c: 'Free',
    });
    if (result.messages?.length) toast.error(result.messages[0]);
    if (!result.data?.length) return;

    const [reviews, enquiries, analytics] = await Promise.all([
      sdk.table('reviews_c').select(['Id']).where('business_c', '==', id).fetch(),
      sdk.table('enquiries_c').select(['Id']).where(eq('business_c', id)).fetch(),
      sdk.table('business_analytics_c').select(['Id']).where(eq('business_c', id)).fetch(),
    ]);

    const removals = [
      ...(reviews.data ?? []).map((item) => sdk.table('reviews_c').remove(item.Id)),
      ...(enquiries.data ?? []).map((item) => sdk.table('enquiries_c').remove(item.Id)),
      ...(analytics.data ?? []).map((item) => sdk.table('business_analytics_c').remove(item.Id)),
    ];
    const results = await Promise.all(removals);
    const failed = results.some((item) => item.messages?.length || !item.data?.length);

    toast.success(failed
      ? 'Business deactivated. Some related records need Admin cleanup.'
      : 'Business deactivated. Reviews, enquiries and analytics were cleared; profile and photos remain.');
    run();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={backRoute}><ApperIcon name="ArrowLeft" size={16} /> Back</Link>
      </Button>

      {loading && <div className="mt-5 h-48 animate-pulse rounded-2xl bg-muted" />}
      {error && <p className="mt-5 text-sm text-destructive">{error.message}</p>}
      {!loading && !business && !error && <p className="mt-5 rounded-xl border border-border p-6 text-sm">Business record not found.</p>}

      {business && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Business profile</p>
              <h1 className="mt-2 text-2xl font-extrabold">{business.Name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{business.category_c} • {business.city_c}, {business.district_c}</p>
            </div>
            <Badge>{business.status_c}</Badge>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['Address', business.address_c],
              ['Owner Contact', business.phone_c],
              ['WhatsApp', business.whatsapp_c],
              ['Email', business.email_c],
              ['Listing Type', business.listing_type_c],
              ['Verification', business.is_verified_c ? 'Admin Verified' : 'Not verified'],
              ['Premium', business.is_premium_c ? 'Active' : 'Free listing'],
              ['Premium Expiry', business.premium_expiry_c],
              ['Rating', `${business.rating_c || 0} / 5`],
              ['Business Hours', business.hours_c],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 whitespace-pre-line text-sm font-semibold">{value || '—'}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">{business.description_c}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {!isAdmin && business.status_c !== 'Deactivated' && (
              <Button asChild><Link to={`/owner/businesses/${business.Id}/edit`}>Edit Business</Link></Button>
            )}
            {!isAdmin && business.status_c !== 'Deactivated' && (
              <ConfirmActionButton
                title="Deactivate this business?"
                description="The public listing will be unpublished, Premium status will end, and related reviews, enquiries and analytics will be removed. Profile and photos will remain. Reactivation requires Super Admin approval."
                label="Deactivate Business"
                confirmLabel="Deactivate"
                variant="destructive"
                onConfirm={deactivateBusiness}
              />
            )}
            <Button variant="outline" asChild><Link to={`/businesses/${business.Id}/${business.slug_c || 'business'}`}>View Public Profile</Link></Button>
            <Button variant="outline" asChild><Link to={isAdmin ? '/admin/operations' : '/owner/workspace'}>Open Management Workspace</Link></Button>
          </div>

          {business.status_c === 'Deactivated' && (
            <p className="mt-5 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
              This business is deactivated. Only the Super Admin can approve its reactivation.
            </p>
          )}

          <Button className="mt-3" variant="ghost" onClick={run}><ApperIcon name="RefreshCw" size={15} /> Refresh</Button>
        </section>
      )}
    </div>
  );
}
