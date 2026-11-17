const isAdmin = (user) => user?.profile === 'Admin_c';

const businessForRecord = (record, store) => {
  const relatedId = record.business_c?.Id ?? record.business_c;
  return store.getAll('businesses_c').find((business) => String(business.Id) === String(relatedId));
};

const ownsBusiness = (record, user, store) => {
  const business = businessForRecord(record, store);
  return !!business && String(business.Owner?.Id ?? business.Owner) === String(user?.Id);
};

export const select = (record, user, store) => {
  if (isAdmin(user)) return true;
  if (user?.profile === 'BusinessOwner_c' && ownsBusiness(record, user, store)) return true;
  return record.status_c === 'Approved' && record.report_status_c !== 'Hidden';
};

export const insert = (record, user) => true;

export const update = (record, user, store) => {
  if (!user) return false;
  return isAdmin(user) || (user.profile === 'BusinessOwner_c' && ownsBusiness(record, user, store));
};

export const remove = (record, user, store) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const business = businessForRecord(record, store);
  return !!business
    && business.status_c === 'Deactivated'
    && String(business.Owner?.Id ?? business.Owner) === String(user.Id);
};
