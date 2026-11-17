import OperationsConsole from '@/components/OperationsConsole';

export const route = { path: '/owner/workspace', layout: 'owner', access: "['BusinessOwner_c', 'BranchManager_c'].includes(profile)" };
export const nav = { icon: 'BriefcaseBusiness', label: 'Business Workspace', section: 'Workspace', profiles: ['BusinessOwner_c', 'BranchManager_c'], order: 20 };

export default function OwnerWorkspace() {
  return <OperationsConsole mode="owner" />;
}
