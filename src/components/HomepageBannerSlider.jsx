import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

export default function HomepageBannerSlider() {
  const { data, loading } = useFetch(async () => {
    const rows = await listDocuments(COLLECTIONS.homepageBannersPublic, {
      sort: 'sort_order_c',
      pageSize: 20,
    });
    return rows.map((banner) => ({ ...banner, Id: banner.Id ?? banner.id }));
  }, []);
  const banners = data ?? [];
  const [index, setIndex] = useState(0);

  if (loading || banners.length === 0) return null;
  const banner = banners[index % banners.length];
  const image = banner.image_c?.[0]?.url ?? banner.image_c?.[0]?.Url ?? '';

  function move(step) {
    setIndex((current) => (current + step + banners.length) % banners.length);
  }

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-4 md:px-8">
      <div className="relative min-h-36 overflow-hidden rounded-2xl border border-[#F3D9B1] bg-[#F8F3E9] text-[#304878] md:min-h-44">
        {image && <img src={image} alt={banner.Name} className="absolute inset-0 size-full object-cover opacity-20" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F8F3E9] via-[#F8F3E9]/95 to-[#FDE7C7]/70" />
        <div className="absolute -right-10 -top-16 size-56 rounded-full border-[36px] border-[#F07830]/10" />
        <div className="relative flex min-h-36 items-center justify-between gap-4 p-5 md:min-h-44 md:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E59700]">Featured • Bihar</p>
            <h2 className="mt-2 text-xl font-extrabold md:text-3xl">{banner.Name}</h2>
            <p className="mt-1 text-sm text-[#304878]/70">{banner.caption_c}</p>
            <Button size="sm" asChild className="mt-3 bg-[#304878] text-white hover:bg-[#24365e]"><Link to={banner.link_url_c || '/businesses'}>Explore <ApperIcon name="ArrowRight" size={14} /></Link></Button>
          </div>
          {banners.length > 1 && <div className="flex shrink-0 gap-2"><Button size="icon" variant="outline" onClick={() => move(-1)} aria-label="Previous banner" className="border-[#F3D9B1] bg-white/80 text-[#304878] hover:bg-white"><ApperIcon name="ChevronLeft" size={18} /></Button><Button size="icon" variant="outline" onClick={() => move(1)} aria-label="Next banner" className="border-[#F3D9B1] bg-white/80 text-[#304878] hover:bg-white"><ApperIcon name="ChevronRight" size={18} /></Button></div>}
        </div>
      </div>
      {banners.length > 1 && <div className="mt-2 flex justify-center gap-1.5">{banners.map((item, i) => <button key={item.Id} aria-label={`Go to banner ${i+1}`} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-7 bg-[#F07830]' : 'w-2 bg-[#304878]/20'}`} />)}</div>}
    </section>
  );
}
