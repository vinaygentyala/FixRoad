import { Link, Redirect } from 'wouter';
import {
  ArrowRight, BellRing, Camera, CheckCircle2, Construction, HardHat,
  MapPin, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import { LoaderScreen } from '@/components/bits';
import { roleHome } from '@/components/shell';
import { useSession } from '@/lib/session';

export default function Landing() {
  const { user, isLoading } = useSession();

  if (isLoading) return <LoaderScreen />;
  if (user) return <Redirect to={roleHome(user.role)} />;


  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark">
            <Construction size={20} />
          </span>
          <span className="landing-brand-name">FixMyRoad</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/reporter" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/auth/reporter" className="btn btn-dark btn-sm">Get started</Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Citizen + officer road repair network
          </span>
          <h1>
            Spot it. Report it.<br />
            <span className="accent">Watch it get fixed.</span>
          </h1>
          <p className="hero-copy">
            FixMyRoad connects citizens and municipal road officers. Snap a photo of a pothole,
            our AI assesses the damage, and smart priority rules make sure the most dangerous
            roads get repaired first.
          </p>
          <div className="role-cards">
            <Link href="/auth/reporter" className="role-card">
              <span className="role-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <UserRound size={22} />
              </span>
              <h3>I&apos;m a Citizen</h3>
              <p>Report potholes with your camera, get an instant AI assessment, and track every repair in real time.</p>
              <span className="role-cta">
                Report a pothole <ArrowRight size={15} />
              </span>
            </Link>
            <Link href="/auth/officer" className="role-card officer">
              <span className="role-icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber-strong)' }}>
                <HardHat size={22} />
              </span>
              <h3>I&apos;m an Officer</h3>
              <p>Triage incoming reports, manage priorities and crew assignments, and close the loop with citizens.</p>
              <span className="role-cta">
                Officer portal <ArrowRight size={15} />
              </span>
            </Link>
          </div>
        </div>

        <div className="hero-art">
          <img src="/hero-road.png" alt="Illustration of a citizen reporting a pothole on a city street at dusk" />
          <div className="hero-float float-a">
            <span className="stat-icon rose" style={{ width: 38, height: 38 }}>
              <MapPin size={18} />
            </span>
            <div>
              <strong>High priority</strong>
              <small>School zone report</small>
            </div>
          </div>
          <div className="hero-float float-b">
            <span className="stat-icon green" style={{ width: 38, height: 38 }}>
              <CheckCircle2 size={18} />
            </span>
            <div>
              <strong>Resolved</strong>
              <small>Repair verified by crew</small>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-strip">
        <div className="strip-inner">
          <div className="strip-item">
            <span className="strip-icon"><Camera size={19} /></span>
            <div>
              <h4>Capture in seconds</h4>
              <p>Use your phone camera or upload a photo — no forms longer than a minute.</p>
            </div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><Sparkles size={19} /></span>
            <div>
              <h4>AI severity check</h4>
              <p>Every photo gets an instant, advisory AI assessment of the visible damage.</p>
            </div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><MapPin size={19} /></span>
            <div>
              <h4>Location-aware context</h4>
              <p>AI reads visible damage first, with weather checked for the location the reporter supplied.</p>
            </div>
          </div>
          <div className="strip-item">
            <span className="strip-icon"><BellRing size={19} /></span>
            <div>
              <h4>Real-time updates</h4>
              <p>Reporters get notified at every step — from review to crew assignment to repair.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        FixMyRoad · A clearer route from report to repair · Built for citizens and municipal teams
      </footer>
    </div>
  );
}
