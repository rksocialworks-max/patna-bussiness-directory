import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmCurrentEmailVerification, sendCurrentEmailVerification } from '@/services/firebase/auth';
import { Button } from '@/components/ui/button';
import AuthLayout from './AuthLayout';

export default function EmailVerification() {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode') || '';
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function handleVerify() {
    setLoading(true);
    setError('');
    try {
      await confirmCurrentEmailVerification(oobCode);
      setVerified(true);
    } catch (err) {
      setError(err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code'
        ? 'This verification link has expired or was already used. Sign in and request a new link.'
        : err?.message || 'Email verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError('');
    setResent(false);
    try {
      await sendCurrentEmailVerification();
      setResent(true);
    } catch (err) {
      setError(err?.message || 'Could not send a new verification email. Please sign in first.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={verified ? 'Email verified' : 'Verify your email'}
      description={verified ? 'Your email address has been verified.' : 'Use the secure link sent to your email address.'}
      icon={verified ? 'CheckCircle' : 'MailCheck'}>
      {verified ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Your account can now be reviewed for directory access by the administrator.</p>
          <Button asChild className="w-full"><Link to="/owner/login">Continue to sign in</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {oobCode ? <Button className="w-full" onClick={handleVerify} disabled={loading}>{loading ? 'Verifying…' : 'Verify email address'}</Button> :
            <p className="text-sm text-muted-foreground">Open the verification link from your email on this device. If you need a new link, sign in and request one below.</p>}
          <Button variant="outline" className="w-full" onClick={handleResend} disabled={loading}>Resend verification email</Button>
          {resent && <p className="text-sm text-success">Verification email sent.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-center text-sm"><Link className="text-primary underline" to="/owner/login">Back to sign in</Link></p>
        </div>
      )}
    </AuthLayout>
  );
}
