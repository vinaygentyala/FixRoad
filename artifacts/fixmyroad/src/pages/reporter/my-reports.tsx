import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Camera, ClipboardList, Search } from 'lucide-react';
import { EmptyState, Spinner } from '@/components/bits';
import { ReportCard, ReportModal } from '@/components/report';
import type { Report, Status } from '@/lib/types';
import { useMyReports } from './overview';

export default function MyReports() {
  const { data, isLoading } = useMyReports();
  const [selected, setSelected] = useState<Report | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');

  const reports = data?.reports ?? [];
  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.location.toLowerCase().includes(q) ||
            r.ticketId.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [reports, statusFilter, search],
  );

  return (
    <div className="stack-lg">
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} />
          <input
            className="field"
            placeholder="Search by location or ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<Camera size={26} />}
          title="No reports yet"
          body="Report your first pothole and track the repair from here."
          action={
            <Link href="/reporter/report" className="btn btn-primary">
              <Camera size={16} /> Report a pothole
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} />}
          title="Nothing matches"
          body="Try a different search or status filter."
        />
      ) : (
        <div className="report-grid">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && <ReportModal report={selected} isOfficer={false} onClose={() => setSelected(null)} />}
    </div>
  );
}
