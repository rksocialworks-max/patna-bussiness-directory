const isAdmin = (user) => user?.profile === 'Admin_c';

export const select = (record, user) => {
  if (record.status_c === 'Active') return true;
  if (!user) return false;
  return isAdmin(user) || String(record.Owner?.Id ?? record.Owner) === String(user.Id);
};

export const insert = (record, user) => {
  return !!user && (isAdmin(user) || user.profile === 'BusinessOwner_c');
};

export const update = (record, user) => !!user && isAdmin(user);

export const remove = (record, user) => !!user && isAdmin(user);
