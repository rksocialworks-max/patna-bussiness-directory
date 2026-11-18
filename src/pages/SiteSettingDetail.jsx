import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { getDocument, updateDocument, deleteDocument, COLLECTIONS } from '@/services/firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/admin/settings/:id', layout: 'owner', access: "profile === 'Admin_c'" };

export default function SiteSettingDetail() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ Name: '', setting_key_c: '', setting_value_c: '', setting_group_c: 'General' });
  const { data: setting, loading, error, run } = useFetch(
    () => getDocument(COLLECTIONS.siteSettings, id),
    [id],
  );

  useEffect(() => {
    if (!setting) return;
    setForm({
      Name: setting.Name ?? '',
      setting_key_c: setting.setting_key_c ?? '',
      setting_value_c: setting.setting_value_c ?? '',
      setting_group_c: setting.setting_group_c ?? 'General',
    });
  }, [setting]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateDocument(COLLECTIONS.siteSettings, id, form);
      toast.success('Website setting updated.');
      setEditing(false);
      await run();
    } catch (err) {
      toast.error(err?.message || 'Website setting could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSetting() {
    try {
      await deleteDocument(COLLECTIONS.siteSettings, id);
      toast.success('Website setting deleted.');
      window.location.assign('/admin/operations');
    } catch (err) {
      toast.error(err?.message || 'Website setting could not be deleted.');
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl animate-pulse p-8"><div className="h-48 rounded-2xl bg-muted" /></div>;
  if (error || !setting) return <div className="mx-auto max-w-3xl p-8 text-center"><p className="text-sm text-destructive">{error?.message || 'Setting not found.'}</p></div>;

  const qr = setting.upi_qr_c?.[0]?.url ?? setting.upi_qr_c?.[0]?.Url ?? '';

  return (
    <div className="mx-auto max-w-3xl">
      <Button size="sm" variant="ghost" asChild><Link to="/admin/operations"><ApperIcon name="ArrowLeft" size={16} /> Back to Operations</Link></Button>
      <section className="mt-5 rounded-2xl border border-border bg-card p-6">
        {!editing ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Website setting</p>
            <h1 className="mt-2 text-2xl font-extrabold">{setting.Name}</h1>
            <p className="mt-2 text-xs text-muted-foreground">Key: {setting.setting_key_c} • Group: {setting.setting_group_c}</p>
            <p className="mt-5 whitespace-pre-line text-sm">{setting.setting_value_c || 'No value set.'}</p>
            {qr && <img src={qr} alt="UPI QR" className="mt-5 size-40 rounded-xl border border-border bg-white p-2 object-contain" />}
            <div className="mt-6 flex gap-2"><Button onClick={() => setEditing(true)}>Edit Setting</Button><ConfirmDeleteButton title="Delete this setting?" description="This setting will be permanently removed." onConfirm={removeSetting} /></div>
          </>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <h1 className="text-xl font-bold">Edit Website Setting</h1>
            <label className="block space-y-1"><span className="text-xs font-semibold">Setting Name</span><Input required placeholder="e.g. Support Email" value={form.Name} onChange={(event) => setForm((current) => ({ ...current, Name: event.target.value }))} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold">Setting Key</span><Input required placeholder="e.g. support_email" value={form.setting_key_c} onChange={(event) => setForm((current) => ({ ...current, setting_key_c: event.target.value }))} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold">Setting Value</span><Textarea rows={5} placeholder="Enter the setting value..." value={form.setting_value_c} onChange={(event) => setForm((current) => ({ ...current, setting_value_c: event.target.value }))} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold">Group</span><select value={form.setting_group_c} onChange={(event) => setForm((current) => ({ ...current, setting_group_c: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>General</option><option>Contact</option><option>Payments</option><option>SEO</option><option>Homepage</option></select></label>
            <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Setting'}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}
