import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';

export default function BusinessExtras({ businessId, premiumActive = false }) {
  const { data: products } = useFetch(async () => {
    const rows = await listDocuments(COLLECTIONS.productsServicesPublic, {
      filters: [{ field: 'business_c', value: businessId }],
      pageSize: 100,
    });
    return rows.map((item) => ({ ...item, Id: item.Id ?? item.id }));
  }, [businessId]);

  const { data: branches } = useFetch(async () => {
    const rows = await listDocuments(COLLECTIONS.branchesPublic, {
      filters: [{ field: 'business_c', value: businessId }, { field: 'status_c', value: 'Active' }],
      pageSize: 100,
    });
    return rows.map((branch) => ({ ...branch, Id: branch.Id ?? branch.id }));
  }, [businessId]);

  return (
    <>
      {(products ?? []).length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Products & Services</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((item) => {
              const image = item.image_c?.[0]?.url ?? item.image_c?.[0]?.Url ?? '';
              return (
                <article key={item.Id} className="overflow-hidden rounded-xl border border-border">
                  {image
                    ? <img src={image} alt={item.Name} loading="lazy" className="aspect-square w-full object-cover" />
                    : <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">Image not added</div>}
                  <h3 className="p-3 text-sm font-semibold">{item.Name}</h3>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {(branches ?? []).length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-lg font-bold">Our Branches</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {branches.map((branch) => (
              <article key={branch.Id} className="overflow-hidden rounded-xl border border-border">
                {premiumActive && (branch.photos_c ?? []).length > 0 && <div className="grid grid-cols-2 gap-1">{branch.photos_c.slice(0, 4).map((photo, index) => { const url = photo.url ?? photo.Url; return url ? <img key={photo.Id ?? index} src={url} alt={branch.Name + ' photo ' + (index + 1)} loading="lazy" className="aspect-video w-full object-cover" /> : null; })}</div>}
                <div className="p-4">
                  <h3 className="font-semibold">{branch.Name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{branch.address_c}, {branch.city_c}, {branch.district_c}</p>
                  {branch.hours_c && <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{branch.hours_c}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {branch.phone_c && <a className="text-xs font-semibold text-primary underline" href={`tel:${branch.phone_c}`}>Call Branch</a>}
                    {branch.map_url_c && <a className="text-xs font-semibold text-primary underline" href={branch.map_url_c} target="_blank" rel="noreferrer">Get Directions</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
