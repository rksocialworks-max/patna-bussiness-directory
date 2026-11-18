import { Link, useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { useProfile } from '@/hooks/useProfile';
import { sdk } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

const FIELDS = ['Id', 'Name', 'business_c', 'business_name_c', 'plan_c', 'plan_name_c', 'amount_c', 'provider_c', 'manual_utr_c', 'razorpay_payment_id_c', 'status_c', 'receipt_number_c', 'CreatedOn', 'paid_at_c', 'premium_expiry_c'];

function formatPaymentDate(value) {
  if (!value) return '—';
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
}

export const route = { path: '/owner/payments/:id/receipt', layout: 'owner', access: "profile === 'BusinessOwner_c' || profile === 'Admin_c'" };

export default function PaymentReceipt() {
  const { id } = useParams();
  const { profile } = useProfile();
  const backRoute = profile === 'Admin_c' ? '/admin/operations' : '/owner/workspace';
  const { data: payment, loading, error } = useFetch(async () => {
    const result = await sdk.table('payments_c').select(FIELDS).get(id);
    if (!result.success) throw new Error(result.message);
    return result.data;
  }, [id]);

  if (loading) return <div className="mx-auto max-w-3xl animate-pulse p-8"><div className="h-64 rounded-2xl bg-muted" /></div>;
  if (error || !payment) return <div className="mx-auto max-w-3xl p-8 text-center"><p className="text-sm text-destructive">{error?.message || 'Receipt not found.'}</p></div>;

  const business = payment.business_name_c || payment.business_c?.Name || 'Business';
  const paymentDate = formatPaymentDate(payment.paid_at_c || payment.CreatedOn);
  const plan = payment.plan_name_c || payment.plan_c?.Name || 'Premium Plan';
  const paymentConfirmed = payment.status_c === 'Paid' || payment.status_c === 'Verified';

  if (!paymentConfirmed) {
    const pending = ['Pending', 'Pending Verification'].includes(payment.status_c);
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center">
        <ApperIcon name={pending ? 'Clock3' : 'CircleAlert'} size={36} className="mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">{pending ? 'Payment verification pending' : 'Receipt unavailable'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{pending ? 'आपका भुगतान अभी पुष्टि की प्रतीक्षा में है। Admin verification या Razorpay confirmation पूरा होने के बाद ही receipt उपलब्ध होगी।' : 'इस payment की पुष्टि नहीं हुई है, इसलिए अभी receipt जारी नहीं की जा सकती।'}</p>
        <p className="mt-3 text-xs text-muted-foreground">Payment status: {payment.status_c || 'Unknown'}</p>
        <Button className="mt-5" variant="outline" asChild><Link to={backRoute}>Back to workspace</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Button variant="ghost" asChild><Link to={backRoute}><ApperIcon name="ArrowLeft" size={16} /> Back to workspace</Link></Button>
        <Button onClick={() => window.print()}><ApperIcon name="Printer" size={16} /> Print / Save PDF</Button>
      </div>
      <article className="rounded-2xl border border-border bg-card p-7 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Patna Business Directory</p><h1 className="mt-2 text-2xl font-extrabold">Payment Receipt</h1><p className="mt-1 text-xs text-muted-foreground">Non-GST payment acknowledgement · Premium listing</p></div>
          <ApperIcon name="ReceiptText" size={34} className="text-primary" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Receipt Number</p><p className="mt-1 font-bold">{payment.receipt_number_c || payment.receipt_no_c || 'Pending Admin Verification'}</p></div>
          <div><p className="text-xs text-muted-foreground">Payment Date</p><p className="mt-1 font-semibold">{paymentDate}</p></div>
          <div><p className="text-xs text-muted-foreground">Business</p><p className="mt-1 font-semibold">{business}</p></div>
          <div><p className="text-xs text-muted-foreground">Plan</p><p className="mt-1 font-semibold">{plan}</p></div>
          <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="mt-1 font-semibold">{payment.provider_c || payment.method_c || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Transaction Reference</p><p className="mt-1 font-semibold">{payment.manual_utr_c || payment.razorpay_payment_id_c || payment.reference_c || '—'}</p></div>
        </div>
        <div className="mt-8 rounded-xl bg-muted/50 p-5">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold">Amount Paid</span><span className="text-2xl font-extrabold">₹{Number(payment.amount_c || 0).toLocaleString('en-IN')}</span></div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="text-muted-foreground">Payment Status</span><span className="font-bold">{payment.status_c === 'Paid' || payment.status_c === 'Verified' ? 'Paid / Verified' : payment.status_c}</span></div>
        </div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">This is a payment acknowledgement generated after payment confirmation. The directory is currently not configured with GST registration details; this document is not a GST tax invoice and does not show GST as a separate tax amount.</p>
      </article>
    </div>
  );
}
