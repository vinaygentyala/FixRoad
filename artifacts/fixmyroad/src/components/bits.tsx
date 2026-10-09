import type { ReactNode } from 'react';
import { priorityMeta, severityMeta, statusMeta } from '@/lib/meta';
import type { Priority, Severity, Status } from '@/lib/types';

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${statusMeta[status].className}`}>{statusMeta[status].label}</span>;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return <span className={`pill ${priorityMeta[priority].className}`}>{priorityMeta[priority].label}</span>;
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`pill ${severityMeta[severity].className}`}>{severityMeta[severity].label}</span>;
}

export function StatCard({ icon, value, label, tone }: { icon: ReactNode; value: ReactNode; label: string; tone: string }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  return <span className={`spinner ${small ? 'spinner-sm' : ''}`} role="status" aria-label="Loading" />;
}

export function LoaderScreen() {
  return (
    <div className="loader-screen">
      <Spinner />
    </div>
  );
}

export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose: () => void; labelledBy?: string }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </section>
    </div>
  );
}
