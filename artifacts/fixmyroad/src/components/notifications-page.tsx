import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, BellRing, CheckCheck, HardHat, Info, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/meta';
import type { AppNotification } from '@/lib/types';
import { EmptyState, Spinner } from './bits';
import { useNotifications } from './shell';

function notifTone(title: string): { icon: typeof BellRing; className: string } {
  const lower = title.toLowerCase();
  if (lower.includes('resolved')) return { icon: CheckCheck, className: 'green' };
  if (lower.includes('progress')) return { icon: Wrench, className: 'amber' };
  if (lower.includes('assigned') || lower.includes('crew')) return { icon: HardHat, className: 'sky' };
  if (lower.includes('new')) return { icon: BellRing, className: 'rose' };
  return { icon: Info, className: 'brand' };
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications(true);

  const markAll = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="stack-lg">
      <div className="section-title" style={{ marginBottom: 0 }}>
        <span>{unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'All caught up'}</span>
        {unread > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            {markAll.isPending ? <Spinner small /> : <CheckCheck size={14} />} Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff size={26} />}
          title="No notifications yet"
          body="Status changes, crew assignments, and new reports will show up here."
        />
      ) : (
        <div className="notif-list">
          {notifications.map((n: AppNotification) => {
            const tone = notifTone(n.title);
            const Icon = tone.icon;
            return (
              <button
                type="button"
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => { if (!n.read) markOne.mutate(n.id); }}
              >
                <span className={`notif-icon stat-icon ${tone.className}`}>
                  <Icon size={18} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-body" style={{ display: 'block' }}>{n.body}</span>
                  <span className="notif-time" style={{ display: 'block' }}>{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="unread-dot" aria-label="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
