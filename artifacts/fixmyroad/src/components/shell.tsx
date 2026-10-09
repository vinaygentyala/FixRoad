import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Construction, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ComponentType, ReactNode } from 'react';
import { api } from '@/lib/api';
import { initials } from '@/lib/meta';
import { useLogout } from '@/lib/session';
import type { AppNotification, Role, User } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number | string }>;
  exact?: boolean;
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications'),
    enabled,
    refetchInterval: 30_000,
  });
}

export function DashboardShell({
  user,
  nav,
  title,
  subtitle,
  children,
}: {
  user: User;
  nav: NavItem[];
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [path, navigate] = useLocation();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const { data } = useNotifications(true);
  const unread = data?.unreadCount ?? 0;
  const notifHref = user.role === 'officer' ? '/officer/notifications' : '/reporter/notifications';
  const profileHref = user.role === 'officer' ? '/officer/profile' : '/reporter/profile';
  const homeHref = user.role === 'officer' ? '/officer' : '/reporter';

  const isActive = (item: NavItem) => (item.exact ? path === item.href : path.startsWith(item.href));

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        navigate('/');
      },
    });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href={homeHref} className="side-brand" aria-label="FixMyRoad home">
          <span className="brand-mark">
            <Construction size={20} />
          </span>
          <span>
            <div className="side-brand-name">FixMyRoad</div>
            <div className="side-brand-sub">{user.role === 'officer' ? 'Officer portal' : 'Citizen portal'}</div>
          </span>
        </Link>
        <nav className="side-nav" aria-label="Dashboard navigation">
          <div className="side-section">Menu</div>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`side-link ${isActive(item) ? 'active' : ''}`}>
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.label === 'Notifications' && unread > 0 && <span className="link-badge">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="side-footer">
          <Link href={profileHref} className="side-user">
            <span className="avatar">{initials(user.name)}</span>
            <span style={{ minWidth: 0 }}>
              <div className="side-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div className="side-user-role">{user.role === 'officer' ? 'Municipal officer' : 'Citizen reporter'}</div>
            </span>
          </Link>
          <button type="button" className="side-link" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }} onClick={signOut}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>
          <div className="topbar-actions">
            <Link href={notifHref} className="icon-btn" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
              <Bell size={18} />
              {unread > 0 && <span className="dot" />}
            </Link>
            <Link href={profileHref} className="avatar" aria-label="Your profile" style={{ textDecoration: 'none' }}>
              {initials(user.name)}
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {nav.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={`mobile-tab ${isActive(item) ? 'active' : ''}`}>
            <item.icon size={19} />
            <span>{item.label.split(' ')[0]}</span>
            {item.label === 'Notifications' && unread > 0 && <span className="link-badge">{unread}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function roleHome(role: Role): string {
  return role === 'officer' ? '/officer' : '/reporter';
}
