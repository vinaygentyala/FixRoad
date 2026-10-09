import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, ChevronRight, HardHat, MapPin, Play, Sparkles, User, X,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { categoryMeta, fmtDate, reportPhoto } from '@/lib/meta';
import type { Priority, Report, Severity, Status } from '@/lib/types';
import { Modal, PriorityPill, SeverityPill, Spinner, StatusPill } from './bits';

export const TEAMS = [
  'Road Maintenance - North',
  'Road Maintenance - Central',
  'Road Maintenance - South',
  'Emergency Response',
];

export function ReportCard({ report, onOpen, showReporter }: { report: Report; onOpen: (report: Report) => void; showReporter?: boolean }) {
  return (
    <article className="report-card">
      <img className="report-photo" src={reportPhoto(report.photo, report.severity)} alt={`Road damage near ${report.location}`} loading="lazy" />
      <div className="report-body">
        <div className="report-top">
          <div style={{ minWidth: 0 }}>
            <span className="ticket-id">{report.ticketId}</span>
            <h3 className="report-title">{report.location}</h3>
            <div className="report-meta">
              <MapPin size={13} />
              <span>{categoryMeta[report.category].label}</span>
              {showReporter && (
                <>
                  <span aria-hidden="true">·</span>
                  <User size={13} />
                  <span>{report.reporterName}</span>
                </>
              )}
            </div>
          </div>
          <StatusPill status={report.status} />
        </div>
        {report.description && <p className="report-desc">{report.description}</p>}
        <div className="pill-row">
          <PriorityPill priority={report.priority} />
          <SeverityPill severity={report.severity} />
        </div>
        <div className="report-foot">
          <span className="report-date">Reported {fmtDate(report.createdAt)}</span>
          <button type="button" className="link-btn" onClick={() => onOpen(report)}>
            View details <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ReportModal({ report, isOfficer, onClose }: { report: Report; isOfficer: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState<Severity>(report.severity);
  const [priority, setPriority] = useState<Priority>(report.priority);
  const [team, setTeam] = useState(report.assignedTeam);
  const [notes, setNotes] = useState(report.officerNotes);
  const [correctionReason, setCorrectionReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSeverity(report.severity);
    setPriority(report.priority);
    setTeam(report.assignedTeam);
    setNotes(report.officerNotes);
    setCorrectionReason('');
    setError('');
  }, [report]);

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ report: Report }>(`/api/reports/${report.id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save changes. Please try again.');
    },
  });

  const saveFields = () => update.mutate({ severity, priority, priorityReason: correctionReason, assignedTeam: team, officerNotes: notes });
  const startWork = () => update.mutate({ status: 'In Progress' satisfies Status, severity, priority, priorityReason: correctionReason, assignedTeam: team, officerNotes: notes });
  const resolve = () => update.mutate({ status: 'Resolved' satisfies Status, officerNotes: notes });

  return (
    <Modal onClose={onClose} labelledBy="report-modal-title">
      <div className="modal-head">
        <div style={{ minWidth: 0 }}>
          <span className="ticket-id">{report.ticketId}</span>
          <h2 id="report-modal-title" style={{ fontSize: 22, marginTop: 4 }}>{report.location}</h2>
          <div className="pill-row" style={{ marginTop: 10 }}>
            <StatusPill status={report.status} />
            <PriorityPill priority={report.priority} />
            <SeverityPill severity={report.severity} />
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
          <X size={18} />
        </button>
      </div>

      <div className="modal-body">
        <div className="detail-grid">
          <img src={reportPhoto(report.photo, report.severity)} className="detail-photo" alt={`Road damage at ${report.location}`} />
          <div className="detail-block">
            <div>
              <div className="detail-label">Reported by</div>
              <p className="detail-text">{report.reporterName} · {fmtDate(report.createdAt, true)}</p>
            </div>
            <div>
              <div className="detail-label">Reporter-provided location</div>
              <p className="detail-text">{report.location}</p>
              <p className="detail-text muted">{categoryMeta[report.category].label}{report.landmark ? ` · ${report.landmark}` : ''}</p>
            </div>
            {report.description && (
              <div>
                <div className="detail-label">Description</div>
                <p className="detail-text">{report.description}</p>
              </div>
            )}
            <div>
              <div className="detail-label">Priority reason</div>
              <p className="detail-text muted">{report.priorityReason}</p>
            </div>
          </div>
        </div>

        <div className="detail-block" style={{ marginTop: 16 }}>
          <div className="detail-label">Weather context · system-generated</div>
          {report.weather?.available ? (
            <p className="detail-text">{report.weather.summary} {report.weather.precipitationMm !== undefined ? `${report.weather.precipitationMm.toFixed(1)} mm precipitation` : ''}{report.weather.rainProbability !== undefined ? ` · ${report.weather.rainProbability}% rain probability` : ''}.<br /><span className="muted">{report.weather.source} · assessed {fmtDate(report.weather.assessedAt, true)} · resolved as {report.weather.resolvedLocation || report.weather.locationQuery}</span></p>
          ) : (
            <p className="detail-text muted">{report.weather?.note || 'Weather was not available for this report. The image assessment remains usable.'}</p>
          )}
        </div>

        {(report.aiReason || report.aiConfidence !== null) && (
          <div className={`ai-card ${report.needsManualReview ? 'warn' : 'ok'}`}>
            <div className="ai-card-head">
              <Sparkles size={17} />
              AI assessment {report.needsManualReview ? '— manual review advised' : ''}
            </div>
            <p className="detail-text">{report.aiReason || 'No AI assessment was available for this report.'}</p>

          </div>
        )}

        <div>
          <div className="detail-label" style={{ marginBottom: 10 }}>Status history</div>
          <div className="timeline">
            {[...report.statusHistory].reverse().map((entry, i) => (
              <div className={`timeline-row ${entry.status === 'Resolved' ? 'done' : ''}`} key={`${entry.status}-${entry.at}-${i}`}>
                <span className="timeline-dot" />
                <div>
                  <div className="timeline-title">{entry.status}</div>
                  <div className="timeline-sub">{fmtDate(entry.at, true)} · by {entry.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {report.officerNotes && !isOfficer && (
          <div>
            <div className="detail-label">Officer notes</div>
            <p className="detail-text">{report.officerNotes}</p>
          </div>
        )}
        {report.assignedTeam && !isOfficer && (
          <div>
            <div className="detail-label">Assigned crew</div>
            <p className="detail-text">{report.assignedTeam}</p>
          </div>
        )}

        {isOfficer && (
          <div className="officer-panel">
            <div className="officer-panel-title">
              <HardHat size={16} /> Officer actions
            </div>
            <div className="officer-grid">
              <div>
                <label className="field-label" htmlFor="m-severity">Severity review</label>
                <select id="m-severity" className="field" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                  <option value="unknown">Needs inspection</option>
                  <option value="low">Low severity</option>
                  <option value="medium">Medium severity</option>
                  <option value="high">High severity</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="m-priority">Priority</label>
                <select id="m-priority" className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
              </div>
              <div className="wide">
                <label className="field-label" htmlFor="m-team">Assigned crew</label>
                <select id="m-team" className="field" value={team} onChange={(e) => setTeam(e.target.value)}>
                  <option value="">Not assigned</option>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="wide">
                <label className="field-label" htmlFor="m-priority-reason">Priority correction reason</label>
                <input id="m-priority-reason" className="field" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Explain any change to the AI recommendation" maxLength={500} />
              </div>
              <div className="wide">
                <label className="field-label" htmlFor="m-notes">Officer notes</label>
                <textarea
                  id="m-notes"
                  className="field"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add an inspection note or next step for the reporter..."
                />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={saveFields} disabled={update.isPending}>
                {update.isPending ? <Spinner small /> : null} Save changes
              </button>
              {report.status === 'Submitted' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={startWork} disabled={update.isPending}>
                  <Play size={14} /> Start work (In Progress)
                </button>
              )}
              {report.status === 'In Progress' && (
                <button type="button" className="btn btn-success btn-sm" onClick={resolve} disabled={update.isPending}>
                  <BadgeCheck size={14} /> Mark resolved
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
