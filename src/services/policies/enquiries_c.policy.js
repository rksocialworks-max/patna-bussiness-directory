const isAdmin = (user) => user?.profile === 'Admin_c';

const businessForRecord = (record, store) => {
  const relatedId = record.business_c?.Id ?? record.business_c;
  return store.getAll('businesses_c').find((business) => String(business.Id) === String(relatedId));
};

const ownsBusiness = (record, user, store) => {
  const business = businessForRecord(record, store);
  return !!business && String(business.Owner?.Id ?? business.Owner) === String(user?.Id);
};

const managesAssignedBranch = (record, user, store) => {
  const assignedBranchId = record.branch_c?.Id ?? record.branch_c;
  if (!assignedBranchId) return false;
  return store.getAll('branches_c').some((branch) => {
    const managerAssigned = (branch.manager_c || []).some((person) => {
      return String(person.User?.Id ?? person.User) === String(user?.Id);
    });
    return String(branch.Id) === String(assignedBranchId) && managerAssigned;
  });
};

export const select = (record, user, store) => {
  if (!user) return false;
  return isAdmin(user)
    || ownsBusiness(record, user, store)
    || (user.profile === 'BranchManager_c' && managesAssignedBranch(record, user, store))
    || String(record.Owner?.Id ?? record.Owner) === String(user.Id);
};

export const insert = (record, user) => true;

export const update = (record, user, store) => {
  if (!user) return false;
  return isAdmin(user)
    || ownsBusiness(record, user, store)
    || (user.profile === 'BranchManager_c' && managesAssignedBranch(record, user, store))
    || String(record.Owner?.Id ?? record.Owner) === String(user.Id);
};

export const remove = (record, user, store) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const business = businessForRecord(record, store);
  return !!business
    && business.status_c === 'Deactivated'
    && String(business.Owner?.Id ?? business.Owner) === String(user.Id);
};
