import { useMemo, useState } from 'react';
import { HardHat, UsersRound } from 'lucide-react';
import { EmptyState, PriorityPill, Spinner, StatusPill } from '@/components/bits';
import { ReportModal, TEAMS } from '@/components/report';
import { fmtDate } from '@/lib/meta';
import type { Report } from '@/lib/types';
import { useAllReports } from './overview';

export default function Assignments() {
  const { data, isLoading } = useAllReports();
  const [selected, setSelected] = useState<Report | null>(null);

  const reports = useMemo(() => data?.reports ?? [], [data]);
  const active = useMemo(() => reports.filter((r) => r.status !== 'Resolved'), [reports]);

  const grouped = useMemo(() => {
    const map = new Map<string, Report[]>();
    for (const team of TEAMS) map.set(team, []);
    const unassigned: Report[] = [];
    for (const report of active) {
      if (report.assignedTeam && map.has(report.assignedTeam)) {
        map.get(report.assignedTeam)!.push(report);
      } else {
        unassigned.push(report);
      }
    }
    return { map, unassigned };
  }, [active]);

  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}><Spinner /></div>;
  }

  return (
    <div className="stack-lg">
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="stat-icon brand">
          <UsersRound size={20} />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {grouped.unassigned.length} of {active.length} active report{active.length === 1 ? '' : 's'} need a crew
          </div>
          <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>
            Open any report to assign or reassign a maintenance crew. Reporters are notified automatically.
          </div>
        </div>
      </div>

      {grouped.unassigned.length > 0 && (
        <div>
          <h3 className="section-title">Unassigned ({grouped.unassigned.length})</h3>
          <div className="report-grid">
            {grouped.unassigned.map((report) => (
              <AssignmentCard key={report.id} report={report} onOpen={setSelected} />
            ))}
          </div>
        </div>
      )}

      {TEAMS.map((team) => {
        const teamReports = grouped.map.get(team) ?? [];
        return (
          <div key={team}>
            <h3 className="section-title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <HardHat size={17} style={{ color: 'var(--ink-2)' }} />
                {team}
              </span>
              <span className="pill pill-severity-unknown">{teamReports.length} active</span>
            </h3>
            {teamReports.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '4px 0 8px' }}>No active assignments.</p>
            ) : (
              <div className="report-grid">
                {teamReports.map((report) => (
                  <AssignmentCard key={report.id} report={report} onOpen={setSelected} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {active.length === 0 && (
        <EmptyState
          icon={<HardHat size={26} />}
          title="Nothing to assign"
          body="All reports are resolved. New reports will appear here for crew assignment."
        />
      )}

      {selected && <ReportModal report={selected} isOfficer onClose={() => setSelected(null)} />}
    </div>
  );
}

function AssignmentCard({ report, onOpen }: { report: Report; onOpen: (report: Report) => void }) {
  return (
    <button type="button" className="report-card" style={{ textAlign: 'left', padding: 0, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }} onClick={() => onOpen(report)}>
      <div className="report-body">
        <div className="report-top">
          <div style={{ minWidth: 0 }}>
            <span className="ticket-id">{report.ticketId}</span>
            <h3 className="report-title">{report.location}</h3>
            <div className="report-meta">{report.reporterName} · {fmtDate(report.createdAt)}</div>
          </div>
          <StatusPill status={report.status} />
        </div>
        <div className="pill-row">
          <PriorityPill priority={report.priority} />
        </div>
      </div>
    </button>
  );
}
