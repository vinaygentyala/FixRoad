import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity, AlertCircle, ArrowRight, BadgeCheck, Camera, Check, CheckCircle2,
  ChevronRight, CircleHelp, ClipboardList, Clock3, Construction, FileCheck2,
  ImagePlus, Info, LocateFixed, MapPin, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, UserRoundCog, X,
} from 'lucide-react';
import { useAnalyzePothole, useHealthCheck } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import type { ReactNode, ChangeEvent, FormEvent } from 'react';

const queryClient = new QueryClient();
const STORAGE_KEY = 'fixmyroad-reports-v1';
const ROLE_KEY = 'fixmyroad-role-v1';
type Severity = 'low' | 'medium' | 'high' | 'unknown';
type Status = 'Submitted' | 'Under Review' | 'Assigned' | 'Resolved';
type HistoryEntry = { status: Status; at: string };
type Report = {
  id: string; ticketId: string; photo: string; location: string; description: string;
  is_pothole: boolean; severity: Severity; confidence: number | null; reason: string;
  needs_manual_review: boolean; status: Status; assignedTeam: string; officerNotes: string;
  createdAt: string; updatedAt: string; statusHistory: HistoryEntry[]; sample?: boolean;
};
type Role = 'resident' | 'officer';
const statuses: Status[] = ['Submitted', 'Under Review', 'Assigned', 'Resolved'];
const teams = ['Road Maintenance - North', 'Road Maintenance - Central', 'Road Maintenance - South', 'Emergency Response'];
const starterLocations = ['Pine Street & 4th Avenue', 'Outside 128 King Street', 'Maple Road near the library', 'Cedar Avenue, southbound lane', 'Market Street by the bus stop', 'Oak Lane near the school'];

function isoDaysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 20, 0, 0);
  return date.toISOString();
}
function makeSeed(): Report[] {
  const rows: Array<[string, string, Severity, Status, string, number]> = [
    ['FMR-24081', 'Pine Street at 4th Avenue', 'high', 'Under Review', 'Large crater in the eastbound lane, difficult to avoid during traffic.', 1],
    ['FMR-24076', 'King Street outside number 128', 'high', 'Assigned', 'Deep pothole beside the curb; standing water makes it hard to see.', 3],
    ['FMR-24069', 'Maple Road by Northside Library', 'medium', 'Submitted', 'Several small breaks forming in the right wheel track.', 2],
    ['FMR-24062', 'Cedar Avenue near the community garden', 'medium', 'Resolved', 'Uneven patch has opened up again near the crossing.', 8],
    ['FMR-24057', 'Market Street bus stop, westbound', 'low', 'Assigned', 'Shallow road surface chip near the bus stop.', 5],
    ['FMR-24051', 'Oak Lane by Willow Primary School', 'low', 'Under Review', 'Small depression near the school crossing.', 6],
    ['FMR-24043', 'Riverside Drive at Bridge Road', 'unknown', 'Submitted', 'Road damage reported after heavy rain; please inspect.', 1],
    ['FMR-24038', 'Hillcrest Avenue near the roundabout', 'unknown', 'Resolved', 'Surface damage on the approach to the roundabout.', 12],
  ];
  return rows.map(([ticketId, location, severity, status, description, days], i) => {
    const createdAt = isoDaysAgo(days);
    const history: HistoryEntry[] = [{ status: 'Submitted', at: createdAt }];
    if (status !== 'Submitted') history.push({ status: 'Under Review', at: isoDaysAgo(Math.max(0, days - 1), 13) });
    if (status === 'Assigned' || status === 'Resolved') history.push({ status: 'Assigned', at: isoDaysAgo(Math.max(0, days - 1), 15) });
    if (status === 'Resolved') history.push({ status: 'Resolved', at: isoDaysAgo(Math.max(0, days - 2), 16) });
    return {
      id: `sample-${i + 1}`, ticketId, photo: `/sample-road-${severity}.svg`, location, description,
      is_pothole: severity !== 'unknown', severity, confidence: severity === 'unknown' ? null : [0.94, 0.89, 0.82, 0.77, 0.91, 0.87][i] ?? null,
      reason: severity === 'unknown' ? 'Sample report awaiting a field inspection.' : `Sample assessment: visible road-surface damage; estimated ${severity} severity.`,
      needs_manual_review: severity === 'unknown' || severity === 'low',
      status, assignedTeam: status === 'Assigned' || status === 'Resolved' ? teams[(i + 1) % 3] : '',
      officerNotes: status === 'Resolved' ? 'Repair completed and checked by the road crew.' : status === 'Assigned' ? 'Added to the upcoming maintenance route.' : '',
      createdAt, updatedAt: history[history.length - 1].at, statusHistory: history, sample: true,
    };
  });
}
function readReports(): Report[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return makeSeed();
    const parsed = JSON.parse(value) as Report[];
    return Array.isArray(parsed) ? parsed : makeSeed();
  } catch { return makeSeed(); }
}
function useLocalReports() {
  const [reports, setReports] = useState<Report[]>(readReports);
  const reportsRef = useRef(reports);
  reportsRef.current = reports;
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reportsRef.current));
      }
    } catch { /* Keep the seeded session available if browser storage is disabled. */ }
    const sync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setReports(JSON.parse(stored) as Report[]);
      } catch { /* Ignore malformed local demo data and keep the current view usable. */ }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('fixmyroad-reports', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('fixmyroad-reports', sync);
    };
  }, []);
  const commit = (next: Report[]) => {
    setReports(next);
    reportsRef.current = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('fixmyroad-reports'));
    } catch { /* Quota limits do not prevent the current session from working. */ }
  };
  return { reports, commit };
}

function fmtDate(date: string, withTime = false) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}
function statusClass(status: Status) {
  return status === 'Submitted' ? 'status-submitted' : status === 'Under Review' ? 'status-review' : status === 'Assigned' ? 'status-assigned' : 'status-resolved';
}
function severityClass(severity: Severity) { return `severity-${severity}`; }
function makeTicketId() { return `FMR-${String(Date.now()).slice(-6)}`; }
function reportPhoto(report: Report) {
  return report.photo || `/sample-road-${report.severity}.svg`;
}
function DataNotice() {
  return <div className="data-notice" data-testid="notice-local-data"><Info size={17} /><span><strong>Local demo data.</strong> Reports and officer updates are saved in this browser only. They are not shared across devices and this demo has no production authentication.</span></div>;
}
function StatusPill({ status }: { status: Status }) { return <span className={`pill ${statusClass(status)}`}>{status}</span>; }
function SeverityPill({ severity }: { severity: Severity }) { return <span className={`pill ${severityClass(severity)}`}>{severity === 'unknown' ? 'Needs inspection' : `${severity[0].toUpperCase()}${severity.slice(1)} severity`}</span>; }

function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const nav = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/report', label: 'Report an issue', icon: Camera },
    { href: '/my-reports', label: 'My reports', icon: ClipboardList },
    { href: '/officer', label: 'Officer demo', icon: UserRoundCog },
    { href: '/how-it-works', label: 'How it works', icon: CircleHelp },
  ];
  return <div className="fm-shell">
    <header className="fm-header">
      <Link href="/" className="brand" aria-label="FixMyRoad overview"><span className="brand-mark"><Construction size={20} /></span><span>FixMyRoad</span></Link>
      <nav className="nav-links" aria-label="Main navigation">
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={15} className="mobile-nav-icon" /><span>{label}</span></Link>)}
      </nav>
      <div className="nav-actions"><Link href="/report" className="button button-primary button-small" data-testid="link-header-report"><Camera size={15} /> Report a pothole</Link></div>
    </header>
    <main>{children}</main>
    <footer className="footer"><div className="content footer-inner"><span>FixMyRoad · A clearer route from report to repair.</span><nav className="footer-links" aria-label="Footer navigation"><Link href="/how-it-works#about">About</Link><Link href="/how-it-works#contact">Contact</Link><Link href="/how-it-works#help">Help</Link><Link href="/how-it-works#privacy">Privacy</Link><Link href="/how-it-works#terms">Terms</Link></nav><span>Demo environment · Local browser data only</span></div></footer>
  </div>;
}

function ReportCard({ report, onOpen }: { report: Report; onOpen: (report: Report) => void }) {
  return <article className="report-card" data-testid={`card-report-${report.id}`}>
    <img className="report-photo" src={reportPhoto(report)} alt={`Road damage near ${report.location}`} loading="lazy" />
    <div className="card-top"><div><span className="ticket-id">{report.ticketId}{report.sample ? ' · SAMPLE' : ''}</span><h3>{report.location}</h3><div className="report-location"><MapPin size={13} /> Road damage report</div></div><StatusPill status={report.status} /></div>
    <p className="report-desc">{report.description}</p>
    <div className="pills"><SeverityPill severity={report.severity} /></div>
    <div className="card-bottom"><span className="card-metadata">Reported {fmtDate(report.createdAt)}</span><button className="card-open" type="button" onClick={() => onOpen(report)} data-testid={`button-open-${report.id}`}>View details <ChevronRight size={14} /></button></div>
  </article>;
}

function DetailsModal({ report, role, onClose, onUpdate, onResolve }: {
  report: Report; role: Role; onClose: () => void; onUpdate: (updates: Partial<Report>, historyStatus?: Status) => void; onResolve: () => void;
}) {
  const [severity, setSeverity] = useState<Severity>(report.severity);
  const [team, setTeam] = useState(report.assignedTeam);
  const [notes, setNotes] = useState(report.officerNotes);
  useEffect(() => { setSeverity(report.severity); setTeam(report.assignedTeam); setNotes(report.officerNotes); }, [report]);
  return <div className="detail-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="modal-header"><div><span className="ticket-id">{report.ticketId}{report.sample ? ' · SAMPLE REPORT' : ''}</span><h2 id="detail-title">{report.location}</h2><div className="pills"><StatusPill status={report.status} /><SeverityPill severity={report.severity} /></div></div><button className="icon-button" onClick={onClose} aria-label="Close details" data-testid="button-close-details"><X size={18} /></button></div>
      <div className="detail-grid">
        <div><img src={reportPhoto(report)} className="detail-photo" alt={`${report.severity} severity road damage illustration`} /></div>
        <div><div className="field-label">Resident description</div><p className="detail-copy">{report.description}</p><div className="field-label">Assessment note</div><p className="detail-copy">{report.reason || 'No AI assessment was available. Manual inspection is recommended.'}</p>{report.confidence !== null && <p className="detail-copy"><strong>Model confidence:</strong> {Math.round(report.confidence * 100)}% · Advisory only</p>}<p className="detail-copy"><strong>Created:</strong> {fmtDate(report.createdAt, true)}</p></div>
      </div>
      <div className="timeline"><h3>Status history</h3>{[...report.statusHistory].reverse().map((entry, i) => <div className="timeline-row" key={`${entry.status}-${entry.at}-${i}`}><span className="timeline-dot" /><div><strong>{entry.status}</strong><small>{fmtDate(entry.at, true)}</small></div></div>)}</div>
      {role === 'officer' && <div className="officer-fields">
        <div><label className="field-label" htmlFor="detail-severity">Severity review</label><select id="detail-severity" className="field" value={severity} onChange={e => setSeverity(e.target.value as Severity)} data-testid="select-detail-severity">{(['unknown','low','medium','high'] as Severity[]).map(s => <option key={s} value={s}>{s === 'unknown' ? 'Needs inspection' : `${s[0].toUpperCase()}${s.slice(1)} severity`}</option>)}</select></div>
        <div><label className="field-label" htmlFor="detail-team">Assigned team</label><select id="detail-team" className="field" value={team} onChange={e => setTeam(e.target.value)} data-testid="select-detail-team"><option value="">Not assigned</option>{teams.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="wide"><label className="field-label" htmlFor="detail-notes">Officer notes</label><textarea id="detail-notes" className="field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add an inspection note or next step..." data-testid="input-officer-notes" /></div>
        <div className="wide modal-actions">
          <button className="button button-outline button-small" onClick={() => onUpdate({ severity, assignedTeam: team, officerNotes: notes })} data-testid="button-save-officer-changes"><Check size={14} /> Save changes</button>
          {report.status === 'Submitted' && <button className="button button-outline button-small" onClick={() => onUpdate({ severity, assignedTeam: team, officerNotes: notes, status: 'Under Review' }, 'Under Review')} data-testid="button-mark-review">Mark under review</button>}
          {report.status !== 'Resolved' && <button className="button button-secondary button-small" onClick={() => { if (report.status === 'Submitted') { window.alert('Move this report under review before assigning a team.'); return; } if (!team) { window.alert('Assign a maintenance team before marking this report assigned.'); return; } onUpdate({ severity, assignedTeam: team, officerNotes: notes, status: 'Assigned' }, report.status === 'Assigned' ? undefined : 'Assigned'); }} data-testid="button-assign-report">Assign to team</button>}
          {report.status === 'Assigned' && <button className="button button-primary button-small" onClick={onResolve} data-testid="button-resolve-report"><BadgeCheck size={14} /> Confirm repair complete</button>}
        </div>
      </div>}
      {role === 'resident' && <div className="data-notice" style={{marginTop:15}}><Info size={16}/><span>AI assessments are advisory only. A report is not resolved until a municipal officer explicitly confirms the repair.</span></div>}
    </section>
  </div>;
}

function Overview({ reports }: { reports: Report[] }) {
  const [selected, setSelected] = useState<Report | null>(null);
  const totals = useMemo(() => ({
    all: reports.length, active: reports.filter(r => r.status !== 'Resolved').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    high: reports.filter(r => r.severity === 'high' && r.status !== 'Resolved').length,
  }), [reports]);
  const recent = [...reports].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  return <AppShell>
    <div className="content">
      <section className="hero">
        <div><span className="eyebrow"><span className="eyebrow-dot" />Your street. Your say. Better roads.</span><h1>Better Roads<br/><span>Begin With You.</span></h1><p className="hero-copy">Spot a pothole? Report it in seconds. Our AI helps assess road damage, while citizens and municipal teams work together to make streets safer.</p><div className="hero-cta"><Link href="/report" className="button button-primary" data-testid="link-hero-report"><Camera size={17}/> Report a Pothole <ArrowRight size={16}/></Link><Link href="/my-reports" className="button button-outline" data-testid="link-hero-track">Track a Report</Link></div><div className="hero-note"><ShieldCheck size={15}/> Quick to report. Easy to track. Built for your community.</div></div>
        <div className="hero-art" aria-label="Illustration of a neighborhood road with a marked repair location"><div className="road-scene"><div className="scene-building"/><div className="scene-building two"/><div className="scene-tree"/><div className="road"/><div className="pothole"/><div className="map-pin"><MapPin size={22}/></div></div><div className="hero-float float-top"><strong>{totals.active}</strong><small>issues being worked on</small></div><div className="hero-float float-bottom"><span className="stat-icon"><CheckCircle2 size={20}/></span><div><strong>{totals.resolved}</strong><small>repairs confirmed</small></div></div></div>
      </section>
      <section className="section" style={{paddingTop:10}}>
        <div className="section-heading"><div><span className="eyebrow">A clearer picture of our streets</span><h2>Community road watch</h2></div><p>Every report counts. These live totals are calculated from the reports stored in this browser demo.</p></div>
        <div className="stats-grid">
          {[{n:totals.all,l:'Reports in demo',I:ClipboardList},{n:totals.active,l:'Open issues',I:Clock3},{n:totals.high,l:'High priority open',I:AlertCircle},{n:totals.resolved,l:'Officer-confirmed repairs',I:CheckCircle2}].map(({n,l,I})=><div className="stat-card" key={l}><span className="stat-icon"><I size={20}/></span><div><div className="stat-value" data-testid={`stat-${l.toLowerCase().replaceAll(' ','-')}`}>{n}</div><div className="stat-label">{l}</div></div></div>)}
        </div>
      </section>
      <section className="section" style={{paddingTop:24}}>
        <div className="section-heading"><div><span className="eyebrow">The process, in plain English</span><h2>From photo to follow-through</h2></div><Link href="/how-it-works" className="button button-outline button-small">See how it works <ArrowRight size={14}/></Link></div>
        <div className="process-row">{[{n:'01',h:'Capture',p:'Upload a clear photo and add a nearby address or landmark.'},{n:'02',h:'Analyze',p:'AI can offer an advisory estimate; an officer reviews the report.'},{n:'03',h:'Assign',p:'A municipal officer routes confirmed work to a maintenance team.'},{n:'04',h:'Resolve',p:'The repair is marked complete only after an officer confirms it.'}].map(x=><article className="process" key={x.n}><span className="process-number">{x.n} / STEP</span><h3>{x.h}</h3><p>{x.p}</p></article>)}</div>
      </section>
      <section className="section" style={{paddingTop:15}}>
        <div className="section-heading"><div><span className="eyebrow">Recently reported</span><h2>Road issues around the community</h2></div><Link href="/my-reports" className="button button-outline button-small">Browse all reports <ArrowRight size={14}/></Link></div>
        <div className="reports-grid">{recent.map(r=><ReportCard key={r.id} report={r} onOpen={setSelected}/>)}</div>
      </section>
      <section className="section" style={{paddingTop:8}}>
        <div className="section-heading"><div><span className="eyebrow">Recently resolved</span><h2>Repairs confirmed by officers</h2></div></div>
        <div className="reports-grid">{[...reports].filter(r=>r.status==='Resolved').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,2).map(r=><ReportCard key={r.id} report={r} onOpen={setSelected}/>)}</div>
      </section>
      <section className="section"><div className="community-card"><div><h2>Know a spot that needs attention?</h2><p>A useful report takes less than a minute. Add what you know, and help your local road team see the problem clearly.</p></div><Link href="/report" className="button" style={{background:'#facc15',color:'#172554',position:'relative',zIndex:1}}><Camera size={16}/> Start a report <ArrowRight size={15}/></Link></div></section>
      <div style={{paddingBottom:40}}><DataNotice/></div>
    </div>
    {selected && <DetailsModal report={selected} role="resident" onClose={()=>setSelected(null)} onUpdate={()=>{}} onResolve={()=>{}}/>}
  </AppShell>;
}

function ReportPage({ reports, commit, notify }: { reports: Report[]; commit: (r: Report[]) => void; notify: (m:string, e?:boolean)=>void }) {
  const [photo, setPhoto] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<null | {is_pothole:boolean;severity:Severity;confidence:number|null;reason:string;needs_manual_review:boolean}>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [created, setCreated] = useState<Report | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [locationError, setLocationError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const analyze = useAnalyzePothole();
  const health = useHealthCheck();
  const upload = async (file?: File) => {
    if (!file) return;
    setPhotoError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Choose a JPG, PNG, or WEBP image.'); return; }
    if (file.size > 15 * 1024 * 1024) { setPhotoError('This image is larger than 15 MB. Choose a smaller photo.'); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Could not decode image'));
          img.onload = () => {
            const max = 1200; const ratio = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio); canvas.height = Math.round(img.height * ratio);
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Image processing is unavailable')); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
      setPhoto(dataUrl); setAnalysis(null); setAnalysisFailed(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch { setPhotoError('We could not process that photo. Try another image.'); }
  };
  const startAnalysis = () => {
    if (!photo) { setPhotoError('Add a road photo before asking for an assessment.'); return; }
    setAnalysis(null); setAnalysisFailed(false);
    analyze.mutate({ data: { imageData: photo } }, {
      onSuccess: result => { setAnalysis(result); setAnalysisFailed(false); },
      onError: () => { setAnalysisFailed(true); notify('Photo assessment is unavailable. You can still submit for manual review.', true); },
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submittedRef.current) return;
    if (!photo) { setPhotoError('Add a photo to create a useful road report.'); return; }
    if (location.trim().length < 4) { setLocationError('Add a nearby street, address, or landmark.'); return; }
    submittedRef.current = true;
    const now = new Date().toISOString(); const ticketId = makeTicketId();
    const report: Report = {
      id: `report-${Date.now()}`, ticketId, photo, location: location.trim(), description: description.trim(),
      is_pothole: analysis?.is_pothole ?? false, severity: analysis?.severity ?? 'unknown',
      confidence: analysis?.confidence ?? null, reason: analysis?.reason ?? (analysisFailed ? 'Automated assessment was unavailable; report submitted for manual review.' : 'No automated assessment requested; report submitted for manual review.'),
      needs_manual_review: analysis ? analysis.needs_manual_review : true, status: 'Submitted',
      assignedTeam: '', officerNotes: '', createdAt: now, updatedAt: now, statusHistory: [{status:'Submitted',at:now}],
    };
    commit([report,...reports]); setCreated(report); setAnalysis(null);
    notify(`Report submitted. Your ticket is ${ticketId}.`);
  };
  if (created) return <AppShell><div className="content"><div className="page-title"><span className="eyebrow"><span className="eyebrow-dot"/>Report received</span><h1>Your report is on its way.</h1><p>Keep this ticket ID to follow updates from the municipal road team.</p></div><div className="panel" style={{maxWidth:720,marginBottom:28}}><div className="ticket-icon"><CheckCircle2 size={22}/></div><span className="ticket-id">YOUR TICKET</span><h2 style={{font:'800 30px Manrope',margin:'8px 0',color:'#172554'}}>{created.ticketId}</h2><div className="pills"><StatusPill status={created.status}/><SeverityPill severity={created.severity}/></div><p className="detail-copy" style={{marginTop:16}}>Submitted for <strong>{created.location}</strong>.{created.needs_manual_review?' It has been marked for human review.':''} An AI assessment never indicates a completed repair.</p><div className="modal-actions" style={{justifyContent:'flex-start'}}><Link href="/my-reports" className="button button-primary" data-testid="link-track-new-ticket">Track this report <ArrowRight size={15}/></Link><button className="button button-outline" onClick={()=>{submittedRef.current=false;setCreated(null);setPhoto('');setLocation('');setDescription('');setAnalysis(null);}}>Report another issue</button></div></div><DataNotice/></div></AppShell>;
  return <AppShell><div className="content"><div className="page-title"><span className="eyebrow"><span className="eyebrow-dot"/>Report a road issue</span><h1>Help us see what needs fixing.</h1><p>A photo and a nearby location help your road team understand the issue. No account required for this browser demo.</p></div>
    <div className="report-layout"><form className="form-stack" onSubmit={submit}>
      <div className="panel form-section"><h2>1. Add a road photo</h2><p className="sub">One clear image is best. Your photo is resized on your device before assessment.</p>
        {photo ? <div className="photo-preview"><img src={photo} alt="Preview of road issue photograph"/><div className="photo-actions"><button className="button button-outline button-small" type="button" onClick={()=>fileRef.current?.click()}><RefreshCw size={13}/> Replace</button><button className="button button-danger button-small" type="button" onClick={()=>{setPhoto('');setAnalysis(null);setAnalysisFailed(false);}}><X size={13}/> Remove</button></div></div> :
          <label className="dropzone" htmlFor="road-photo"><span className="drop-icon"><ImagePlus size={21}/></span><strong>Choose a photo or take one now</strong><p>JPG, PNG or WEBP · up to 15 MB before compression</p><input ref={fileRef} id="road-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" capture="environment" onChange={(e:ChangeEvent<HTMLInputElement>)=>void upload(e.target.files?.[0])} data-testid="input-road-photo"/></label>}
        {photo && <input ref={fileRef} id="road-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e:ChangeEvent<HTMLInputElement>)=>void upload(e.target.files?.[0])} style={{display:'none'}}/>}
        {photoError && <p style={{color:'#b42318',fontSize:12,margin:'8px 0 0'}} role="alert">{photoError}</p>}
        <div className="analysis-box" style={{marginTop:14}}><div className="analysis-head"><strong style={{display:'flex',alignItems:'center',gap:7}}><Sparkles size={16} color="#2563eb"/> Optional photo assessment</strong><button type="button" className="button button-outline button-small" onClick={startAnalysis} disabled={!photo || analyze.isPending} data-testid="button-analyze-photo">{analyze.isPending ? <><RefreshCw size={13} className="animate-spin"/> Assessing…</> : <><Sparkles size={13}/> Assess photo</>}</button></div><p>An automated model may suggest whether road damage is visible and its severity. It can be wrong; municipal officers make the review decision.</p>
          {analysis && <div className={`analysis-result ${analysis.needs_manual_review || !analysis.is_pothole ? 'analysis-warning':''}`} role="status" data-testid="status-ai-result"><span className="result-icon">{analysis.needs_manual_review || !analysis.is_pothole ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>}</span><div><strong>{analysis.is_pothole ? `${analysis.severity[0].toUpperCase()}${analysis.severity.slice(1)} severity estimate` : 'No clear pothole detected'}</strong><p>{analysis.reason} {analysis.confidence !== null ? `Model confidence ${Math.round(analysis.confidence*100)}%. ` : ''}Advisory only — not a repair confirmation.</p></div></div>}
          {analysisFailed && <div className="analysis-result analysis-warning" role="alert"><span className="result-icon"><AlertCircle size={17}/></span><div><strong>Assessment unavailable</strong><p>The photo model could not be reached. You can retry or submit this report for manual review; no result has been assumed.</p></div></div>}
        </div>
      </div>
      <div className="panel form-section"><h2>2. Where is the damage?</h2><p className="sub">Use a street address, intersection, or nearby landmark people can recognize.</p><label className="field-label" htmlFor="report-location">Street or landmark</label><div className="field-row"><input id="report-location" className="field" list="road-locations" value={location} onChange={e=>{setLocation(e.target.value);setLocationError('');}} placeholder="For example, Pine Street at 4th Avenue" autoComplete="street-address" data-testid="input-report-location"/><datalist id="road-locations">{starterLocations.map(s=><option key={s} value={s}/>)}</datalist><button type="button" className="button button-outline" onClick={()=>{if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),()=>notify('Location permission is unavailable. Enter a nearby address instead.',true));else notify('Location services are not supported by this browser.',true);}}><LocateFixed size={15}/> Use my location</button></div>{locationError && <p role="alert" style={{color:'#b42318',fontSize:12}}>{locationError}</p>}<div className="suggestions">{starterLocations.slice(0,4).map(s=><button className="suggestion" key={s} type="button" onClick={()=>setLocation(s)}>{s}</button>)}</div></div>
      <div className="panel form-section"><h2>3. Add a few details</h2><p className="sub">Optional — share anything that could help the road team find or understand the damage.</p><label className="field-label" htmlFor="report-description">Description (optional)</label><textarea id="report-description" className="field" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe its size, exact position, or anything that makes it hard to see. Please avoid personal information." maxLength={600} data-testid="input-report-description"/><div style={{display:'flex',justifyContent:'flex-end',marginTop:7,fontSize:11,color:'#8693a5'}}><span>{description.length}/600</span></div></div>
      <div className="panel form-footer"><span className="fineprint">By submitting, this report is saved locally in this browser demo. AI results are advisory and may be inaccurate.</span><button type="submit" className="button button-primary" data-testid="button-submit-report"><Upload size={15}/> Submit road report <ArrowRight size={15}/></button></div>
      <DataNotice/>
    </form><aside className="ticket-card"><div className="ticket-icon"><ClipboardList size={19}/></div><h3>Your report, with a follow-up</h3><p>After you submit, we’ll create a ticket you can look up on the My reports page. No sign-in is needed.</p><div className="ai-status"><span className={`health-dot ${health.data?.status?.toLowerCase()==='ok'?'':'offline'}`}/>{health.isLoading ? 'Checking photo-assessment service…' : health.isError ? 'Photo assessment service status unavailable' : `Photo assessment service: ${health.data?.status ?? 'reachable'}`}</div><div style={{borderTop:'1px solid #dfe8f2',marginTop:15,paddingTop:13,fontSize:11,lineHeight:1.6,color:'#8190a3'}}><ShieldCheck size={14} style={{verticalAlign:'middle',marginRight:5,color:'#148879'}}/>No authentication in this demo. Do not submit private or sensitive images.</div></aside></div>
  </div></AppShell>;
}

function MyReports({ reports }: { reports: Report[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [severity, setSeverity] = useState('All priorities');
  const [selected, setSelected] = useState<Report|null>(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const filtered = useMemo(()=>reports.filter(r=>{
    const text=`${r.ticketId} ${r.location} ${r.description}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (status==='All statuses'||r.status===status) && (severity==='All priorities'||r.severity===severity);
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[reports,search,status,severity]);
  const lookup = () => {const match=reports.find(r=>r.ticketId.toLowerCase()===ticketSearch.trim().toLowerCase()); if(match)setSelected(match); else if(ticketSearch.trim()) window.alert('No ticket with that ID is stored in this browser demo.');};
  return <AppShell><div className="content"><div className="page-title"><span className="eyebrow"><span className="eyebrow-dot"/>Community report board</span><h1>Follow the road to resolution.</h1><p>Search tickets, check current status, and see each update in the report timeline.</p></div><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 290px',gap:17,marginBottom:18}}><DataNotice/><div className="panel" style={{padding:14}}><label className="field-label" htmlFor="ticket-lookup">Look up a ticket ID</label><div className="field-row"><input id="ticket-lookup" className="field" value={ticketSearch} onChange={e=>setTicketSearch(e.target.value)} placeholder="FR-24081" data-testid="input-ticket-lookup"/><button type="button" className="button button-primary button-small" onClick={lookup} data-testid="button-lookup-ticket"><Search size={14}/> Find</button></div></div></div>
    <div className="toolbar"><div className="searchbox"><Search size={16}/><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticket, street, or description…" aria-label="Search reports" data-testid="input-search-reports"/></div><select className="select-field" value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter by status" data-testid="select-filter-status"><option>All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><select className="select-field" value={severity} onChange={e=>setSeverity(e.target.value)} aria-label="Filter by severity" data-testid="select-filter-severity"><option>All priorities</option>{(['high','medium','low','unknown'] as Severity[]).map(s=><option key={s} value={s}>{s==='unknown'?'Needs inspection':`${s[0].toUpperCase()}${s.slice(1)} severity`}</option>)}</select><span style={{alignSelf:'center',fontSize:12,color:'#8592a4'}}>{filtered.length} reports</span></div>
    {filtered.length ? <div className="reports-grid">{filtered.map(r=><ReportCard key={r.id} report={r} onOpen={setSelected}/>)}</div> : <div className="empty-state"><div className="ticket-icon"><Search size={19}/></div><h3>No matching reports</h3><p>Try a different search or clear one of the filters.</p><button className="button button-outline button-small" onClick={()=>{setSearch('');setStatus('All statuses');setSeverity('All priorities');}}>Clear filters</button></div>}
    <div style={{padding:'26px 0 50px'}}><Link href="/report" className="button button-primary"><Camera size={15}/> Create a new report <ArrowRight size={14}/></Link></div></div>
    {selected && <DetailsModal report={selected} role="resident" onClose={()=>setSelected(null)} onUpdate={()=>{}} onResolve={()=>{}}/>}
  </AppShell>;
}

function OfficerPage({ reports, commit, notify }: { reports: Report[]; commit: (r:Report[])=>void; notify:(m:string,e?:boolean)=>void }) {
  const [role, setRole] = useState<Role>(()=>localStorage.getItem(ROLE_KEY)==='officer'?'officer':'resident');
  const [filter, setFilter] = useState('All reports');
  const [selected, setSelected] = useState<Report|null>(null);
  const [search, setSearch] = useState('');
  const switchRole = (next:Role) => {setRole(next);localStorage.setItem(ROLE_KEY,next);};
  const updateReport = (report:Report, updates:Partial<Report>, historyStatus?:Status) => {
    const now = new Date().toISOString();
    const changedStatus = historyStatus && historyStatus !== report.status;
    const updated:Report = {...report,...updates,updatedAt:now,statusHistory:changedStatus?[...report.statusHistory,{status:historyStatus,at:now}]:report.statusHistory};
    commit(reports.map(r=>r.id===report.id?updated:r)); setSelected(updated);
    notify(changedStatus?`Ticket ${report.ticketId} moved to ${historyStatus}.`:`Ticket ${report.ticketId} updated.`);
  };
  const resolve = (report:Report) => {
    if (!window.confirm(`Confirm that the repair for ${report.ticketId} has been completed and checked? This explicit action will mark the report resolved.`)) return;
    updateReport(report,{status:'Resolved',officerNotes:report.officerNotes || 'Repair completion confirmed by municipal officer.'},'Resolved');
  };
  const list = reports.filter(r=>(filter==='All reports'||r.status===filter) && (!search||`${r.ticketId} ${r.location} ${r.description}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return <AppShell><div className="content"><div className="page-title"><span className="eyebrow"><span className="eyebrow-dot"/>Role-based demo workspace</span><h1>Municipal review desk.</h1><p>Review resident reports, correct model estimates, route work to a team, and confirm completed repairs.</p></div>
    <div className="panel" style={{marginBottom:18}}><div className="officer-top"><div><strong style={{font:'700 15px Manrope'}}>Choose a demo view</strong><div style={{color:'#8190a3',fontSize:12,marginTop:4}}>Role switch only changes this browser demo experience. There are no accounts or permissions.</div></div><div className="role-switch" role="group" aria-label="Demo role"><button type="button" className={role==='resident'?'selected':''} onClick={()=>switchRole('resident')} data-testid="button-role-resident">Resident view</button><button type="button" className={role==='officer'?'selected':''} onClick={()=>switchRole('officer')} data-testid="button-role-officer">Municipal officer</button></div></div></div>
    <DataNotice/>
    {role==='resident' ? <div className="panel" style={{marginTop:18,display:'flex',gap:15,alignItems:'center'}}><span className="ticket-icon"><UserRoundCog size={20}/></span><div><h2 style={{font:'700 17px Manrope',margin:'0 0 5px'}}>You’re viewing the resident perspective.</h2><p style={{fontSize:13,color:'#718096',margin:'0 0 12px'}}>Switch to Municipal officer to open report details and manage assignments, severity, notes, and status.</p><button className="button button-primary button-small" onClick={()=>switchRole('officer')} data-testid="button-enter-officer">Switch to officer view <ArrowRight size={14}/></button></div></div> :
    <><div className="stats-grid" style={{margin:'18px 0'}}>{[{n:reports.filter(r=>r.status==='Submitted').length,l:'Awaiting review',I:ClipboardList},{n:reports.filter(r=>r.status==='Under Review').length,l:'Under review',I:Search},{n:reports.filter(r=>r.status==='Assigned').length,l:'Assigned to crews',I:Construction},{n:reports.filter(r=>r.status==='Resolved').length,l:'Resolved by officer',I:FileCheck2}].map(({n,l,I})=><div className="stat-card" key={l}><span className="stat-icon"><I size={19}/></span><div><div className="stat-value">{n}</div><div className="stat-label">{l}</div></div></div>)}</div>
    <div className="panel" style={{padding:'14px 17px',marginBottom:13}}><div className="toolbar" style={{margin:0}}><div className="searchbox"><Search size={15}/><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets or streets…" aria-label="Search officer reports" data-testid="input-officer-search"/></div><select className="select-field" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter officer reports" data-testid="select-officer-status"><option>All reports</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><span style={{fontSize:12,color:'#8492a4',alignSelf:'center'}}>{list.length} to review</span></div></div>
    {list.length ? <div className="panel officer-table-wrap" style={{padding:'4px 16px',marginBottom:30}}><table className="officer-table"><thead><tr><th>Ticket / location</th><th>Reported</th><th>Severity</th><th>Status</th><th>Assigned team</th><th>Action</th></tr></thead><tbody>{list.map(r=><tr key={r.id} data-testid={`row-officer-${r.id}`}><td><span className="ticket-id">{r.ticketId}{r.sample?' · SAMPLE':''}</span><strong>{r.location}</strong></td><td>{fmtDate(r.createdAt)}</td><td><SeverityPill severity={r.severity}/></td><td><StatusPill status={r.status}/></td><td>{r.assignedTeam||<span style={{color:'#9aa6b5'}}>Unassigned</span>}</td><td><button className="button button-outline button-small" onClick={()=>setSelected(r)} data-testid={`button-manage-${r.id}`}>Manage <ChevronRight size={13}/></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="ticket-icon"><ClipboardList size={18}/></div><h3>Nothing in this view</h3><p>Try another status filter or search term.</p></div>}</>}
    <div style={{padding:'22px 0 45px'}}><DataNotice/></div></div>
    {selected && <DetailsModal report={selected} role="officer" onClose={()=>setSelected(null)} onUpdate={(updates,historyStatus)=>updateReport(selected,updates,historyStatus)} onResolve={()=>resolve(selected)}/>}
  </AppShell>;
}

function HowItWorks() {
  return <AppShell><div className="content"><div className="page-title"><span className="eyebrow"><span className="eyebrow-dot"/>Help & transparency</span><h1>Simple for neighbors.<br/>Useful for road teams.</h1><p>FixMyRoad makes it easier to get a road issue in front of the people who can assess it and decide what happens next.</p></div>
    <div id="about" className="steps-grid">{[{n:'01',icon:Camera,h:'Share what you see',p:'Take or upload a clear photo. Choose a street address, intersection, or recognizable landmark and add a brief description.'},{n:'02',icon:Sparkles,h:'Get an optional assessment',p:'A server-side vision model may offer an advisory damage and severity estimate. It is not a decision, inspection, or promise of repair.'},{n:'03',icon:ClipboardList,h:'A human reviews the ticket',p:'Municipal officers can review details, adjust severity, add notes, and assign work to a road maintenance team.'},{n:'04',icon:CheckCircle2,h:'Track status and outcome',p:'Check ticket history as it moves through review and assignment. An officer must explicitly confirm a completed repair before it is marked resolved.'},{n:'05',icon:MapPin,h:'Keep location useful',p:'A clear nearby address or landmark helps a crew find the right place. Location permission is optional; manual entry always works.'},{n:'06',icon:ShieldCheck,h:'Know what this demo stores',p:'Reports and officer updates are saved to localStorage in this browser. They are not shared across devices, and the demo does not provide production authentication.'}].map(({n,icon:Icon,h,p})=><article className="step-card" key={n}><span className="step-index">STEP {n}</span><span className="step-icon"><Icon size={20}/></span><h3>{h}</h3><p>{p}</p></article>)}</div>
    <section id="help" className="section"><div className="section-heading"><div><span className="eyebrow">A few quick answers</span><h2>What to expect</h2></div></div><div className="faq-list">
      <details className="faq-item"><summary>Does an AI assessment mean my road will be repaired?</summary><p>No. AI output is advisory and can be inaccurate. A municipal officer reviews reports and decides what action is appropriate. Only an explicit officer action can mark a ticket resolved.</p></details>
      <details className="faq-item"><summary>Can I report something without a working AI assessment?</summary><p>Yes. If the assessment service is unavailable, submit the report for manual review. The app will clearly tell you when no assessment was returned rather than inventing a result.</p></details>
      <details className="faq-item"><summary>Where is report data stored?</summary><p>This demo keeps sample reports and reports you create in this browser’s local storage. Clearing browser storage removes this data. It is not shared across devices and should not be treated as a production civic reporting service.</p></details>
      <details className="faq-item"><summary>What should I include in a good report?</summary><p>Share a photo from a safe place, name a nearby address or landmark, and describe the damage and the lane or direction if known. Avoid putting personal details in the description.</p></details>
      <details id="privacy" className="faq-item"><summary>Privacy in this demo</summary><p>Report details and uploaded photos are kept in this browser’s local storage. AI analysis sends the selected photo to the configured OpenAI service through the server. Do not upload sensitive or identifying images.</p></details>
      <details id="terms" className="faq-item"><summary>Terms for this demo</summary><p>This prototype is for demonstration only. AI assessments may be inaccurate and are not safety determinations, municipal decisions, or guarantees of repair.</p></details>
    </div></section>
    <section id="contact" className="section" style={{paddingTop:0}}><div className="panel"><h2>Contact</h2><p className="detail-copy">This demo is not connected to a municipal office. To report an urgent road hazard, contact your local public works department directly.</p></div></section>
    <section className="section" style={{paddingTop:0}}><div className="community-card"><div><h2>Ready to flag a road issue?</h2><p>Your local knowledge helps road teams know where to look.</p></div><Link href="/report" className="button" style={{background:'#facc15',color:'#172554',position:'relative',zIndex:1}}>Start a report <ArrowRight size={15}/></Link></div></section>
    <div style={{paddingBottom:40}}><DataNotice/></div></div></AppShell>;
}

function NotFoundView() { return <AppShell><div className="content"><div className="empty-state" style={{margin:'80px auto',maxWidth:500}}><div className="ticket-icon"><CircleHelp size={20}/></div><h3>We can’t find that page</h3><p>The link may have moved. Head back to the overview to find your way.</p><Link href="/" className="button button-primary">Back to overview</Link></div></div></AppShell>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function AppRouter() {
  const {reports,commit}=useLocalReports();
  const [toast,setToast]=useState<{id:number;message:string;error:boolean}|null>(null);
  const notify=(message:string,error=false)=>{const id=Date.now();setToast({id,message,error});window.setTimeout(()=>setToast(v=>v?.id===id?null:v),4200);};
  return <RoutedErrorBoundary><Switch>
    <Route path="/"><Overview reports={reports}/></Route>
    <Route path="/report"><ReportPage reports={reports} commit={commit} notify={notify}/></Route>
    <Route path="/my-reports"><MyReports reports={reports}/></Route>
    <Route path="/officer"><OfficerPage reports={reports} commit={commit} notify={notify}/></Route>
    <Route path="/how-it-works"><HowItWorks/></Route>
    <Route><NotFoundView/></Route>
  </Switch>{toast && <div className="toast-stack"><div className={`toast ${toast.error?'error':''}`} role={toast.error?'alert':'status'}><CheckCircle2 size={17}/>{toast.message}</div></div>}</RoutedErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
