import { Link } from 'wouter';
import { Construction, MapPinOff } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <span className="brand-mark" style={{ margin: '0 auto 20px', width: 52, height: 52 }}>
          <Construction size={24} />
        </span>
        <div className="empty-icon" style={{ marginBottom: 14 }}>
          <MapPinOff size={26} />
        </div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>This road doesn&apos;t exist</h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 22 }}>
          The page you&apos;re looking for has been rerouted. Head back to the main road.
        </p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  );
}
