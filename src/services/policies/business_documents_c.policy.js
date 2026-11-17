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

export const insert = (record, user) => {
  return !!user && (isAdmin(user) || user.profile === 'BusinessOwner_c');
};

export const update = (record, user) => !!user && isAdmin(user);

export const remove = (record, user) => !!user && isAdmin(user);
