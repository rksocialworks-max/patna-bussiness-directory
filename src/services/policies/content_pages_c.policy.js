const isAdmin = (user) => user?.profile === 'Admin_c';
export const select = (record, user) => record.status_c === 'Published' || (!!user && isAdmin(user));
export const insert = (record, user) => !!user && isAdmin(user);
export const update = (record, user) => !!user && isAdmin(user);
export const remove = (record, user) => !!user && isAdmin(user);
