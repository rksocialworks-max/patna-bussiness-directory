import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import PublicHeader from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

const FIELDS = ['Id', 'Name', 'category_c', 'district_c', 'city_c', 'address_c', 'description_c', 'rating_c', 'reviews_count_c', 'is_verified_c', 'is_premium_c', 'premium_expiry_c', 'hours_c', 'phone_c', 'whatsapp_c', 'website_c', 'slug_c'];

function readCompare() {
  try {
    return JSON.parse(localStorage.getItem('pbd_compare') || '[]');
  } catch {
    return [];
  }
}

export const route = { path: '/compare', layout: 'public', access: 'public' };

export default function Compare() {
  const [ids, setIds] = useState(readCompare);
  const { data, loading, error, run } = useFetch(async () => {
    if (!ids.length) return [];
    const rows = await listDocuments(COLLECTIONS.businessPublic, {
      filters: [{ field: 'id', op: 'in', value: ids }],
      pageSize: 4,
    });
    return rows.map((row) => ({ ...row, Id: row.Id ?? row.id }));
  }, [ids.join('|')]);

  function remove(id) {
    const next = ids.filter((item) => item !== id);
    localStorage.setItem('pbd_compare', JSON.stringify(next));
    setIds(next);
  }

  function clear() {
    localStorage.setItem('pbd_compare', JSON.stringify([]));
    setIds([]);
  }

  const rows = data ?? [];
  const fields = [
    ['Category', (item) => item.category_c],
    ['Location', (item) => `${item.city_c}, ${item.district_c}`],
    ['Address', (item) => item.address_c],
    ['Rating', (item) => `${item.rating_c || 0} / 5`],
    ['Reviews', (item) => item.reviews_count_c || 0],
    ['Verified', (item) => item.is_verified_c ? 'Yes' : 'No'],
    ['Premium', (item) => item.is_premium_c ? 'Yes' : 'No'],
    ['Business Hours', (item) => item.hours_c],
  ];

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Compare 2–4 listings</p><h1 className="mt-2 text-3xl font-extrabold">Business Comparison</h1><p className="mt-2 text-sm text-muted-foreground">स्थान, रेटिंग, सुविधाएँ और संपर्क जानकारी की तुलना करें।</p></div>{ids.length > 0 && <Button variant="outline" onClick={clear}>Clear</Button>}</div>
        {error && <p className="mt-6 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></p>}
        {loading && <div className="mt-7 h-48 animate-pulse rounded-2xl bg-muted" />}
        {!loading && rows.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><ApperIcon name="GitCompareArrows" size={32} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No businesses selected</h2><p className="mt-1 text-sm text-muted-foreground">Business cards पर Compare दबाकर 2 से 4 businesses चुनें।</p><Button asChild className="mt-4"><Link to="/businesses">Find Businesses</Link></Button></div>}
        {!loading && rows.length > 0 && <div className="mt-7 overflow-x-auto rounded-2xl border border-border bg-card"><table className="min-w-[680px] w-full border-collapse text-sm"><thead><tr><th className="w-40 border-b border-border bg-muted/50 p-4 text-left">Details</th>{rows.map((item) => <th key={item.Id} className="min-w-52 border-b border-border p-4 text-left align-top"><p className="font-bold">{item.Name}</p><Button size="sm" variant="ghost" className="mt-2" onClick={() => remove(item.Id)}>Remove</Button><Link to={`/businesses/${item.Id}/${item.slug_c || 'business'}`} className="ml-2 text-xs text-primary underline">View Profile</Link></th>)}</tr></thead><tbody>{fields.map(([label, getValue]) => <tr key={label}><th className="border-b border-border bg-muted/30 p-4 text-left font-semibold">{label}</th>{rows.map((item) => <td key={item.Id} className="border-b border-border p-4 text-muted-foreground">{getValue(item) || '—'}</td>)}</tr>)}</tbody></table></div>}
      </main>
    </div>
  );
}
