import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import { CATEGORIES, BIHAR_DISTRICTS } from '@/data/directoryOptions';
import BusinessCard from '@/components/BusinessCard';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function HomepageSections() {
  const [district, setDistrict] = useState('Patna');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  const { data: businesses, loading: businessLoading } = useFetch(async () => {
    const result = await listDocuments(COLLECTIONS.businessPublic, { pageSize: 100 });
    return result.map((row) => ({ ...row, Id: row.Id ?? row.id }));
  }, []);

  const { data: offers } = useFetch(async () => {
    const result = await listDocuments(COLLECTIONS.offersPublic, { pageSize: 100 });
    return result.map((row) => ({ ...row, Id: row.Id ?? row.id })).filter((offer) => offer.status_c === 'Approved' && offer.is_homepage_featured_c);
  }, []);

  const { data: orderSetting } = useFetch(async () => {
    const result = await listDocuments(COLLECTIONS.siteSettingsPublic, { pageSize: 100 });
    return result.find((item) => item.setting_key_c === 'homepage_section_order')?.setting_value_c;
  }, []);

  const rows = businesses ?? [];
  const premium = rows.filter((item) => item.is_premium_c && (!item.premium_expiry_c || item.premium_expiry_c >= new Date().toISOString().slice(0, 10))).sort((a, b) => Number(a.featured_order_c || 99) - Number(b.featured_order_c || 99)).slice(0, 6);
  const verified = rows.filter((item) => item.is_verified_c).slice(0, 6);
  const popular = rows.filter((item) => item.is_popular_c).slice(0, 6);
  const newest = [...rows].sort((a, b) => String(b.CreatedOn || '').localeCompare(String(a.CreatedOn || ''))).slice(0, 4);
  const nearby = useMemo(() => {
    if (location) {
      return rows.map((item) => ({ ...item, distance: item.latitude_c && item.longitude_c ? distanceKm(location, { latitude: Number(item.latitude_c), longitude: Number(item.longitude_c) }) : Infinity }))
        .filter((item) => item.distance <= 5).sort((a, b) => a.distance - b.distance).slice(0, 4);
    }
    return rows.filter((item) => item.district_c?.toLowerCase() === district.toLowerCase()).slice(0, 4);
  }, [rows, location, district]);

  const defaultOrder = ['premium', 'verified', 'popular', 'new', 'nearby', 'offers'];
  const sectionOrder = String(orderSetting || defaultOrder.join(',')).split(',').map((item) => item.trim()).filter((item) => defaultOrder.includes(item));
  const sections = {
    premium: { title: 'Premium Businesses', subtitle: 'विशेष रूप से प्रदर्शित बिज़नेस।', eyebrow: 'Featured partners', items: premium },
    verified: { title: 'Verified Businesses', subtitle: 'Admin द्वारा जाँचे और सत्यापित बिज़नेस।', eyebrow: 'Trusted listings', items: verified },
    popular: { title: 'Popular Businesses', subtitle: 'Super Admin द्वारा चुने गए लोकप्रिय बिज़नेस।', eyebrow: 'Popular in Bihar', items: popular },
    new: { title: 'Newly Registered Businesses', subtitle: 'हाल ही में approved हुए बिज़नेस।', eyebrow: 'Recently added', items: newest },
    nearby: { title: 'Nearby Businesses', subtitle: 'अपने आसपास के बिज़नेस खोजें।', eyebrow: 'Around you', items: nearby },
    offers: { title: 'Special Offers & Discounts', subtitle: 'Admin द्वारा homepage के लिए चुने गए offers।', eyebrow: 'Local deals', items: offers ?? [] },
  };

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationError('Location access is not available in this browser.');
      return;
    }
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocationError('Location permission denied. Choose your district manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div>
      {sectionOrder.map((key) => {
        const section = sections[key];
        if (!section) return null;
        if (key === 'nearby') {
          return <section key={key} className="mx-auto max-w-7xl px-4 py-12 md:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold md:text-3xl">{section.title}</h2><p className="mt-2 text-sm text-muted-foreground">{section.subtitle}</p></div><div className="flex flex-wrap gap-2"><select value={district} onChange={(event) => { setDistrict(event.target.value); setLocation(null); }} className="h-9 rounded-md border border-input bg-background px-2 text-xs">{BIHAR_DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}</select><Button size="sm" variant="outline" onClick={locateMe}><ApperIcon name="LocateFixed" size={14} /> Use My Location</Button></div></div>
            {locationError && <p className="mt-2 text-xs text-destructive">{locationError}</p>}
            {location && <p className="mt-2 text-xs text-muted-foreground">Nearby businesses within 5 KM of your current location.</p>}
            {businessLoading && <p className="mt-5 text-sm text-muted-foreground">Loading nearby businesses…</p>}
            {!businessLoading && nearby.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{nearby.map((item) => <BusinessCard key={item.Id} business={item} compact />)}</div>}
            {!businessLoading && nearby.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No businesses found in this nearby area yet.</p>}
          </section>;
        }
        if (key === 'offers') {
          return <section key={key} className="bg-muted/50 py-12"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold md:text-3xl">{section.title}</h2><p className="mt-2 text-sm text-muted-foreground">{section.subtitle}</p></div><Button variant="outline" asChild><Link to="/offers">All Offers</Link></Button></div>{section.items.length > 0 ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{section.items.slice(0, 4).map((offer) => <article key={offer.Id} className="rounded-2xl border border-border bg-card p-5"><span className="inline-flex rounded-full bg-highlight/20 px-3 py-1 text-xs font-bold text-highlight-foreground">{offer.discount_c || 'Special Offer'}</span><h3 className="mt-3 font-bold">{offer.Name}</h3><p className="mt-2 text-sm text-muted-foreground">{offer.description_c}</p><p className="mt-2 text-xs text-muted-foreground">{offer.business_c?.Name}</p></article>)}</div> : <p className="mt-5 text-sm text-muted-foreground">No featured offers available yet.</p>}</div></section>;
        }
        if (key === 'premium' || key === 'verified' || key === 'popular' || key === 'new') {
          return <section key={key} className={key === 'premium' ? 'bg-muted/50 py-12' : 'mx-auto max-w-7xl px-4 py-12 md:px-8'}>
            <div className="mx-auto max-w-7xl"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold md:text-3xl">{section.title}</h2><p className="mt-2 text-sm text-muted-foreground">{section.subtitle}</p></div><Button variant="ghost" asChild><Link to="/businesses">View All <ApperIcon name="ArrowRight" size={15} /></Link></Button></div>
              {businessLoading && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>}
              {!businessLoading && section.items.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{section.items.slice(0, 6).map((item) => <BusinessCard key={item.Id} business={item} compact={key === 'new'} />)}</div>}
              {!businessLoading && section.items.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No listings in this section yet.</p>}
            </div>
          </section>;
        }
        return null;
      })}
    </div>
  );
}
