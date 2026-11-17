const isAdmin = (user) => user?.profile === 'Admin_c';

export const select = (record, user) => {
  if (!user) return record.status_c === 'Active';
  return isAdmin(user) || record.status_c === 'Active';
};

export const insert = (record, user) => !!user && isAdmin(user);

export const update = (record, user) => !!user && isAdmin(user);

export const remove = (record, user) => !!user && isAdmin(user);
