import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listManagedUsers, assignManagedRole, backfillPublicDirectory } from '@/services/firebase/functions';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/admin/users', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { icon: 'Users', label: 'User Accounts', section: 'Administration', profiles: ['Admin_c'], order: 4 };

export default function AdminUsers() {
  const { profile } = useProfile();
  const [users, setUsers] = useState([]);
  const [pageToken, setPageToken] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState('');
  const [backfilling, setBackfilling] = useState(false);

  const loadUsers = useCallback(async (token) => {
    setLoading(true);
    try {
      const result = await listManagedUsers({ pageToken: token || undefined });
      setUsers(result.users || []);
      setPageToken(token || null);
      setNextPageToken(result.nextPageToken || null);
    } catch (error) {
      toast.error(error?.message || 'User accounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(null); }, [loadUsers]);

  const changeRole = async (uid, role) => {
    setBusyUid(uid);
    try {
      await assignManagedRole({ uid, role });
      toast.success('Account role updated. The user may need to sign in again.');
      await loadUsers(pageToken);
    } catch (error) {
      toast.error(error?.message || 'Role could not be updated.');
    } finally {
      setBusyUid('');
    }
  };

  const rebuildPublicData = async () => {
    setBackfilling(true);
    try {
      const result = await backfillPublicDirectory();
      const published = Object.values(result.results || {}).reduce((total, item) => total + Number(item.published || 0), 0);
      toast.success(`Public directory sync completed. ${published} records published across public collections.`);
    } catch (error) {
      toast.error(error?.message || 'Public directory sync failed. Check Super Admin and App Check setup.');
    } finally {
      setBackfilling(false);
    }
  };

  if (profile !== 'Admin_c') return <div className="p-6">Access denied.</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review registered accounts and assign Business Owner or Branch Manager access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => loadUsers(pageToken)} disabled={loading}>
            <ApperIcon name="RefreshCw" size={16} className="mr-2" /> Refresh
          </Button>
          <Button onClick={rebuildPublicData} disabled={backfilling}>
            <ApperIcon name="Database" size={16} className="mr-2" />
            {backfilling ? 'Syncing public data…' : 'Sync Public Directory'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Security note</p>
        <p className="mt-1 text-sm text-muted-foreground">Role changes are processed by a protected Cloud Function. The backend requires the trusted <code>superAdmin: true</code> custom claim. Admin access cannot be granted from this screen.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><ApperIcon name="LoaderCircle" size={18} className="animate-spin" /> Loading accounts…</div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No accounts found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-semibold">Account</th>
                <th className="p-3 font-semibold">Current Role</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Assign Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} className="border-t border-border">
                  <td className="p-3">
                    <p className="font-medium">{user.displayName || 'Unnamed user'}</p>
                    <p className="max-w-[210px] truncate text-xs text-muted-foreground">{user.uid}</p>
                  </td>
                  <td className="p-3"><Badge variant="secondary">{user.role}</Badge></td>
                  <td className="p-3">
                    <p>{user.email || '—'}</p>
                    <p className="text-xs text-muted-foreground">{user.emailVerified ? 'Email verified' : 'Email not verified'}</p>
                  </td>
                  <td className="p-3"><Badge variant={user.disabled ? 'destructive' : 'outline'}>{user.disabled ? 'Disabled' : 'Active'}</Badge></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Select disabled={Boolean(busyUid) || user.disabled || user.role === 'Admin_c'} onValueChange={(role) => changeRole(user.uid, role)}>
                        <SelectTrigger className="w-[175px]"><SelectValue placeholder="Choose role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BusinessOwner_c">Business Owner</SelectItem>
                          <SelectItem value="BranchManager_c">Branch Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      {busyUid === user.uid && <ApperIcon name="LoaderCircle" size={16} className="animate-spin" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={!pageToken || loading || Boolean(busyUid)} onClick={() => loadUsers(null)}>First page</Button>
        <Button variant="outline" disabled={!nextPageToken || loading || Boolean(busyUid)} onClick={() => loadUsers(nextPageToken)}>Next page <ApperIcon name="ChevronRight" size={16} className="ml-1" /></Button>
      </div>
    </div>
  );
}
