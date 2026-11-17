import { useFetch } from '@/hooks/useFetch';
import { listBranchManagers } from '@/services/firebase/functions';

export default function BranchManagerPicker({ value = [], onChange }) {
  const { data, loading, error } = useFetch(async () => {
    return listBranchManagers();
  }, []);
  const managers = (data ?? []).filter((member) => member.profile?.name === 'BranchManager_c');
  const selectedId = value?.[0]?.User?.Id ?? value?.[0]?.User ?? value?.[0]?.Id ?? '';

  return (
    <div className="space-y-1.5">
      <select
        value={selectedId}
        disabled={loading}
        onChange={(event) => {
          const manager = managers.find((member) => String(member.id) === event.target.value);
          onChange(manager ? [{ User: { Id: manager.id, Name: manager.name || manager.email } }] : []);
        }}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{loading ? 'Loading branch managers…' : 'No manager assigned'}</option>
        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name || manager.email} — {manager.email}</option>)}
      </select>
      {error && <p className="text-xs text-destructive">{error.message}</p>}
      {!loading && managers.length === 0 && <p className="text-xs text-muted-foreground">Invite and activate a Branch Manager first.</p>}
    </div>
  );
}
