import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthLayout from './AuthLayout';

export default function Callback() {
  return (
    <AuthLayout title="Sign-in callback" icon="ShieldCheck"
      description="This directory uses Firebase email and password sign-in. External single sign-on callbacks are not enabled.">
      <Button asChild className="w-full"><Link to="/owner/login">Continue to sign in</Link></Button>
    </AuthLayout>
  );
}
