import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmUserPasswordReset } from '@/services/firebase/auth';
import ApperIcon from '@/components/ApperIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!oobCode) {
      setError('This password reset link is invalid. Request a new reset email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await confirmUserPasswordReset(oobCode, password);
      setDone(true);
    } catch (err) {
      setError(err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code'
        ? 'This password reset link has expired or was already used. Request a new reset email.'
        : err?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password reset" icon="CheckCircle">
        <div className="rounded-xl border bg-muted/30 p-5 text-center space-y-4">
          <div className="size-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <ApperIcon name="CheckCircle" size={24} className="text-success" />
          </div>
          <p className="text-sm text-foreground">Your password has been reset successfully.</p>
          <Button asChild className="w-full h-9"><Link to="/login">Sign in</Link></Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" description="Enter your new password below." icon="KeyRound">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="space-y-1">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)} required minLength={6} autoFocus />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !oobCode} className="w-full h-9">
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
        {!oobCode && <p className="text-xs text-muted-foreground">The reset code is missing. Please request a new password reset email.</p>}
      </form>
    </AuthLayout>
  );
}
