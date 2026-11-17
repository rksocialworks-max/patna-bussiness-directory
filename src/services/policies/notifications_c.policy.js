const isAdmin = (user) => user?.profile === 'Admin_c';

export const select = (record, user) => {
  if (!user) return false;
  return isAdmin(user) || String(record.Owner?.Id ?? record.Owner) === String(user.Id);
};

export const insert = (record, user) => !!user && isAdmin(user);

export const update = (record, user) => {
  if (!user) return false;
  return isAdmin(user) || String(record.Owner?.Id ?? record.Owner) === String(user.Id);
};

export const remove = (record, user) => !!user && isAdmin(user);
