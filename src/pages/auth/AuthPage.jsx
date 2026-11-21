import { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signIn, signUp, sendCurrentEmailVerification, signOutCurrentUser } from '@/services/firebase/auth';
import { isFirebaseConfigured } from '@/lib/firebase';
import { setUser } from '@/store/userSlice';
import { AUTH_PROFILES, GENERIC_AUTH } from '@/config/app.config';
import ApperIcon from '@/components/ApperIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AuthLayout from './AuthLayout';

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile: profileParam } = useParams();

  const hasProfiles = AUTH_PROFILES?.length > 0;
  const matchedProfile = hasProfiles && profileParam
    ? AUTH_PROFILES.find((p) => p.key === profileParam)
    : null;

  const redirectAfterAuth = matchedProfile?.redirectAfterAuth ?? GENERIC_AUTH.redirectAfterAuth;
  const authPage = matchedProfile?.authPage;
  const loginTitle = authPage?.loginTitle ?? GENERIC_AUTH.loginTitle;
  const signupTitle = authPage?.signupTitle ?? GENERIC_AUTH.signupTitle;
  const loginDescription = authPage?.loginDescription ?? GENERIC_AUTH.loginDescription;
  const signupDescription = authPage?.signupDescription ?? GENERIC_AUTH.signupDescription;

  const title = mode === 'login' ? loginTitle : signupTitle;
  const description = mode === 'login' ? loginDescription : signupDescription;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectionFailed = !isFirebaseConfigured;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const firebaseUser = await signIn(email, password);
        if (!firebaseUser.emailVerified && !['owner', 'manager'].includes(matchedProfile?.key)) {
          let verificationSent = false;
          try {
            await sendCurrentEmailVerification();
            verificationSent = true;
          } catch {
            // Keep the account signed out even if the verification email cannot be sent.
          }
          await signOutCurrentUser();
          setError(verificationSent
            ? 'Your email is not verified yet. A new verification link has been sent. Please verify your email, then sign in again.'
            : 'Your email is not verified. Please verify it using your earlier email link, or try again to resend it.');
          return;
        }
        // Simple portal login: Owner and Manager use Firebase Authentication only.
        // Role/profile lookup is temporarily bypassed for these portals.
        let profile = '';
        if (matchedProfile?.key === 'owner' || matchedProfile?.key === 'manager') {
          profile = matchedProfile.name;
        } else {
          const token = await firebaseUser.getIdTokenResult(true);
          profile = token.claims.role || token.claims.profile || (token.claims.superAdmin === true ? 'Admin_c' : '');
          if (!profile) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) profile = userSnap.data().role || userSnap.data().profile || '';
          }
          if (!profile) {
            setError('Your account role is not assigned. Please contact the directory administrator.');
            return;
          }
          if (matchedProfile?.name && profile !== matchedProfile.name) {
            await signOutCurrentUser();
            setError(`This account is assigned as ${profile.replace(/_c$/, '')}. Please use the correct login portal.`);
            return;
          }
        }
        dispatch(setUser({
          uid: firebaseUser.uid,
          emailAddress: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          profile,
        }));
        navigate(redirectAfterAuth);
      } else {
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        const newUser = await signUp({ email, password });
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          email: newUser.email || email.trim(),
          role: 'BusinessOwner_c',
          profile: 'BusinessOwner_c',
          createdAt: serverTimestamp(),
        });
        await sendCurrentEmailVerification();
        setError('Account created with Business Owner access. Please verify your email using the link we sent. Your business listing will still require Admin approval before it appears publicly.');
      }
    } catch (err) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  if (connectionFailed) {
    return (
      <AuthLayout title="Firebase setup required" icon="WifiOff">
        <p className="text-sm text-muted-foreground">
          Firebase configuration is missing. Copy .env.example to .env.local, verify the Firebase values, then restart the development server.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title} description={description}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === 'login' && (
              <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <ApperIcon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>
        </div>
        {mode === 'signup' && (
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                <ApperIcon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={16} />
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="pt-2">
          <Button type="submit" disabled={loading} className="w-full h-9">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </div>
      </form>
      <AuthFooter mode={mode} profilePrefix={profileParam} altLinksLeadIn={matchedProfile?.altLinksLeadIn} altLinks={matchedProfile?.altLinks} />
    </AuthLayout>
  );
}

function AuthFooter({ mode, profilePrefix, altLinksLeadIn, altLinks }) {
  const base = profilePrefix ? `/${profilePrefix}` : '';
  return (
    <div className="mt-8 space-y-5">
      <p className="text-[13px] text-center text-muted-foreground">
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <Link to={`${base}/signup`} className="text-primary font-medium hover:underline underline-offset-4 transition-colors">Sign up</Link>
          </>
        ) : (
          <>Already have an account?{' '}
            <Link to={`${base}/login`} className="text-primary font-medium hover:underline underline-offset-4 transition-colors">Sign in</Link>
          </>
        )}
      </p>
      {altLinks?.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest select-none">or continue as</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="flex flex-col gap-2">
            {altLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 hover:border-primary/20 hover:bg-primary/[0.03] transition-all"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ApperIcon name="UserRound" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  {altLinksLeadIn && <p className="text-xs text-muted-foreground truncate">{altLinksLeadIn}</p>}
                </div>
                <ApperIcon name="ChevronRight" size={16} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}