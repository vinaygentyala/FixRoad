import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { EmptyState, Spinner } from '@/components/bits';
import { ReportCard, ReportModal } from '@/components/report';
import type { Category, Priority, Report, Status } from '@/lib/types';
import { useAllReports } from './overview';

export function ReportBrowser({
  fixedPriority,
  emptyTitle,
  emptyBody,
}: {
  fixedPriority?: Priority;
  emptyTitle: string;
  emptyBody: string;
}) {
  const { data, isLoading } = useAllReports();
  const [selected, setSelected] = useState<Report | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');

  const reports = data?.reports ?? [];
  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (fixedPriority && r.priority !== fixedPriority) return false;
        if (fixedPriority && r.status === 'Resolved') return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.location.toLowerCase().includes(q) ||
            r.ticketId.toLowerCase().includes(q) ||
            r.reporterName.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [reports, fixedPriority, statusFilter, priorityFilter, categoryFilter, search],
  );

  return (
    <div className="stack-lg">
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} />
          <input
            className="field"
            placeholder="Search location, ticket, or reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="field filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        {!fixedPriority && (
          <select className="field filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)} aria-label="Filter by priority">
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        )}
        <select className="field filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | Category)} aria-label="Filter by zone">
          <option value="all">All zones</option>
          <option value="school">Near a school</option>
          <option value="hospital">Near a hospital</option>
          <option value="highway">Highway or main road</option>
          <option value="normal">City / residential road</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList size={26} />} title={emptyTitle} body={emptyBody} />
      ) : (
        <>
          <p style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>
            Showing {filtered.length} of {reports.length} report{reports.length === 1 ? '' : 's'}
          </p>
          <div className="report-grid">
            {filtered.map((report: Report) => (
              <ReportCard key={report.id} report={report} onOpen={setSelected} showReporter />
            ))}
          </div>
        </>
      )}

      {selected && <ReportModal report={selected} isOfficer onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function AllReports() {
  return (
    <ReportBrowser
      emptyTitle="No reports match"
      emptyBody="Try adjusting the search or filters. New citizen reports appear here automatically."
    />
  );
}
