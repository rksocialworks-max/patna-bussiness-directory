import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';
import CookieNotice from '@/components/CookieNotice';
import PWARegister from '@/components/PWARegister';
import BrandName from '@/components/BrandName';

const links = [
  { to: '/', label: 'होम' },
  { to: '/categories', label: 'कैटेगरी' },
  { to: '/businesses', label: 'सभी बिज़नेस' },
  { to: '/districts', label: 'जिले' },
  { to: '/offers', label: 'ऑफर्स' },
  { to: '/favorites', label: 'Saved' },
  { to: '/compare', label: 'Compare' },
];

export default function PublicHeader() {
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Patna Business Directory — होम">
          <img src="/brand-logo.jpeg" alt="Patna Business Directory" className="h-11 w-auto rounded-lg" />
          <BrandName size="large" className="hidden sm:inline-flex" />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {links.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `rounded-lg px-2 py-2 text-xs font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>{item.label}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 xl:ml-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex"><Link to="/owner/login">लॉगिन</Link></Button>
          <Button size="sm" asChild><Link to="/owner/signup"><ApperIcon name="Plus" size={15} /> अपना बिज़नेस जोड़ें</Link></Button>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 xl:hidden">
        {links.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{item.label}</NavLink>)}
      </div>
    </header>
    <CookieNotice />
    <PWARegister />
    </>
  );
}
