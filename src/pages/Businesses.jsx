import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import BusinessCard from '@/components/BusinessCard';
import PublicHeader from '@/components/PublicHeader';
import { CATEGORIES, BIHAR_DISTRICTS } from '@/data/directoryOptions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

const FIELDS = [
  'Id', 'Name', 'category_c', 'subcategory_c', 'district_c', 'city_c', 'area_c', 'pincode_c',
  'description_c', 'phone_c', 'whatsapp_c', 'logo_c', 'is_premium_c', 'is_verified_c', 'rating_c',
  'reviews_count_c', 'status_c', 'CreatedOn', 'latitude_c', 'longitude_c', 'premium_expiry_c', 'slug_c',
];

function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export const route = { path: '/businesses', layout: 'public', access: 'public' };

export default function Businesses() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [district, setDistrict] = useState(params.get('district') ?? '');
  const [city, setCity] = useState(params.get('city') ?? '');
  const [area, setArea] = useState(params.get('area') ?? '');
  const [pincode, setPincode] = useState(params.get('pincode') ?? '');
  const [subcategory, setSubcategory] = useState(params.get('subcategory') ?? '');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [sort, setSort] = useState('relevant');
  const [view, setView] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(12);

  const { data: categoryRows } = useFetch(async () => {
    const result = await sdk.table('categories_c').select(['Id', 'Name', 'status_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, []);

  const { data, loading, error, run } = useFetch(async () => {
    const result = await listDocuments(COLLECTIONS.businesses, { pageSize: 100 });
    const normalized = result.map((row) => ({ ...row, Id: row.Id ?? row.id }));
    const matches = (value, term) => String(value ?? '').toLocaleLowerCase().includes(term.toLocaleLowerCase());
    return normalized.filter((row) =>
      (!search.trim() || matches(row.Name, search.trim())) &&
      (!category || row.category_c === category) &&
      (!district || row.district_c === district) &&
      (!city.trim() || matches(row.city_c, city.trim())) &&
      (!area.trim() || matches(row.area_c, area.trim())) &&
      (!pincode.trim() || String(row.pincode_c ?? '') === pincode.trim()) &&
      (!subcategory.trim() || matches(row.subcategory_c, subcategory.trim()))
    );
  }, [search, category, district, city, area, pincode, subcategory]);

  const rows = useMemo(() => {
    let result = [...(data ?? [])];
    if (verifiedOnly) result = result.filter((item) => item.is_verified_c);
    if (premiumOnly) result = result.filter((item) => item.is_premium_c && (!item.premium_expiry_c || item.premium_expiry_c >= new Date().toISOString().slice(0, 10)));
    if (nearby && location) {
      result = result.map((item) => ({
        ...item,
        _distance: item.latitude_c && item.longitude_c
          ? distanceKm(location, { latitude: Number(item.latitude_c), longitude: Number(item.longitude_c) })
          : Infinity,
      })).filter((item) => item._distance <= 5);
    }
    if (sort === 'premium') result.sort((a, b) => Number(Boolean(b.is_premium_c && (!b.premium_expiry_c || b.premium_expiry_c >= new Date().toISOString().slice(0, 10)))) - Number(Boolean(a.is_premium_c && (!a.premium_expiry_c || a.premium_expiry_c >= new Date().toISOString().slice(0, 10)))));
    if (sort === 'rating') result.sort((a, b) => Number(b.rating_c || 0) - Number(a.rating_c || 0));
    if (sort === 'newest') result.sort((a, b) => String(b.CreatedOn || '').localeCompare(String(a.CreatedOn || '')));
    if (sort === 'name') result.sort((a, b) => String(a.Name || '').localeCompare(String(b.Name || '')));
    if (sort === 'nearest' && location) result.sort((a, b) => (a._distance ?? distanceKm(location, { latitude: Number(a.latitude_c), longitude: Number(a.longitude_c) })) - (b._distance ?? distanceKm(location, { latitude: Number(b.latitude_c), longitude: Number(b.longitude_c) })));
    if (sort === 'relevant') result.sort((a, b) => Number(Boolean(b.is_premium_c && (!b.premium_expiry_c || b.premium_expiry_c >= new Date().toISOString().slice(0, 10)))) - Number(Boolean(a.is_premium_c && (!a.premium_expiry_c || a.premium_expiry_c >= new Date().toISOString().slice(0, 10)))) || Number(b.rating_c || 0) - Number(a.rating_c || 0));
    return result;
  }, [data, verifiedOnly, premiumOnly, nearby, location, sort]);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access.');
      return;
    }
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setNearby(true);
        setSort('nearest');
      },
      () => setLocationError('Location permission was not granted. Choose a district or city instead.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function resetFilters() {
    setSearch('');
    setCategory('');
    setDistrict('');
    setCity('');
    setArea('');
    setPincode('');
    setSubcategory('');
    setVerifiedOnly(false);
    setPremiumOnly(false);
    setNearby(false);
    setLocation(null);
    setLocationError('');
    setSort('relevant');
    setVisibleCount(12);
  }

  const mapQuery = nearby && location
    ? `businesses near ${location.latitude},${location.longitude}`
    : `businesses in ${district || 'Bihar'}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Explore local businesses</p><h1 className="mt-2 text-3xl font-extrabold">सभी बिज़नेस</h1><p className="mt-2 text-sm text-muted-foreground">बिहार के अलग-अलग जिलों में बिज़नेस और सेवाएँ खोजें।</p></div>
          <div className="text-sm text-muted-foreground">{rows.length} listings found</div>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <div className="relative"><ApperIcon name="Search" size={17} className="absolute left-3 top-3 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="Business name खोजें..." className="pl-9" /></div>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">सभी कैटेगरी</option>{(categoryRows ?? []).map((item) => <option key={item.Id} value={item.Name}>{CATEGORIES.find((categoryItem) => categoryItem.name === item.Name)?.hindi || item.Name}</option>)}</select>
            <select value={district} onChange={(event) => setDistrict(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">सभी जिले</option>{BIHAR_DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer text-sm font-semibold">Advanced Filters & Nearby Search</summary>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} /> Verified only</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={premiumOnly} onChange={(event) => setPremiumOnly(event.target.checked)} /> Premium only</label>
              <Button type="button" variant={nearby ? 'default' : 'outline'} size="sm" onClick={locateMe}><ApperIcon name="LocateFixed" size={15} /> Search Nearby (5 KM)</Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input value={subcategory} onChange={(event) => setSubcategory(event.target.value)} placeholder="Subcategory" />
              <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City / Town" />
              <Input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Block / Locality" />
              <Input value={pincode} onChange={(event) => setPincode(event.target.value)} placeholder="PIN Code" />
            </div>
            {locationError && <p className="mt-2 text-xs text-destructive">{locationError}</p>}
            {nearby && location && <p className="mt-2 text-xs text-muted-foreground">Showing listings within 5 KM of your current location. Only listings with saved coordinates can appear.</p>}
          </details>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">{rows.length} Business Listings</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs"><option value="relevant">Most Relevant</option><option value="premium">Premium First</option><option value="rating">Highest Rated</option><option value="newest">Newest First</option><option value="nearest" disabled={!location}>Nearest First</option><option value="name">Business Name (A–Z)</option></select>
            <Button size="sm" variant="outline" asChild><a href={mapUrl} target="_blank" rel="noreferrer"><ApperIcon name="Map" size={15} /> Map View</a></Button>
            <div className="flex rounded-lg border border-border p-1"><Button size="sm" variant={view === 'grid' ? 'default' : 'ghost'} onClick={() => setView('grid')}><ApperIcon name="Grid2X2" size={15} /> Grid</Button><Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}><ApperIcon name="List" size={15} /> List</Button></div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error.message}<Button variant="link" onClick={run}>Retry</Button></div>}
        {loading && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>}
        {!loading && !error && rows.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><ApperIcon name="SearchX" size={32} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">कोई बिज़नेस नहीं मिला</h2><p className="mt-1 text-sm text-muted-foreground">अपनी Search या Filters बदलकर देखें।</p></div>}
        {!loading && !error && rows.length > 0 && <div className={view === 'grid' ? 'mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'mt-6 grid gap-3'}>{rows.slice(0, visibleCount).map((business) => <BusinessCard key={business.Id} business={business} compact={view === 'list'} />)}</div>}
        {!loading && rows.length > visibleCount && <div className="mt-7 text-center"><Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)}>Load More</Button></div>}
      </main>
    </div>
  );
}
