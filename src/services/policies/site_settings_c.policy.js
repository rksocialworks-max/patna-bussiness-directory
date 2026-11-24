const isAdmin = (user) => user?.profile === 'Admin_c';
const PUBLIC_KEYS = [
  'homepage_section_order', 'upi_id', 'upi_qr', 'support_whatsapp', 'support_email',
  'logo_max_kb', 'cover_max_kb', 'gallery_max_kb', 'gallery_max_files',
  'product_image_max_kb', 'business_description_word_limit', 'business_card_style',
];
export const select = (record, user) => isAdmin(user) || PUBLIC_KEYS.includes(record.setting_key_c);
export const insert = (record, user) => !!user && isAdmin(user);
export const update = (record, user) => !!user && isAdmin(user);
export const remove = (record, user) => !!user && isAdmin(user);
