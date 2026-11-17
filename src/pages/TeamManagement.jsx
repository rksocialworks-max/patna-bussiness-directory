import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/layouts/RootLayout';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/owner/team', layout: 'owner', access: "profile === 'BusinessOwner_c'" };
export const nav = { icon: 'Users', label: 'Branch Managers', section: 'Workspace', profiles: ['BusinessOwner_c'], order: 30 };

export default function TeamManagement() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const { data: membersData, loading: membersLoading, error: membersError, run: reloadMembers } = useFetch(async () => {
    const result = await sdk.teams.getMembers(0, 50);
    return result.data ?? [];
  }, []);

  const { data: invitationsData, loading: invitationsLoading, error: invitationsError, run: reloadInvitations } = useFetch(async () => {
    const result = await sdk.teams.getInvitedMembers(0, 50);
    return result.data ?? [];
  }, []);

  const managers = (membersData ?? []).filter((member) => member.profile?.name === 'BranchManager_c');
  const invitations = invitationsData ?? [];

  async function inviteManager(event) {
    event.preventDefault();
    setInviting(true);
    try {
      const result = await sdk.teams.inviteUsers({
        invitations: [{ email: email.trim(), profileName: 'BranchManager_c' }],
      });
      if (result?.success === false || result?.error) {
        toast.error(result.message || result.error || 'Invitation could not be sent.');
        return;
      }
      toast.success('Branch Manager invitation submitted.');
      setEmail('');
      reloadInvitations();
    } catch (error) {
      toast.error(error.message || 'Team invitations are not available in this environment.');
    } finally {
      setInviting(false);
    }
  }

  async function resend(invitation) {
    try {
      await sdk.teams.resendInvitation(invitation.invitationId);
      toast.success('Invitation resent.');
      reloadInvitations();
    } catch (error) {
      toast.error(error.message || 'Could not resend invitation.');
    }
  }

  async function cancel(invitation) {
    try {
      await sdk.teams.deleteInvitation(invitation.invitationId);
      toast.success('Invitation cancelled.');
      reloadInvitations();
    } catch (error) {
      toast.error(error.message || 'Could not cancel invitation.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" asChild><Link to="/owner/workspace"><ApperIcon name="ArrowLeft" size={16} /> Back to Business Workspace</Link></Button>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Team access</p>
      <h1 className="mt-2 text-3xl font-extrabold">Branch Manager Access</h1>
      <p className="mt-2 text-sm text-muted-foreground">अपने business की शाखाओं के लिए Branch Manager को invite करें। Invitation platform के माध्यम से भेजा जाएगा।</p>

      <form onSubmit={inviteManager} className="mt-7 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">Invite a Branch Manager</h2>
        <p className="mt-1 text-xs text-muted-foreground">Branch Manager profile के साथ email invitation भेजें।</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="manager@example.com" />
          <Button type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invitation'} <ApperIcon name="Send" size={15} /></Button>
        </div>
      </form>

      <section className="mt-7 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-bold">Active Branch Managers</h2><p className="mt-1 text-xs text-muted-foreground">{managers.length} active manager accounts</p></div><Badge variant="secondary">Owner controlled</Badge></div>
        {membersError && <p className="mt-4 text-sm text-destructive">{membersError.message}</p>}
        {membersLoading && <p className="mt-4 text-sm text-muted-foreground">Loading team members…</p>}
        {!membersLoading && managers.length === 0 && <p className="mt-4 text-sm text-muted-foreground">अभी कोई Branch Manager account नहीं है।</p>}
        <div className="mt-4 space-y-3">{managers.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"><span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><ApperIcon name="UserRound" size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block truncate text-xs text-muted-foreground">{member.email}</span></span><Badge>Branch Manager</Badge></div>)}</div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reloadMembers}><ApperIcon name="RefreshCw" size={14} /> Refresh Members</Button>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div><h2 className="font-bold">Pending Invitations</h2><p className="mt-1 text-xs text-muted-foreground">Resend or cancel an invitation before it is accepted.</p></div>
        {invitationsError && <p className="mt-4 text-sm text-destructive">{invitationsError.message}</p>}
        {invitationsLoading && <p className="mt-4 text-sm text-muted-foreground">Loading invitations…</p>}
        {!invitationsLoading && invitations.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No pending invitations.</p>}
        <div className="mt-4 space-y-3">{invitations.map((invitation) => <div key={invitation.invitationId} className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-center"><span className="min-w-0 flex-1 truncate text-sm font-medium">{invitation.invitedEmail}</span><Badge variant="outline">Pending</Badge><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => resend(invitation)}>Resend</Button><Button size="sm" variant="ghost" onClick={() => cancel(invitation)}>Cancel</Button></div></div>)}</div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reloadInvitations}><ApperIcon name="RefreshCw" size={14} /> Refresh Invitations</Button>
      </section>

      <p className="mt-5 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">Access rules: Branch Managers can view and edit their assigned branch profile and manage its enquiries only. Branch Manager account access is controlled by the Main Business Owner. The preview does not currently expose a dedicated deactivate/reactivate operation, so that control is not simulated here.</p>
    </div>
  );
}
