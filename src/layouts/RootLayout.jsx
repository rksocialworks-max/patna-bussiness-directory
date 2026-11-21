import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToAuth, signOutCurrentUser } from '@/services/firebase/auth';
import { setUser, clearUser, setInitialized } from '@/store/userSlice';
import { verifyRouteAccess } from '@/router/route.utils';
import { APP_CONFIG, AUTH_PROFILES, GENERIC_AUTH } from '@/config/app.config';
import AppLoader from '@/components/AppLoader';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within RootLayout');
  return ctx;
}

const AUTH_PAGE_PATTERN = /^\/(([\w-]+)\/)?(login|signup|callback|forgot-password|reset-password|verify-email|accept-invite)/;

export default function RootLayout() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isInitialized } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (!isMounted) return;
      if (!firebaseUser) {
        dispatch(clearUser());
        return;
      }
      try {
        // Refresh claims once when the auth listener initializes so role assignment
        // changes are reflected consistently with the login page.
        const token = await firebaseUser.getIdTokenResult(true);
        if (!isMounted) return;
        let profile = token.claims.role || token.claims.profile || '';
        if (!profile && db) {
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userSnap.exists()) {
            profile = userSnap.data().role || userSnap.data().profile || '';
          }
        }
        dispatch(setUser({
          uid: firebaseUser.uid,
          emailAddress: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          profile,
        }));
        if (profile) handlePostAuthNavigation();
      } catch {
        if (isMounted) dispatch(setInitialized());
      }
    }, () => {
      if (isMounted) dispatch(setInitialized());
    });
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [dispatch]);

  function handlePostAuthNavigation() {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('redirect');
    if (redirectPath) {
      navigateRef.current(redirectPath, { replace: true });
      return;
    }
    const pathname = window.location.pathname;
    const authMatch = pathname.match(AUTH_PAGE_PATTERN);
    if (authMatch) {
      const profileKey = authMatch[2];
      const matched = profileKey && AUTH_PROFILES?.find(p => p.key === profileKey);
      const target = matched?.redirectAfterAuth ?? GENERIC_AUTH?.redirectAfterAuth ?? '/';
      navigateRef.current(target, { replace: true });
    }
  }

  const deepestMatch = matches[matches.length - 1];
  const accessRule = deepestMatch?.handle?.access ?? 'public';
  // Decided during render, not after it: a route this session may not open never paints.
  const allowed = isInitialized && verifyRouteAccess(accessRule, user);

  useEffect(() => {
    if (!isInitialized) return;
    if (!allowed) {
      const loginRoute = APP_CONFIG.defaultLoginRoute ?? '/login';
      if (user) {
        navigateRef.current('/access-denied', { replace: true });
      } else {
        const currentPath = location.pathname + location.search;
        navigateRef.current(`${loginRoute}?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      }
    }
  }, [location.pathname, isInitialized, allowed, user]);

  const handleLogout = useCallback(async () => {
    await signOutCurrentUser();
    dispatch(clearUser());
    navigateRef.current(APP_CONFIG.defaultLoginRoute ?? '/login', { replace: true });
  }, [dispatch]);

  // Loader while the session resolves AND while a denied route redirects — the shell, the page
  // and its data fetches never mount for a visitor who may not see them.
  if (!isInitialized || !allowed) return <AppLoader fullScreen />;

  return (
    <AuthContext.Provider value={{ logout: handleLogout, user, isAuthenticated }}>
      <ErrorBoundary fullPage>
        <Outlet />
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}
