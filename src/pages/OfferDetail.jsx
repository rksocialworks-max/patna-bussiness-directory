import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/layouts/RootLayout';
import { useFetch } from '@/hooks/useFetch';
import { getDocument, updateDocument, deleteDocument, COLLECTIONS } from '@/services/firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import PublicHeader from '@/components/PublicHeader';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/offers/:id', layout: 'public', access: 'public' };

export default function OfferDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.profile === 'Admin_c';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    Name: '',
    description_c: '',
    discount_c: '',
    start_date_c: '',
    end_date_c: '',
    status_c: 'Pending',
    is_homepage_featured_c: false,
  });

  const { data: offer, loading, error, run } = useFetch(async () => {
    const collectionName = isAdmin ? COLLECTIONS.offers : COLLECTIONS.offersPublic;
    const result = await getDocument(collectionName, id);
    return result ? { ...result, Id: result.Id ?? result.id } : null;
  }, [id, isAdmin]);

  useEffect(() => {
    if (!offer) return;
    setForm({
      Name: offer.Name ?? '',
      description_c: offer.description_c ?? '',
      discount_c: offer.discount_c ?? '',
      start_date_c: offer.start_date_c ?? '',
      end_date_c: offer.end_date_c ?? '',
      status_c: offer.status_c ?? 'Approved',
      is_homepage_featured_c: Boolean(offer.is_homepage_featured_c),
    });
  }, [offer]);

  async function save(event) {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await updateDocument(COLLECTIONS.offers, id, {
        Name: form.Name.trim(),
        description_c: form.description_c.trim(),
        discount_c: form.discount_c.trim(),
        start_date_c: form.start_date_c,
        end_date_c: form.end_date_c,
        status_c: form.status_c,
        is_homepage_featured_c: form.is_homepage_featured_c,
      });
      toast.success('Offer updated.');
      setEditing(false);
      run();
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to update offer.');
    } finally {
      setSaving(false);
    }
  }

  async function removeOffer() {
    if (!isAdmin) return;
    try {
      await deleteDocument(COLLECTIONS.offers, id);
      toast.success('Offer deleted.');
      window.location.assign('/offers');
    } catch (error) {
      toast.error(error.message || 'Unable to delete offer.');
    }
  }

  if (loading) return <div className="min-h-svh bg-background"><PublicHeader /><div className="mx-auto max-w-3xl p-8"><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div></div>;
  if (error || !offer) return <div className="min-h-svh bg-background"><PublicHeader /><div className="mx-auto max-w-3xl p-8 text-center"><p className="text-sm text-destructive">{error?.message || 'Offer not found.'}</p><Button asChild className="mt-4"><Link to="/offers">Back to Offers</Link></Button></div></div>;

  const businessId = typeof offer.business_c === 'string'
    ? offer.business_c
    : offer.business_c?.Id ?? offer.business_c?.id;
  const businessUrl = businessId ? '/businesses/' + businessId : '/businesses';

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <Button variant="ghost" size="sm" asChild><Link to="/offers"><ApperIcon name="ArrowLeft" size={16} /> Back to Offers</Link></Button>
        <article className="mt-5 rounded-2xl border border-border bg-card p-6 md:p-8">
          {!editing ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge className="bg-highlight text-highlight-foreground">{offer.discount_c || 'Special Offer'}</Badge>
                <Badge variant="outline">{offer.status_c || 'Approved'}</Badge>
              </div>
              <h1 className="mt-5 text-3xl font-extrabold">{offer.Name}</h1>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{offer.description_c}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Valid From</p><p className="mt-1 font-semibold">{offer.start_date_c || '—'}</p></div>
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Valid Until</p><p className="mt-1 font-semibold">{offer.end_date_c || '—'}</p></div>
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Homepage Featured</p><p className="mt-1 font-semibold">{offer.is_homepage_featured_c ? 'Yes' : 'No'}</p></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild><Link to={businessUrl}>View Business</Link></Button>
                {isAdmin && <Button variant="outline" onClick={() => setEditing(true)}>Edit Offer</Button>}
                {isAdmin && <ConfirmDeleteButton title="Delete this offer?" description="This offer will be permanently removed." onConfirm={removeOffer} />}
              </div>
            </>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <h1 className="text-2xl font-extrabold">Edit Offer</h1>
              <label className="block space-y-1"><span className="text-xs font-semibold">Offer Name</span><Input required value={form.Name} onChange={(event) => setForm((current) => ({ ...current, Name: event.target.value }))} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold">Details</span><Textarea rows={4} value={form.description_c} onChange={(event) => setForm((current) => ({ ...current, description_c: event.target.value }))} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold">Discount</span><Input value={form.discount_c} onChange={(event) => setForm((current) => ({ ...current, discount_c: event.target.value }))} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1"><span className="text-xs font-semibold">Start Date</span><Input type="date" value={form.start_date_c} onChange={(event) => setForm((current) => ({ ...current, start_date_c: event.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-xs font-semibold">End Date</span><Input type="date" value={form.end_date_c} onChange={(event) => setForm((current) => ({ ...current, end_date_c: event.target.value }))} /></label>
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold">Approval Status</span><select value={form.status_c} onChange={(event) => setForm((current) => ({ ...current, status_c: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Pending</option><option>Approved</option><option>Expired</option></select></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_homepage_featured_c} onChange={(event) => setForm((current) => ({ ...current, is_homepage_featured_c: event.target.checked }))} /> Feature on Homepage</label>
              <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
            </form>
          )}
        </article>
      </main>
    </div>
  );
}
