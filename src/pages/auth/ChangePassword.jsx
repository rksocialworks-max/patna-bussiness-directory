import { useState } from 'react';
import { changeCurrentPassword } from '@/services/firebase/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AuthLayout from './AuthLayout';

export const route = {
  path: '/change-password',
  layout: 'owner',
  access: 'authenticated',
};

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      await changeCurrentPassword(currentPassword, newPassword);
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
        ? 'Current password is incorrect. Please try again.'
        : err?.message || 'Password could not be changed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={done ? 'Password changed' : 'Change password'}
      description={done ? 'Your Firebase account password has been updated.' : 'Confirm your current password before setting a new one.'}
      icon={done ? 'CheckCircle' : 'Lock'}>
      {done ? (
        <div className="rounded-xl border bg-muted/30 p-5 text-center text-sm">
          Password changed successfully.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-1"><Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" /></div>
          <div className="space-y-1"><Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)} required minLength={6} autoComplete="new-password" /></div>
          <div className="space-y-1"><Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} autoComplete="new-password" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Updating…' : 'Change password'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
