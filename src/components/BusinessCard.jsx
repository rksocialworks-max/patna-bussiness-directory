import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ApperIcon from '@/components/ApperIcon';
import { CATEGORIES } from '@/data/directoryOptions';
import { useBusinessCardStyle } from '@/hooks/useBusinessCardStyle';

const CATEGORY_STYLES = {
  'Restaurants & Cafes': {
    bar: 'bg-orange-500', logo: 'bg-orange-500',
    tint: 'bg-orange-50 dark:bg-orange-950/30', chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  Healthcare: {
    bar: 'bg-rose-500', logo: 'bg-rose-500',
    tint: 'bg-rose-50 dark:bg-rose-950/30', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
  Education: {
    bar: 'bg-indigo-500', logo: 'bg-indigo-500',
    tint: 'bg-indigo-50 dark:bg-indigo-950/30', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  },
  'Home Services': {
    bar: 'bg-amber-500', logo: 'bg-amber-500',
    tint: 'bg-amber-50 dark:bg-amber-950/30', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  Shopping: {
    bar: 'bg-pink-500', logo: 'bg-pink-500',
    tint: 'bg-pink-50 dark:bg-pink-950/30', chip: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
  Automobile: {
    bar: 'bg-sky-500', logo: 'bg-sky-500',
    tint: 'bg-sky-50 dark:bg-sky-950/30', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  'Real Estate': {
    bar: 'bg-emerald-500', logo: 'bg-emerald-500',
    tint: 'bg-emerald-50 dark:bg-emerald-950/30', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  'Professional Services': {
    bar: 'bg-violet-500', logo: 'bg-violet-500',
    tint: 'bg-violet-50 dark:bg-violet-950/30', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  'Travel & Hospitality': {
    bar: 'bg-cyan-500', logo: 'bg-cyan-500',
    tint: 'bg-cyan-50 dark:bg-cyan-950/30', chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  },
  'Beauty & Wellness': {
    bar: 'bg-fuchsia-500', logo: 'bg-fuchsia-500',
    tint: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300',
  },
  'Finance & Legal': {
    bar: 'bg-lime-600', logo: 'bg-lime-600',
    tint: 'bg-lime-50 dark:bg-lime-950/30', chip: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300',
  },
  Technology: {
    bar: 'bg-blue-500', logo: 'bg-blue-500',
    tint: 'bg-blue-50 dark:bg-blue-950/30', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
};

const DEFAULT_CATEGORY_STYLE = {
  bar: 'bg-primary', logo: 'bg-primary',
  tint: 'bg-primary/5', chip: 'bg-primary/10 text-primary',
};

function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function BusinessLogo({ business, className = '' }) {
  const src = business.logo_c?.[0]?.url || business.logo_c?.[0]?.Url;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden font-extrabold ${className}`}>
      {src
        ? <img src={src} alt={business.Name + ' logo'} loading="lazy" className="size-full object-cover" />
        : business.Name?.slice(0, 1)?.toUpperCase() ?? 'B'}
    </div>
  );
}

function StatusBadges({ premiumActive, verified, premiumClassName = 'border-0 bg-highlight text-highlight-foreground' }) {
  if (!premiumActive && !verified) return null;
  return (
    <>
      {premiumActive && <Badge className={premiumClassName}>Premium</Badge>}
      {verified && <Badge variant="outline" className="border-success/40 bg-success-muted text-success">Verified</Badge>}
    </>
  );
}

function MetaRow({ business }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <ApperIcon name="Star" size={13} className="fill-highlight text-highlight" />
        {Number(business.rating_c || 0).toFixed(1)} ({business.reviews_count_c || 0})
      </span>
      <span className="inline-flex items-center gap-1">
        <ApperIcon name="MapPin" size={13} />
        {business.area_c || business.city_c || business.district_c || 'Bihar'}
      </span>
    </div>
  );
}

function CardActions({ business, favorite, compared, toggleFavorite, toggleCompare, tone }) {
  const callClass = tone === 'gradient' ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : '';
  const whatsappClass = 'border-success/40 bg-success/10 text-success hover:bg-success/20';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1">
        {business.phone_c && (
          <Button size="sm" variant="outline" className={callClass} asChild>
            <a href={`tel:${business.phone_c}`} aria-label="Call business"><ApperIcon name="Phone" size={14} /> Call</a>
          </Button>
        )}
        {(business.whatsapp_c || business.phone_c) && (
          <Button size="sm" variant="outline" className={whatsappClass} asChild>
            <a href={`https://wa.me/${String(business.whatsapp_c || business.phone_c).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp business">
              <ApperIcon name="MessageCircle" size={14} /> WhatsApp
            </a>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Save favourite" onClick={toggleFavorite}>
          <ApperIcon name="Heart" size={16} className={favorite ? 'fill-destructive text-destructive' : ''} />
        </Button>
        <Button size="sm" variant={compared ? 'secondary' : 'ghost'} onClick={toggleCompare}>{compared ? 'Added' : 'Compare'}</Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/businesses/${business.Id}/${business.slug_c || 'business'}`}>Profile <ApperIcon name="ArrowUpRight" size={14} /></Link>
        </Button>
      </div>
    </div>
  );
}

export default function BusinessCard({ business, compact = false }) {
  const [favorite, setFavorite] = useState(() => readIds('pbd_favorites').includes(business.Id));
  const [compared, setCompared] = useState(() => readIds('pbd_compare').includes(business.Id));
  const variant = useBusinessCardStyle();
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

  const actions = (
    <CardActions
      business={business}
      favorite={favorite}
      compared={compared}
      toggleFavorite={toggleFavorite}
      toggleCompare={toggleCompare}
      tone={variant}
    />
  );

  if (variant === 'editorial') {
    return (
      <article className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-highlight to-chart-3" />
        <div className="p-5 pt-6">
          <div className="flex gap-4">
            <BusinessLogo business={business} className="size-16 rounded-lg bg-foreground text-2xl text-background shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{business.category_c || 'Business'}</p>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">{business.Name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadges premiumActive={premiumActive} verified={business.is_verified_c} premiumClassName="border-amber-300 bg-amber-50 text-amber-800" />
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3">
            <MetaRow business={business} />
            <p className="mt-2 text-xs text-muted-foreground">
              {business.address_c || business.area_c || business.city_c || 'Pattern area'}, {business.district_c || 'Bihar'}
            </p>
          </div>
          {!compact && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{business.description_c}</p>}
        </div>
        <div className="border-t border-border px-5 py-3">{actions}</div>
      </article>
    );
  }

  if (variant === 'vibrant') {
    const palette = CATEGORY_STYLES[business.category_c]
      ?? DEFAULT_CATEGORY_STYLE;
    return (
      <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className={`h-1.5 ${palette.bar}`} />
        <div className={`p-4 ${palette.tint}`}>
          <div className="flex items-start gap-3">
            <BusinessLogo business={business} className={`size-14 rounded-2xl ${palette.logo} text-lg text-white shadow-sm`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-extrabold text-foreground">{business.Name}</h3>
                <StatusBadges premiumActive={premiumActive} verified={business.is_verified_c} premiumClassName="border-0 bg-amber-400 text-amber-950" />
              </div>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${palette.chip}`}>
                {business.category_c || CATEGORIES[0].name}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4 pt-3">
          {!compact && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{business.description_c}</p>}
          <div className={compact ? 'mt-2' : 'mt-3'}><MetaRow business={business} /></div>
        </div>
        <div className="border-t border-border px-4 py-3">{actions}</div>
      </article>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="h-20 bg-gradient-to-br from-primary via-primary/80 to-chart-3" />
      <div className={compact ? 'px-4 pb-4' : 'px-4 pb-5'}>
        <div className="-mt-9 flex items-start gap-3">
          <BusinessLogo business={business} className="size-16 rounded-2xl bg-card text-xl text-primary shadow-lg ring-4 ring-card" />
          <div className="min-w-0 flex-1 pt-10">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold text-foreground">{business.Name}</h3>
              <StatusBadges premiumActive={premiumActive} verified={business.is_verified_c} premiumClassName="border-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950" />
            </div>
            <p className="mt-1 text-xs font-semibold text-primary">{business.category_c || 'Business'}</p>
          </div>
        </div>
        {!compact && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{business.description_c}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2.5 py-1 text-xs font-semibold text-success">
            <ApperIcon name="Star" size={13} className="fill-highlight text-highlight" />
            {Number(business.rating_c || 0).toFixed(1)} ({business.reviews_count_c || 0})
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <ApperIcon name="MapPin" size={13} />
            {business.area_c || business.city_c || business.district_c || 'Bihar'}
          </span>
        </div>
      </div>
      <div className="border-t border-border/70 bg-muted/30 px-4 py-3">{actions}</div>
    </article>
  );
}
