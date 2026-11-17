import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthLayout from './AuthLayout';

export default function AcceptInvitation() {
  return (
    <AuthLayout title="Account access" icon="UserPlus"
      description="Business Owner and Branch Manager access is assigned by the directory administrator after account registration.">
      <Button asChild className="w-full"><Link to="/owner/signup">Create an account</Link></Button>
    </AuthLayout>
  );
}
