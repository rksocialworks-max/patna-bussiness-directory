import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import PublicHeader from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/pages/:slug', layout: 'public', access: 'public' };

export default function PublicContentPage() {
  const { slug } = useParams();
  const { data: page, loading, error, run } = useFetch(async () => {
    const rows = await listDocuments(COLLECTIONS.contentPagesPublic, {
      filters: [{ field: 'slug_c', value: slug }],
      pageSize: 1,
    });
    const row = rows[0];
    return row ? { ...row, Id: row.Id ?? row.id } : null;
  }, [slug]);

  useEffect(() => {
    if (!page) return;
    document.title = page.seo_title_c || page.Name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = page.meta_description_c || '';
  }, [page]);

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <Button variant="ghost" size="sm" asChild><Link to="/"><ApperIcon name="ArrowLeft" size={16} /> Back to Home</Link></Button>
        {loading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />}
        {error && <p className="mt-6 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></p>}
        {!loading && !page && !error && <div className="mt-8 rounded-2xl border border-border p-8 text-center"><h1 className="text-xl font-bold">Page not found</h1></div>}
        {page && <article className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-10"><p className="text-xs font-bold uppercase tracking-widest text-primary">Patna Business Directory</p><h1 className="mt-3 text-3xl font-extrabold">{page.Name}</h1><div className="mt-7 whitespace-pre-line text-sm leading-8 text-muted-foreground">{page.body_c}</div></article>}
      </main>
    </div>
  );
}
