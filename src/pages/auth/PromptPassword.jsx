import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthLayout from './AuthLayout';

export default function PromptPassword() {
  return (
    <AuthLayout title="Password sign-in" icon="Lock"
      description="Use the email and password registered with this directory. Social sign-in is not enabled.">
      <Button asChild className="w-full"><Link to="/owner/login">Go to sign in</Link></Button>
    </AuthLayout>
  );
}
