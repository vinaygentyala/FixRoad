import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight, BadgeCheck, Check, ChevronLeft, Info, LocateFixed, MapPin,
  Send, Sparkles, TriangleAlert,
} from 'lucide-react';
import { PhotoCapture } from '@/components/camera';
import { Spinner } from '@/components/bits';
import { api, ApiError } from '@/lib/api';
import { categoryMeta } from '@/lib/meta';
import type { AnalysisResult, Category, Report } from '@/lib/types';

type Step = 'photo' | 'details' | 'done';

function Stepper({ step }: { step: Step }) {
  const steps = [
    { id: 'photo', label: 'Capture photo' },
    { id: 'details', label: 'Location & details' },
    { id: 'done', label: 'Submitted' },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);
  return (
    <div className="stepper" aria-label="Report progress">
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'contents' }}>
          {i > 0 && <span className="step-line" />}
          <div className={`step ${i === activeIndex ? 'active' : ''} ${i < activeIndex ? 'done' : ''}`}>
            <span className="step-dot">{i < activeIndex ? <Check size={15} /> : i + 1}</span>
            <span>{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportIssue() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [category, setCategory] = useState<Category>('normal');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState<Report | null>(null);
  const [locating, setLocating] = useState(false);

  const analyze = useMutation({
    mutationFn: (imageData: string) =>
      api<AnalysisResult>('/api/analysis/potholes', { method: 'POST', body: { imageData } }),
    onSuccess: (result) => {
      setAnalysis(result);
      setAnalysisError('');
    },
    onError: (err) => {
      setAnalysis(null);
      setAnalysisError(
        err instanceof ApiError
          ? err.message
          : 'AI analysis is unavailable right now. You can still submit for officer review.',
      );
    },
  });

  useEffect(() => {
    if (photo && !analysis && !analyze.isPending && !analysisError) {
      analyze.mutate(photo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  const submit = useMutation({
    mutationFn: () =>
      api<{ report: Report }>('/api/reports', {
        method: 'POST',
        body: {
          photo,
          location,
          landmark,
          category,
          description,
          analysis: analysis
            ? {
                isPothole: analysis.is_pothole,
                severity: analysis.severity,
                confidence: analysis.confidence,
                reason: analysis.reason,
                needsManualReview: analysis.needs_manual_review,
              }
            : { isPothole: true, severity: 'unknown', confidence: null, reason: '', needsManualReview: true },
        },
      }),
    onSuccess: (data) => {
      setSubmitted(data.report);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not submit your report. Please try again.');
    },
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation((current) => current || `Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  const detailsValid = location.trim().length >= 3;

  return (
    <div className="stack-lg" style={{ maxWidth: 760, margin: '0 auto' }}>
      <Stepper step={step} />

      {step === 'photo' && (
        <div className="card card-pad stack">
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>Capture the pothole</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              Take a clear photo of the damage. Our AI will assess it before you submit.
            </p>
          </div>

          <PhotoCapture
            photo={photo}
            onCapture={(dataUrl) => {
              setPhoto(dataUrl);
              setAnalysis(null);
              setAnalysisError('');
            }}
            onClear={() => {
              setPhoto(null);
              setAnalysis(null);
              setAnalysisError('');
            }}
          />

          {analyze.isPending && (
            <div className="form-note">
              <Spinner small />
              <span>AI is assessing the photo — this takes a few seconds...</span>
            </div>
          )}

          {analysis && (
            <div className={`ai-card ${analysis.needs_manual_review || !analysis.is_pothole ? 'warn' : 'ok'}`}>
              <div className="ai-card-head">
                <Sparkles size={17} />
                {analysis.is_pothole
                  ? `Pothole detected — ${analysis.severity === 'unknown' ? 'Needs Review' : `${analysis.severity[0].toUpperCase()}${analysis.severity.slice(1)} priority candidate`}`
                  : 'No clear pothole detected'}
              </div>
              <p className="detail-text">{analysis.reason}</p>
              <p className="detail-text muted" style={{ marginTop: 8, fontSize: 12.5 }}>AI assessment is advisory; an officer reviews every report.</p>
            </div>
          )}

          {analysisError && (
            <div className="form-note amber">
              <TriangleAlert size={16} />
              <span>{analysisError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!photo || analyze.isPending}
              onClick={() => setStep('details')}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="card card-pad stack">
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>Where is the pothole?</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              Your exact location is preserved and used only to look up separate weather context. AI image evidence remains primary.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="r-location">Street location *</label>
            <div style={{ display: 'flex', gap: 9 }}>
              <input
                id="r-location"
                className="field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pine Street & 4th Avenue"
                maxLength={200}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={useMyLocation}
                disabled={locating}
                title="Use my current location"
              >
                {locating ? <Spinner small /> : <LocateFixed size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="r-landmark">Nearby landmark (optional)</label>
            <input
              id="r-landmark"
              className="field"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite the metro station gate"
              maxLength={200}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="r-category">What kind of road is it? *</label>
            <select
              id="r-category"
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {(Object.keys(categoryMeta) as Category[]).map((key) => (
                <option key={key} value={key}>{categoryMeta[key].label}</option>
              ))}
            </select>
            <p className="field-hint">
              {categoryMeta[category].hint}
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="r-description">Description (optional)</label>
            <textarea
              id="r-description"
              className="field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the crew should know — size, traffic impact, how long it's been there..."
              maxLength={1000}
            />
          </div>

          <div className="form-note">
            <Info size={16} />
            <span>
              Your report goes straight to the municipal officer queue. You&apos;ll get a notification when work
              starts and when the repair is confirmed.
            </span>
          </div>

          {submitError && <div className="form-error">{submitError}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep('photo')}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!detailsValid || submit.isPending}
              onClick={() => {
                setSubmitError('');
                submit.mutate();
              }}
            >
              {submit.isPending ? <Spinner small /> : <Send size={16} />} Submit report
            </button>
          </div>
        </div>
      )}

      {step === 'done' && submitted && (
        <div className="card success-panel">
          <div className="success-icon">
            <BadgeCheck size={36} />
          </div>
          <h2 style={{ fontSize: 24 }}>Report submitted</h2>
          <div className="ticket-big">{submitted.ticketId}</div>
          <p style={{ color: 'var(--ink-2)', maxWidth: 420, margin: '0 auto 8px', fontSize: 14.5 }}>
            <MapPin size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            {submitted.location}
          </p>
          <div className="pill-row" style={{ justifyContent: 'center', margin: '12px 0 24px' }}>
            <span className={`pill pill-priority-${submitted.priority}`}>{submitted.priority} priority</span>
            <span className="pill pill-status-submitted">Submitted</span>
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: 13.5, maxWidth: 440, margin: '0 auto 26px' }}>
            {submitted.priorityReason} We&apos;ll notify you when an officer starts work and when the repair is confirmed.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/reporter/reports')}>
              Track my reports <ArrowRight size={15} />
            </button>
            <Link href="/reporter/report" className="btn btn-outline" onClick={() => {
              setStep('photo');
              setPhoto(null);
              setAnalysis(null);
              setSubmitted(null);
              setLocation('');
              setLandmark('');
              setDescription('');
              setCategory('normal');
            }}>
              Report another
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
