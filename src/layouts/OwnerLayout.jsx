import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useOwnerLayoutData } from '@/hooks/useOwnerLayoutData';
import { APP_CONFIG } from '@/config/app.config';
import { cn } from '@/lib/utils';
import ApperIcon from '@/components/ApperIcon';
import UserMenu from '@/components/UserMenu';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function OwnerLayout() {
  const { user, logout, homeRoute, navItems, navGroups, initials, displayName } = useOwnerLayoutData();
  const grouped = navGroups.length ? navGroups : [{ label: null, items: navItems }];
  const [navOpen, setNavOpen] = useState(false);

  const nav = grouped.map((group, index) => (
    <div key={group.label ?? `group-${index}`} className="space-y-2">
      {group.label && <p className="px-3 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">{group.label}</p>}
      {group.items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/admin' || item.to === '/owner/businesses'} onClick={() => setNavOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
          <ApperIcon name={item.icon ?? 'Circle'} size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  ));

  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-svh flex-col bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
        <Link to={homeRoute} className="flex items-center px-2">
          <span className="inline-flex rounded-lg bg-white p-1 shadow-sm"><img src="/brand-logo.jpeg" alt="Patna Business Directory" className="h-9 w-auto" /></span>
        </Link>
        <div className="mt-9 flex-1 space-y-5">{nav}</div>
        <div className="mt-8 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3"><p className="text-xs font-semibold">Bihar Business Network</p><p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/60">Discover, connect and grow local businesses.</p></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <button type="button" className="rounded-lg p-2 hover:bg-accent md:hidden" aria-label="Toggle menu" onClick={() => setNavOpen((value) => !value)}><ApperIcon name="Menu" size={21} /></button>
          <Link to="/" className="font-heading text-sm font-bold md:hidden">{APP_CONFIG.name}</Link>
          <div className="hidden text-sm text-muted-foreground md:block">Bihar • Business workspace</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block"><span className="block text-xs font-semibold">{displayName}</span><span className="block text-[10px] text-muted-foreground">{String(user?.profile ?? '').replace('_c', '')}</span></span>
            <UserMenu user={user} initials={initials} displayName={displayName} logout={logout} />
          </div>
        </header>
        {navOpen && <nav className="space-y-2 border-b border-border bg-sidebar p-4 text-sidebar-foreground md:hidden">{nav}</nav>}
        <main className="min-h-[calc(100svh-4rem)] p-4 md:p-8"><ErrorBoundary><Outlet /></ErrorBoundary></main>
      </div>
    </div>
  );
}
