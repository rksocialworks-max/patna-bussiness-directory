export const APP_CONFIG = {
  name: 'Patna Business Directory',
  tagline: 'Bihar ke local businesses, ek hi jagah',
  emoji: '📍',
  icon: 'Store',
  defaultTheme: 'light',
  defaultLoginRoute: '/owner/login',
};

export const AUTH_PROFILES = [
  {
    key: 'admin',
    name: 'Admin_c',
    label: 'Super Admin',
    profileSlug: '',
    redirectAfterAuth: '/admin',
    hasSignup: false,
    reportsTo: null,
    authPage: {
      loginTitle: 'Super Admin Login',
      signupTitle: 'Admin access',
      loginDescription: 'Manage the Bihar business directory.',
      signupDescription: null,
    },
    altLinksLeadIn: 'Choose another portal:',
    altLinks: [
      { href: '/owner/login', label: 'Business Owner Login' },
      { href: '/manager/login', label: 'Branch Manager Login' },
    ],
  },
  {
    key: 'owner',
    name: 'BusinessOwner_c',
    label: 'Business Owner',
    profileSlug: '',
    redirectAfterAuth: '/owner/businesses',
    hasSignup: true,
    reportsTo: 'Admin_c',
    authPage: {
      loginTitle: 'Business Owner Login',
      signupTitle: 'Register as a Business Owner',
      loginDescription: 'Manage your business profile and enquiries.',
      signupDescription: 'Create your account to add your business to Bihar.',
    },
    altLinksLeadIn: 'Choose another portal:',
    altLinks: [
      { href: '/admin/login', label: 'Super Admin Login' },
      { href: '/manager/login', label: 'Branch Manager Login' },
    ],
  },
  {
    key: 'manager',
    name: 'BranchManager_c',
    label: 'Branch Manager',
    profileSlug: '',
    redirectAfterAuth: '/owner/workspace',
    hasSignup: false,
    reportsTo: 'BusinessOwner_c',
    authPage: {
      loginTitle: 'Branch Manager Login',
      signupTitle: 'Branch Manager Account',
      loginDescription: 'Access your assigned branch workspace.',
      signupDescription: null,
    },
    altLinksLeadIn: 'Choose another portal:',
    altLinks: [
      { href: '/owner/login', label: 'Business Owner Login' },
      { href: '/admin/login', label: 'Super Admin Login' },
    ],
  },
];

export const GENERIC_AUTH = {
  loginTitle: 'Welcome back',
  signupTitle: 'Create account',
  loginDescription: 'Sign in to Patna Business Directory.',
  signupDescription: 'Join Bihar’s local business network.',
  redirectAfterAuth: '/owner/businesses',
};
