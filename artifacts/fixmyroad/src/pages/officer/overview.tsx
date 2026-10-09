import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowRight, CheckCircle2, ClipboardList, Flame, Hospital, Wrench,
} from 'lucide-react';
import { Spinner, StatCard } from '@/components/bits';
import { ReportCard, ReportModal } from '@/components/report';
import { api } from '@/lib/api';
import { categoryMeta } from '@/lib/meta';
import type { Category, Report } from '@/lib/types';
import { SeasonBanner } from '../reporter/overview';

export function useAllReports() {
  return useQuery({
    queryKey: ['reports', 'all'],
    queryFn: () => api<{ reports: Report[]; teams: string[] }>('/api/reports'),
  });
}

const categoryColors: Record<Category, string> = {
  school: 'var(--rose)',
  hospital: 'var(--teal)',
  highway: 'var(--amber)',
  normal: 'var(--sky)',
};

export default function OfficerOverview() {
  const { data, isLoading } = useAllReports();
  const [selected, setSelected] = useState<Report | null>(null);
  const reports = useMemo(() => data?.reports ?? [], [data]);

  const active = reports.filter((r) => r.status !== 'Resolved');
  const highPriority = active.filter((r) => r.priority === 'high');
  const inProgress = reports.filter((r) => r.status === 'In Progress');
  const resolved = reports.filter((r) => r.status === 'Resolved');
  const unassigned = active.filter((r) => !r.assignedTeam);
  const recent = reports.slice(0, 4);

  const byCategory = useMemo(() => {
    const counts: Record<Category, number> = { school: 0, hospital: 0, highway: 0, normal: 0 };
    for (const r of active) counts[r.category] += 1;
    return counts;
  }, [active]);
  const maxCategory = Math.max(1, ...Object.values(byCategory));

  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}><Spinner /></div>;
  }

  return (
    <div className="stack-lg">
      <SeasonBanner />

      <div className="stat-grid">
        <StatCard icon={<ClipboardList size={20} />} value={active.length} label="Active reports" tone="brand" />
        <StatCard icon={<Flame size={20} />} value={highPriority.length} label="High priority open" tone="rose" />
        <StatCard icon={<Wrench size={20} />} value={inProgress.length} label="Repairs in progress" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} value={resolved.length} label="Resolved total" tone="green" />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <h3 className="section-title">Active reports by zone</h3>
          <div className="stack" style={{ gap: 12 }}>
            {(Object.keys(byCategory) as Category[]).map((cat) => (
              <div className="bar-row" key={cat}>
                <span className="bar-label">{categoryMeta[cat].label}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{
                      display: 'block',
                      width: `${(byCategory[cat] / maxCategory) * 100}%`,
                      background: categoryColors[cat],
                    }}
                  />
                </span>
                <span className="bar-value">{byCategory[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Needs attention</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="stat-icon rose">
              <Hospital size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{unassigned.length} active report{unassigned.length === 1 ? '' : 's'} without a crew</div>
              <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Assign a maintenance crew to keep repairs moving.</div>
            </div>
            <Link href="/officer/assignments" className="btn btn-outline btn-sm">
              Assign <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="stat-icon amber">
              <Flame size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{highPriority.length} high-priority report{highPriority.length === 1 ? '' : 's'} open</div>
              <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>School zones, hospitals, and seasonal reports land here.</div>
            </div>
            <Link href="/officer/priority" className="btn btn-outline btn-sm">
              Review <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div>
        <div className="section-title">
          <span>Latest reports</span>
          <Link href="/officer/reports" className="link-btn">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="report-grid">
          {recent.map((report) => (
            <ReportCard key={report.id} report={report} onOpen={setSelected} showReporter />
          ))}
        </div>
      </div>

      {selected && <ReportModal report={selected} isOfficer onClose={() => setSelected(null)} />}
    </div>
  );
}
