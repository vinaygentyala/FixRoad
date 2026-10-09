import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CalendarDays, HardHat, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { api, ApiError } from '@/lib/api';
import { fmtDate, initials } from '@/lib/meta';
import { useLogout } from '@/lib/session';
import type { User } from '@/lib/types';
import { Spinner } from './bits';

export function ProfilePage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [name, setName] = useState(user.name);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => api<{ user: User }>('/api/auth/me', { method: 'PATCH', body: { name } }),
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data.user);
      setMessage('Profile updated.');
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
      setMessage('');
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        navigate('/');
      },
    });
  };

  return (
    <div className="stack-lg">
      <div className="card card-pad">
        <div className="profile-head">
          <span className="avatar-lg">{initials(user.name)}</span>
          <div>
            <div className="profile-name">{user.name}</div>
            <div className="profile-meta">
              <span className="pill pill-role">
                {user.role === 'officer' ? <HardHat size={13} /> : <UserRound size={13} />}
                {user.role === 'officer' ? 'Municipal officer' : 'Citizen reporter'}
              </span>
            </div>
          </div>
        </div>
        <dl className="detail-list">
          <div className="detail-row">
            <dt><Mail size={14} style={{ verticalAlign: '-2px', marginRight: 7 }} />Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="detail-row">
            <dt><CalendarDays size={14} style={{ verticalAlign: '-2px', marginRight: 7 }} />Member since</dt>
            <dd>{fmtDate(user.createdAt)}</dd>
          </div>
          <div className="detail-row">
            <dt><ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 7 }} />Account type</dt>
            <dd>{user.role === 'officer' ? 'Officer portal access' : 'Reporter portal access'}</dd>
          </div>
        </dl>
      </div>

      <div className="card card-pad">
        <h3 className="section-title">Edit profile</h3>
        <form className="auth-form" onSubmit={submit}>
          <div>
            <label className="field-label" htmlFor="profile-name">Full name</label>
            <input
              id="profile-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          {message && (
            <div className="form-note">
              <BadgeCheck size={16} />
              <span>{message}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={save.isPending || name.trim() === user.name}>
              {save.isPending && <Spinner small />} Save changes
            </button>
            <button type="button" className="btn btn-outline" onClick={signOut} disabled={logout.isPending}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
