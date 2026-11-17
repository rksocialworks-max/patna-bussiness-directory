import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ApperIcon from '@/components/ApperIcon';

function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function BusinessCard({ business, compact = false }) {
  const [favorite, setFavorite] = useState(() => readIds('pbd_favorites').includes(business.Id));
  const [compared, setCompared] = useState(() => readIds('pbd_compare').includes(business.Id));
  const premiumActive = Boolean(business.is_premium_c) && (!business.premium_expiry_c || business.premium_expiry_c >= new Date().toISOString().slice(0, 10));

  function toggleFavorite() {
    const ids = readIds('pbd_favorites');
    const next = ids.includes(business.Id) ? ids.filter((id) => id !== business.Id) : [...ids, business.Id];
    localStorage.setItem('pbd_favorites', JSON.stringify(next));
    setFavorite(next.includes(business.Id));
    toast.success(next.includes(business.Id) ? 'Saved to favourites.' : 'Removed from favourites.');
  }

  function toggleCompare() {
    const ids = readIds('pbd_compare');
    if (ids.includes(business.Id)) {
      const next = ids.filter((id) => id !== business.Id);
      localStorage.setItem('pbd_compare', JSON.stringify(next));
      setCompared(false);
      return;
    }
    if (ids.length >= 4) {
      toast.error('You can compare up to 4 businesses.');
      return;
    }
    const next = [...ids, business.Id];
    localStorage.setItem('pbd_compare', JSON.stringify(next));
    setCompared(true);
    toast.success('Added to comparison.');
  }

  return (
    <article className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">
          {business.logo_c?.[0]?.url || business.logo_c?.[0]?.Url
            ? <img src={business.logo_c?.[0]?.url ?? business.logo_c?.[0]?.Url} alt={business.Name + ' logo'} loading="lazy" className="size-full object-cover" />
            : business.Name?.slice(0, 1)?.toUpperCase() ?? 'B'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-foreground">{business.Name}</h3>
            {premiumActive && <Badge className="border-0 bg-highlight text-highlight-foreground">Premium</Badge>}
            {business.is_verified_c && <Badge variant="outline" className="border-success/40 bg-success-muted text-success">Verified</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{business.category_c} • {business.city_c}, {business.district_c}</p>
          {!compact && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{business.description_c}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ApperIcon name="Star" size={13} className="fill-highlight text-highlight" /> {Number(business.rating_c || 0).toFixed(1)} ({business.reviews_count_c || 0})</span>
            <span className="inline-flex items-center gap-1"><ApperIcon name="MapPin" size={13} /> {business.area_c || business.city_c}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-1">
          {business.phone_c && <Button size="sm" variant="outline" asChild><a href={`tel:${business.phone_c}`} aria-label="Call business"><ApperIcon name="Phone" size={14} /> Call</a></Button>}
          {(business.whatsapp_c || business.phone_c) && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${String(business.whatsapp_c || business.phone_c).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp business"><ApperIcon name="MessageCircle" size={14} /> WhatsApp</a></Button>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Save favourite" onClick={toggleFavorite}><ApperIcon name="Heart" size={16} className={favorite ? 'fill-destructive text-destructive' : ''} /></Button>
          <Button size="sm" variant={compared ? 'secondary' : 'ghost'} onClick={toggleCompare}>{compared ? 'Added' : 'Compare'}</Button>
          <Button size="sm" variant="outline" asChild><Link to={`/businesses/${business.Id}/${business.slug_c || 'business'}`}>Profile <ApperIcon name="ArrowUpRight" size={14} /></Link></Button>
        </div>
      </div>
    </article>
  );
}
