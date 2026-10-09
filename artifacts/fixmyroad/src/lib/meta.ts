import type { Category, Priority, Severity, Status } from './types';

export function fmtDate(date: string, withTime = false): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

export function timeAgo(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(date);
}

export const statusMeta: Record<Status, { label: string; className: string }> = {
  Submitted: { label: 'Submitted', className: 'pill-status-submitted' },
  'In Progress': { label: 'In Progress', className: 'pill-status-progress' },
  Resolved: { label: 'Resolved', className: 'pill-status-resolved' },
};

export const priorityMeta: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High priority', className: 'pill-priority-high' },
  medium: { label: 'Medium priority', className: 'pill-priority-medium' },
  low: { label: 'Low priority', className: 'pill-priority-low' },
};

export const severityMeta: Record<Severity, { label: string; className: string }> = {
  high: { label: 'High severity', className: 'pill-severity-high' },
  medium: { label: 'Medium severity', className: 'pill-severity-medium' },
  low: { label: 'Low severity', className: 'pill-severity-low' },
  unknown: { label: 'Needs inspection', className: 'pill-severity-unknown' },
};

export const categoryMeta: Record<Category, { label: string; hint: string }> = {
  normal: { label: 'City / residential road', hint: 'Standard priority outside the high-priority season.' },
  school: { label: 'Near a school', hint: 'School zones are always treated as high priority.' },
  hospital: { label: 'Near a hospital', hint: 'Hospital zones are always treated as high priority.' },
  highway: { label: 'Highway or main road', hint: 'Highways are treated as medium priority outside the season.' },
};

export function isHighPrioritySeason(date = new Date()): boolean {
  const month = date.getMonth();
  return month >= 9 || month <= 1;
}

export function reportPhoto(photo: string, severity: Severity): string {
  return photo || `/sample-road-${severity}.svg`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
