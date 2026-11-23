import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS, updateDocument, deleteDocument } from '@/services/firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { backfillPublicDirectory } from '@/services/firebase/functions';


export const route = { path: '/admin/businesses', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { icon: 'ClipboardCheck', label: 'Business Listings', section: 'Administration', profiles: ['Admin_c'], order: 2 };

export default function AdminBusinesses() {
  const [priorityDrafts, setPriorityDrafts] = useState({});
  const [syncingPublicDirectory, setSyncingPublicDirectory] = useState(false);
  const { data, loading, error, run } = useFetch(async () => {
    const result = await listDocuments(COLLECTIONS.businesses, { sort: 'CreatedOn', direction: 'desc', pageSize: 100 });
    return result.map((row) => ({ ...row, Id: row.Id ?? row.id }));
  }, []);

  async function rebuildPublicDirectory() {
    setSyncingPublicDirectory(true);
    try {
      const result = await backfillPublicDirectory();
      const businesses = result?.results?.businesses;
      toast.success(`Public directory sync completed. ${businesses?.published ?? 0} approved businesses published.`);
    } catch (error) {
      toast.error(error.message || 'Public directory sync failed.');
    } finally {
      setSyncingPublicDirectory(false);
    }
  }


  async function setStatus(record, status) {
    try { await updateDocument(COLLECTIONS.businesses, record.Id, { status_c: status }); toast.success(`${record.Name}: ${status}`); run(); }
    catch (error) { toast.error(error.message || 'Could not update listing status.'); }
  }

  async function toggleFlag(record, field, label) {
    const nextValue = !record[field];
    try { await updateDocument(COLLECTIONS.businesses, record.Id, { [field]: nextValue }); toast.success(`${record.Name}: ${label} ${nextValue ? 'enabled' : 'disabled'}.`); run(); }
    catch (error) { toast.error(error.message || 'Could not update listing.'); }
  }

  async function updatePriority(record) {
    const value = Number(priorityDrafts[record.Id] ?? record.featured_order_c ?? 99);
    if (!Number.isFinite(value) || value < 1) {
      toast.error('Priority must be a positive number.');
      return;
    }
    try { await updateDocument(COLLECTIONS.businesses, record.Id, { featured_order_c: value }); toast.success('Homepage priority saved.'); run(); }
    catch (error) { toast.error(error.message || 'Could not save priority.'); }
  }

  async function deleteBusiness(record) {
    try { await deleteDocument(COLLECTIONS.businesses, record.Id); toast.success(`${record.Name} deleted.`); run(); }
    catch (error) { toast.error(error.message || 'Could not delete listing.'); }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Moderation</p>
      <h1 className="mt-2 text-3xl font-extrabold">Business Listings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Approve listings, review verification documents and select popular businesses for the homepage.</p>
      {error && <div className="mt-6 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></div>}
      {loading && <div className="mt-7 space-y-3"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /></div>}
      <div className="mt-5 flex justify-end">
        <Button variant="outline" disabled={syncingPublicDirectory} onClick={rebuildPublicDirectory}>{syncingPublicDirectory ? 'Syncing public directory…' : 'Rebuild Public Directory'}</Button>
      </div>
      {!loading && data && (
        <div className="mt-7 space-y-3">
          {data.map((item) => (
            <article key={item.Id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{item.Name}</p><Badge variant={item.status_c === 'Approved' ? 'secondary' : 'outline'}>{item.status_c}</Badge>{item.is_premium_c && <Badge className="bg-highlight text-highlight-foreground">Premium</Badge>}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.owner_name_c} • {item.category_c} • {item.city_c}, {item.district_c}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]"><Badge variant="outline">{item.is_verified_c ? 'Verified' : 'Not Verified'}</Badge><Badge variant="outline">{item.is_popular_c ? 'Popular on Homepage' : 'Not Popular'}</Badge></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild><Link to={`/owner/businesses/${item.Id}/edit`}>Edit</Link></Button>
                  {item.status_c !== 'Approved' && <Button size="sm" onClick={() => setStatus(item, 'Approved')}>Approve</Button>}
                  {item.status_c !== 'Rejected' && <Button size="sm" variant="outline" onClick={() => setStatus(item, 'Rejected')}>Reject</Button>}
                  {item.status_c !== 'Changes Requested' && <Button size="sm" variant="ghost" onClick={() => setStatus(item, 'Changes Requested')}>Request Changes</Button>}
                  <Button size="sm" variant="outline" onClick={() => toggleFlag(item, 'is_verified_c', 'Verification')}>{item.is_verified_c ? 'Remove Verified' : 'Verify'}</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleFlag(item, 'is_popular_c', 'Homepage Popular')}>{item.is_popular_c ? 'Unmark Popular' : 'Mark Popular'}</Button>
                  {item.is_premium_c && <div className="flex items-center gap-1"><Input type="number" min="1" className="h-8 w-16" value={priorityDrafts[item.Id] ?? item.featured_order_c ?? 99} onChange={(event) => setPriorityDrafts((current) => ({ ...current, [item.Id]: event.target.value }))} aria-label="Premium priority" /><Button size="sm" variant="outline" onClick={() => updatePriority(item)}>Save Priority</Button></div>}
                  <ConfirmDeleteButton title={`Delete ${item.Name}?`} description="This business listing and its directory record will be permanently removed." onConfirm={() => deleteBusiness(item)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
