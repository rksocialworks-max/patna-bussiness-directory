const isAdmin = (user) => user?.profile === 'Admin_c';

const businessForRecord = (record, store) => {
  const businessId = record.business_c?.Id ?? record.business_c;
  return store.getAll('businesses_c').find((business) => String(business.Id) === String(businessId));
};

const ownsBusiness = (record, user, store) => {
  const business = businessForRecord(record, store);
  return !!business && String(business.Owner?.Id ?? business.Owner) === String(user?.Id);
};

export const select = (record, user, store) => !!user && (isAdmin(user) || ownsBusiness(record, user, store));

export const insert = (record, user) => !!user && isAdmin(user);

export const update = (record, user) => !!user && isAdmin(user);

export const remove = (record, user, store) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const business = businessForRecord(record, store);
  return !!business
    && business.status_c === 'Deactivated'
    && String(business.Owner?.Id ?? business.Owner) === String(user.Id);
};
