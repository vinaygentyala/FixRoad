import { useState, type FormEvent } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import {
  ArrowLeft, BellRing, Camera, CheckCircle2, ClipboardList, Construction,
  HardHat, MapPin, ShieldCheck, UserRound,
} from 'lucide-react';
import { LoaderScreen, Spinner } from '@/components/bits';
import { roleHome } from '@/components/shell';
import { ApiError } from '@/lib/api';
import { useLogin, useSession, useSignup } from '@/lib/session';
import type { Role } from '@/lib/types';

const copy: Record<Role, {
  heading: string;
  sub: string;
  points: Array<{ icon: typeof Camera; text: string }>;
  demoEmail: string;
  demoPassword: string;
  demoLabel: string;
}> = {
  reporter: {
    heading: 'Your street, your say. Report it in seconds.',
    sub: 'Join your community keeping the roads safe — snap a photo and we handle the rest.',
    points: [
      { icon: Camera, text: 'Capture potholes with live camera or upload' },
      { icon: MapPin, text: 'AI-assisted severity and smart priority routing' },
      { icon: BellRing, text: 'Notifications at every step until resolved' },
    ],
    demoEmail: 'maya@example.com',
    demoPassword: 'reporter123',
    demoLabel: 'Demo reporter',
  },
  officer: {
    heading: 'Triage faster. Repair what matters first.',
    sub: 'The officer portal brings every report into one evidence-led repair queue.',
    points: [
      { icon: ClipboardList, text: 'All reports in one prioritized queue' },
      { icon: ShieldCheck, text: 'Seasonal and zone-based priority rules' },
      { icon: CheckCircle2, text: 'Assign crews and confirm repairs' },
    ],
    demoEmail: 'officer@fixmyroad.gov',
    demoPassword: 'officer123',
    demoLabel: 'Demo officer',
  },
};

export default function AuthPage({ role }: { role: Role }) {
  const [, navigate] = useLocation();
  const { user, isLoading } = useSession();
  const login = useLogin();
  const signup = useSignup();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const c = copy[role];
  const isOfficer = role === 'officer';
  const pending = login.isPending || signup.isPending;

  if (isLoading) return <LoaderScreen />;
  if (user) return <Redirect to={roleHome(user.role)} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    const onSuccess = () => navigate(roleHome(role));
    if (mode === 'login') {
      login.mutate({ email, password, role }, { onError, onSuccess });
    } else {
      signup.mutate({ name, email, password, role }, { onError, onSuccess });
    }
  };

  return (
    <div className="auth-wrap">
      <aside className={`auth-aside ${isOfficer ? '' : 'reporter'}`}>
        <div className="auth-aside-inner">
          <Link href="/" className="landing-brand" style={{ color: '#fff' }}>
            <span className="brand-mark">
              <Construction size={20} />
            </span>
            <span className="landing-brand-name">FixMyRoad</span>
          </Link>
          <h2>{c.heading}</h2>
          <p>{c.sub}</p>
          <div className="auth-points">
            {c.points.map((point) => (
              <div className="auth-point" key={point.text}>
                <point.icon size={17} />
                <span>{point.text}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link href="/" className="auth-back">
            <ArrowLeft size={15} /> Back to home
          </Link>
          <div className="pill-row" style={{ marginBottom: 14 }}>
            <span className="pill pill-role">
              {isOfficer ? <HardHat size={13} /> : <UserRound size={13} />}
              {isOfficer ? 'Officer portal' : 'Citizen reporter'}
            </span>
          </div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth-sub">
            {mode === 'login'
              ? `Sign in to your ${isOfficer ? 'officer' : 'reporter'} account to continue.`
              : `Sign up as a ${isOfficer ? 'municipal officer' : 'citizen reporter'} to get started.`}
          </p>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <div>
                <label className="field-label" htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signup' ? 8 : 1}
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={pending}>
              {pending && <Spinner small />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button type="button" className="link-btn" onClick={() => { setMode('signup'); setError(''); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="link-btn" onClick={() => { setMode('login'); setError(''); }}>
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="demo-creds">
            <strong>{c.demoLabel} credentials</strong>
            <br />
            Email <code>{c.demoEmail}</code> · Password <code>{c.demoPassword}</code>
          </div>
        </div>
      </main>
    </div>
  );
}
