import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowRight, Camera, CheckCircle2, ClipboardList, Clock3, Wrench,
} from 'lucide-react';
import { EmptyState, Spinner, StatCard } from '@/components/bits';
import { ReportCard, ReportModal } from '@/components/report';
import { api } from '@/lib/api';
import type { Report } from '@/lib/types';

export function useMyReports() {
  return useQuery({
    queryKey: ['reports', 'mine'],
    queryFn: () => api<{ reports: Report[] }>('/api/reports/mine'),
  });
}

export default function ReporterOverview() {
  const { data, isLoading } = useMyReports();
  const [selected, setSelected] = useState<Report | null>(null);
  const reports = data?.reports ?? [];

  const active = reports.filter((r) => r.status !== 'Resolved');
  const inProgress = reports.filter((r) => r.status === 'In Progress');
  const resolved = reports.filter((r) => r.status === 'Resolved');
  const recent = reports.slice(0, 3);

  return (
    <div className="stack-lg">

      <div className="stat-grid">
        <StatCard icon={<ClipboardList size={20} />} value={reports.length} label="Reports submitted" tone="brand" />
        <StatCard icon={<Clock3 size={20} />} value={active.length} label="Awaiting repair" tone="amber" />
        <StatCard icon={<Wrench size={20} />} value={inProgress.length} label="Being repaired" tone="sky" />
        <StatCard icon={<CheckCircle2 size={20} />} value={resolved.length} label="Resolved" tone="green" />
      </div>

      <div className="card card-pad" style={{ background: 'linear-gradient(110deg, var(--deep) 0%, var(--deep-2) 70%, var(--deep-3) 100%)', border: 'none', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 520 }}>
            <h3 style={{ fontSize: 20, marginBottom: 6 }}>Spotted another pothole?</h3>
            <p style={{ color: 'rgb(255 255 255 / 0.7)', fontSize: 14 }}>
              Snap a photo — our AI checks the damage and the right team gets notified instantly.
            </p>
          </div>
          <Link href="/reporter/report" className="btn btn-primary btn-lg">
            <Camera size={17} /> Report a pothole <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div>
        <div className="section-title">
          <span>Your recent reports</span>
          {reports.length > 3 && (
            <Link href="/reporter/reports" className="link-btn">
              View all <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<Camera size={26} />}
            title="No reports yet"
            body="When you report a pothole it will appear here with live status updates from the road team."
            action={
              <Link href="/reporter/report" className="btn btn-primary">
                <Camera size={16} /> Report your first pothole
              </Link>
            }
          />
        ) : (
          <div className="report-grid">
            {recent.map((report) => (
              <ReportCard key={report.id} report={report} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && <ReportModal report={selected} isOfficer={false} onClose={() => setSelected(null)} />}
    </div>
  );
}
