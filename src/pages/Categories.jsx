import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import PublicHeader from '@/components/PublicHeader';
import { CATEGORIES, mergeCategoryRows } from '@/data/directoryOptions';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/categories', layout: 'public', access: 'public' };

export default function Categories() {
  const { data, loading, error, run } = useFetch(async () => {
    const rows = await listDocuments(COLLECTIONS.categoriesPublic, { sort: 'sort_order_c', pageSize: 100 });
    return rows.map((row) => ({ ...row, Id: row.Id ?? row.id }));
  }, []);
  const categoryRows = mergeCategoryRows(data);

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Explore categories</p>
        <h1 className="mt-2 text-3xl font-extrabold">सभी बिज़नेस कैटेगरी</h1>
        <p className="mt-2 text-sm text-muted-foreground">दुकान, सेवा, प्रोफेशनल और स्थानीय बिज़नेस एक ही जगह।</p>
        {loading && <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"><div className="h-28 animate-pulse rounded-2xl bg-muted" /><div className="h-28 animate-pulse rounded-2xl bg-muted" /></div>}
        {error && <p className="mt-5 text-sm text-destructive">{error.message}<button className="ml-2 underline" onClick={run}>Retry</button></p>}
        {!loading && <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categoryRows.map((category) => {
            const style = CATEGORIES.find((item) => item.name === category.Name);
            return <Link key={category.Id} to={`/businesses?category=${encodeURIComponent(category.Name)}`} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-md">
              <span className={`flex size-12 items-center justify-center rounded-xl ${style?.color ?? 'bg-primary/10 text-primary'}`}><ApperIcon name={style?.icon ?? 'Grid3X3'} size={22} /></span>
              <h2 className="mt-4 font-bold">{style?.hindi ?? category.Name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{category.Name}</p>
            </Link>;
          })}
        </div>}
        {!loading && categoryRows.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No active categories available.</p>}
      </main>
    </div>
  );
}
