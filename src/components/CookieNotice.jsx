import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => localStorage.getItem('pbd_essential_cookie_notice') !== 'accepted');

  function accept() {
    localStorage.setItem('pbd_essential_cookie_notice', 'accepted');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ApperIcon name="ShieldCheck" size={18} /></span>
        <div><p className="text-sm font-semibold">Essential cookies only</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This demo uses essential browser storage for favourites and comparison. No advertising or marketing tracking cookies are enabled.</p></div>
      </div>
      <Button size="sm" onClick={accept}>Got it</Button>
    </aside>
  );
}
