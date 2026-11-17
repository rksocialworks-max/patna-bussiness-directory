import { useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/contact', layout: 'public', access: 'public' };

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', message: '' });
  const [saving, setSaving] = useState(false);
  const { data: settings } = useFetch(async () => {
    const result = await sdk.table('site_settings_c').select(['setting_key_c', 'setting_value_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, []);

  const supportEmail = settings?.find((item) => item.setting_key_c === 'support_email')?.setting_value_c;
  const supportWhatsapp = settings?.find((item) => item.setting_key_c === 'support_whatsapp')?.setting_value_c;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await sdk.table('support_requests_c').create({
        Name: form.name || 'Website contact request',
        email_c: form.email,
        mobile_c: form.mobile,
        message_c: form.message,
        status_c: 'New',
      });
      if (result.messages?.length) toast.error(result.messages[0]);
      if (!result.data?.length) return;
      toast.success('Your support request has been submitted.');
      setForm({ name: '', email: '', mobile: '', message: '' });
    } catch (error) {
      toast.error(error.message || 'Unable to submit your request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">We are here to help</p>
        <h1 className="mt-2 text-3xl font-extrabold">Contact & Support</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Listing, account, payment या business profile से जुड़ी सहायता के लिए हमें message भेजें।
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card><CardContent className="p-5">
              <ApperIcon name="Mail" size={22} className="text-primary" />
              <h2 className="mt-4 font-bold">Email Support</h2>
              {supportEmail
                ? <a className="mt-1 block text-sm text-primary underline" href={'mailto:' + supportEmail}>{supportEmail}</a>
                : <p className="mt-1 text-sm text-muted-foreground">Support email will be configured by the Super Admin.</p>}
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <ApperIcon name="MessageCircle" size={22} className="text-primary" />
              <h2 className="mt-4 font-bold">WhatsApp Support</h2>
              {supportWhatsapp
                ? <Button size="sm" variant="outline" className="mt-2" asChild><a href={'https://wa.me/' + supportWhatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer">Chat on WhatsApp</a></Button>
                : <p className="mt-1 text-sm text-muted-foreground">WhatsApp support will be configured by the Super Admin.</p>}
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-5 md:p-7">
              <h2 className="text-lg font-bold">Send a Support Request</h2>
              <p className="mt-1 text-xs text-muted-foreground">हमारी टीम आपके message को review करेगी।</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-semibold">Name</span><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-semibold">Mobile</span><Input value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} placeholder="Mobile number" /></label>
                </div>
                <label className="block space-y-1.5"><span className="text-xs font-semibold">Email</span><Input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" /></label>
                <label className="block space-y-1.5"><span className="text-xs font-semibold">Message</span><Textarea required rows={5} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="How can we help?" /></label>
                <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'} <ApperIcon name="Send" size={15} /></Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
