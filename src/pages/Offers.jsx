import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import PublicHeader from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/offers', layout: 'public', access: 'public' };

export default function Offers() {
  const { data, loading, error, run } = useFetch(async () => {
    const [offers, coupons] = await Promise.all([
      sdk.table('offers_c').select(['Id', 'Name', 'business_c', 'description_c', 'discount_c', 'start_date_c', 'end_date_c', 'status_c']).fetch(),
      sdk.table('coupons_c').select(['Id', 'Name', 'business_c', 'code_c', 'discount_c', 'valid_from_c', 'valid_to_c', 'status_c']).fetch(),
    ]);
    if (!offers.success) throw new Error(offers.message);
    if (!coupons.success) throw new Error(coupons.message);
    return { offers: offers.data, coupons: coupons.data };
  }, []);

  const offers = data?.offers ?? [];
  const coupons = data?.coupons ?? [];

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Local deals</p>
        <h1 className="mt-2 text-3xl font-extrabold">Offers & Discounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">बिहार के स्थानीय बिज़नेस के Admin-approved offers और coupons।</p>
        {error && <p className="mt-6 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></p>}
        {loading && <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="h-44 animate-pulse rounded-2xl bg-muted" /><div className="h-44 animate-pulse rounded-2xl bg-muted" /></div>}
        {!loading && offers.length === 0 && coupons.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center"><ApperIcon name="Tags" size={32} className="mx-auto text-muted-foreground" /><p className="mt-3 font-semibold">No active offers yet</p><p className="mt-1 text-sm text-muted-foreground">Approved offers will appear here.</p></div>}
        {offers.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold">Special Offers</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{offers.map((offer) => <article key={offer.Id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-2"><Badge className="bg-highlight text-highlight-foreground">{offer.discount_c || 'Special Offer'}</Badge><span className="text-xs text-muted-foreground">{offer.status_c}</span></div><h3 className="mt-4 font-bold">{offer.Name}</h3><p className="mt-2 text-sm text-muted-foreground">{offer.description_c}</p><p className="mt-3 text-xs text-muted-foreground">{offer.business_c?.Name || 'Local business'}</p><p className="mt-1 text-xs text-muted-foreground">Valid: {offer.start_date_c} to {offer.end_date_c}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link to={`/offers/${offer.Id}`}>View Offer</Link></Button><Button size="sm" variant="ghost" asChild><Link to={offer.business_c?.Id ? `/businesses/${offer.business_c.Id}/business` : '/businesses'}>View Business</Link></Button></div></article>)}</div></section>}
        {coupons.length > 0 && <section className="mt-10"><h2 className="text-xl font-bold">Coupon Codes</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.map((coupon) => <article key={coupon.Id} className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">Coupon code</span><Badge>{coupon.discount_c}</Badge></div><p className="mt-2 text-2xl font-extrabold tracking-widest">{coupon.code_c}</p><p className="mt-2 text-sm text-muted-foreground">{coupon.business_c?.Name}</p><p className="mt-2 text-xs text-muted-foreground">Valid until {coupon.valid_to_c}</p><Button size="sm" variant="outline" className="mt-4" onClick={() => { navigator.clipboard?.writeText(coupon.code_c); }}>Copy Code</Button></article>)}</div></section>}
      </main>
    </div>
  );
}
