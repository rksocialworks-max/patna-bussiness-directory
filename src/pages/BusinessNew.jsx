import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BusinessEditor from '@/components/BusinessEditor';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/owner/businesses/new', layout: 'owner', access: "profile === 'BusinessOwner_c'" };

export default function BusinessNew() {
  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" asChild><Link to="/owner/businesses"><ApperIcon name="ArrowLeft" size={16} /> Back to My Businesses</Link></Button>
      <h1 className="mt-4 text-3xl font-extrabold">Add New Business</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">Registration बिल्कुल Free है। Submit करने के बाद Super Admin आपकी listing review करेगा।</p>
      <BusinessEditor />
    </div>
  );
}
