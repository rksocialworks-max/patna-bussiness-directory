const isAdmin = (user) => user?.profile === 'Admin_c';

const ownsBranch = (record, user, store) => {
  return store.getAll('branches_c').some((branch) => {
    const branchId = record.branch_c?.Id ?? record.branch_c;
    const ownerId = branch.Owner?.Id ?? branch.Owner;
    return String(branch.Id) === String(branchId) && String(ownerId) === String(user?.Id);
  });
};

export const select = (record, user, store) => !!user && (isAdmin(user) || ownsBranch(record, user, store));

export const insert = (record, user) => !!user;

export const update = (record, user) => !!user && isAdmin(user);

export const remove = (record, user) => !!user && isAdmin(user);
