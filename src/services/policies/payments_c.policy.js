const isAdmin = (user) => user?.profile === 'Admin_c';

const ownsBusiness = (record, user, store) => {
  return store.getAll('businesses_c').some((business) => {
    const relatedId = record.business_c?.Id ?? record.business_c;
    const ownerId = business.Owner?.Id ?? business.Owner;
    return String(business.Id) === String(relatedId) && String(ownerId) === String(user?.Id);
  });
};

export const select = (record, user, store) => {
  if (!user) return false;
  return isAdmin(user) || ownsBusiness(record, user, store);
};

// Payment creation and state transitions must go through trusted Firebase
// callable functions. Client-side CRUD is intentionally disabled.
export const insert = () => false;
export const update = () => false;
export const remove = () => false;
