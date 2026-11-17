const isAdmin = (user) => user?.profile === 'Admin_c';
const ownsBusiness = (record, user, store) => store.getAll('businesses_c').some((business) => String(business.Id) === String(record.business_c?.Id ?? record.business_c) && String(business.Owner?.Id ?? business.Owner) === String(user?.Id));
export const select = (record, user, store) => !!user && (isAdmin(user) || (record.business_c && ownsBusiness(record, user, store)) || String(record.Owner?.Id ?? record.Owner) === String(user.Id));
export const insert = (record, user) => true;
export const update = (record, user, store) => !!user && (isAdmin(user) || (record.business_c && ownsBusiness(record, user, store)) || String(record.Owner?.Id ?? record.Owner) === String(user.Id));
export const remove = (record, user) => !!user && isAdmin(user);
