import { useMemo, useState } from 'react';
import { useAuth } from '@/layouts/RootLayout';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { createPremiumPaymentOrder, verifyPremiumPayment, submitManualPremiumPayment } from '@/services/firebase/functions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const route = { path: '/owner/premium', layout: 'owner', access: "profile === 'BusinessOwner_c'" };
export const nav = { icon: 'Crown', label: 'Upgrade to Premium', section: 'Workspace', profiles: ['BusinessOwner_c'], order: 30 };

const DEFAULT_UPI_ID = 'rksocialworks@oksbi';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your internet connection.'));
    document.body.appendChild(script);
  });
}

export default function PremiumPurchase() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState('');
  const [planId, setPlanId] = useState('');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: businesses = [], loading: businessesLoading } = useFetch(async () => {
    if (!user?.uid) return [];
    const result = await sdk.table('businesses_c').select(['Id', 'Name', 'status_c', 'is_premium_c', 'premium_expiry_c']).where('ownerUid', '==', user.uid).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data || [];
  }, [user?.uid]);

  const { data: plans = [], loading: plansLoading } = useFetch(async () => {
    const result = await sdk.table('premium_plans_c').select(['Id', 'Name', 'duration_months_c', 'duration_days_c', 'price_c', 'features_c', 'status_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return (result.data || []).filter((plan) => ['Active', 'Approved'].includes(plan.status_c) && ([1, 3, 12].includes(Number(plan.duration_months_c)) || [30, 90, 365].includes(Number(plan.duration_days_c))));
  }, []);

  const { data: settings = [] } = useFetch(async () => {
    const result = await sdk.table('site_settings_c').select(['setting_key_c', 'setting_value_c']).fetch();
    if (!result.success) throw new Error(result.message);
    return result.data || [];
  }, []);

  const eligibleBusinesses = useMemo(() => businesses.filter((item) => item.status_c === 'Approved'), [businesses]);
  const selectedPlan = plans.find((item) => item.Id === planId);
  const upiId = settings.find((item) => item.setting_key_c === 'upi_id')?.setting_value_c || DEFAULT_UPI_ID;
  const upiQr = settings.find((item) => item.setting_key_c === 'upi_qr')?.setting_value_c || '/upi-qr.webp';

  async function payOnline() {
    if (!businessId || !planId) return toast.error('पहले Business और Premium Plan चुनें।');
    setBusy(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay Checkout is unavailable.');
      const order = await createPremiumPaymentOrder({ businessId, planId });
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Patna Business Directory',
        description: 'Premium listing subscription',
        order_id: order.orderId,
        prefill: { email: user?.email || '' },
        theme: { color: '#173b70' },
        handler: async (response) => {
          try {
            const verified = await verifyPremiumPayment({ paymentId: order.paymentId, ...response });
            toast.success('Payment verified. Premium is active until ' + verified.premiumExpiry + '.');
          } catch (error) {
            toast.error(error.message || 'Payment verification is pending. Contact support with your Razorpay payment ID.');
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on('payment.failed', (event) => {
        toast.error(event.error?.description || 'Payment failed. No Premium access was activated.');
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      toast.error(error.message || 'Could not start online payment.');
      setBusy(false);
    }
  }

  async function submitUpi(event) {
    event.preventDefault();
    if (!businessId || !planId) return toast.error('पहले Business और Premium Plan चुनें।');
    setBusy(true);
    try {
      await submitManualPremiumPayment({ businessId, planId, utr });
      toast.success('UPI reference submitted. Admin verification के बाद Premium सक्रिय होगा।');
      setUtr('');
    } catch (error) {
      toast.error(error.message || 'UPI reference submit नहीं हुआ।');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Business growth</p>
        <h1 className="mt-2 text-3xl font-extrabold">Upgrade to Premium</h1>
        <p className="mt-2 text-sm text-muted-foreground">अपने approved business की Premium listing के लिए plan चुनें। Payment verification के बाद ही Premium सक्रिय होगा।</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">1. Business और Plan चुनें</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">Business
            <select value={businessId} onChange={(event) => setBusinessId(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3" disabled={businessesLoading}>
              <option value="">Select approved business</option>
              {eligibleBusinesses.map((business) => <option key={business.Id} value={business.Id}>{business.Name}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">Premium Plan
            <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3" disabled={plansLoading}>
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.Id} value={plan.Id}>{plan.Name} — ₹{Number(plan.price_c).toLocaleString('en-IN')}</option>)}
            </select>
          </label>
        </div>
        {selectedPlan && <div className="mt-4 rounded-xl bg-muted/50 p-4"><div className="flex items-center justify-between gap-3"><strong>{selectedPlan.Name}</strong><strong className="text-xl">₹{Number(selectedPlan.price_c).toLocaleString('en-IN')}</strong></div><p className="mt-1 text-xs text-muted-foreground">{selectedPlan.duration_months_c || ({ 30: 1, 90: 3, 365: 12 }[Number(selectedPlan.duration_days_c)])} month(s)</p>{selectedPlan.features_c && <p className="mt-2 text-sm">{selectedPlan.features_c}</p>}</div>}
        {!businessesLoading && eligibleBusinesses.length === 0 && <p className="mt-3 text-sm text-amber-700">Premium खरीदने के लिए पहले आपका Business Admin द्वारा Approved होना चाहिए।</p>}
        {!plansLoading && plans.length === 0 && <p className="mt-3 text-sm text-amber-700">अभी कोई Active Premium Plan उपलब्ध नहीं है। Admin से plan configuration जाँचें।</p>}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">2. Pay Online with Razorpay</h2>
          <p className="mt-2 text-sm text-muted-foreground">Razorpay live keys configure होने पर card/UPI checkout यहाँ activate होगा। अभी Manual UPI payment उपलब्ध है।</p>
          <Button className="mt-5 w-full" onClick={payOnline} disabled>Razorpay setup pending</Button>
        </div>
        <form onSubmit={submitUpi} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">3. Manual UPI Payment</h2>
          <p className="mt-2 text-sm text-muted-foreground">इस UPI ID पर payment करें, फिर नीचे UTR / Transaction Reference दर्ज करें। Admin पुष्टि के बाद Premium सक्रिय होगा।</p>
          <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold">{upiId}</p>
          {upiQr && <img src={upiQr} alt="UPI payment QR code" className="mt-3 size-32 rounded-xl border border-border bg-white object-contain p-2" />}
          <label className="mt-4 block space-y-2 text-sm font-medium">UPI UTR / Reference
            <input value={utr} onChange={(event) => setUtr(event.target.value)} minLength={8} maxLength={30} required pattern="[A-Za-z0-9-]{8,30}" className="h-11 w-full rounded-md border border-input bg-background px-3" placeholder="Enter transaction reference" />
          </label>
          <Button type="submit" variant="outline" className="mt-4 w-full" disabled={busy || !businessId || !planId || !eligibleBusinesses.length}>Submit UPI Reference</Button>
        </form>
      </section>
      <p className="text-xs text-muted-foreground">सभी payment records सुरक्षित backend से बनाए जाते हैं। Duplicate UTR और बिना verification के Premium activation रोका जाता है। Payment receipt आपके Business Workspace में उपलब्ध होगी।</p>
    </div>
  );
}
