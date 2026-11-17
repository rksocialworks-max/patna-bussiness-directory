import { Link } from 'react-router-dom';
import PublicHeader from '@/components/PublicHeader';
import { BIHAR_DISTRICTS } from '@/data/directoryOptions';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/districts', layout: 'public', access: 'public' };

export default function Districts() {
  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Local discovery</p>
        <h1 className="mt-2 text-3xl font-extrabold">बिहार के सभी 38 जिले</h1>
        <p className="mt-2 text-sm text-muted-foreground">अपने जिले में उपलब्ध दुकानों और सेवाओं को खोजें।</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {BIHAR_DISTRICTS.map((district) => (
            <Link key={district} to={`/businesses?district=${encodeURIComponent(district)}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5">
              <span>{district}</span>
              <ApperIcon name="ArrowUpRight" size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
