import { Flame, Info } from 'lucide-react';
import { ReportBrowser } from './reports';

export default function HighPriority() {
  return (
    <div className="stack-lg">
      <div className="form-note amber">
        <Flame size={16} />
        <span>
          High-priority reports come from school and hospital zones year-round, and from every zone during the
          October–February high-priority season. Officers can also raise priority manually.
        </span>
      </div>
      <ReportBrowser
        fixedPriority="high"
        emptyTitle="No open high-priority reports"
        emptyBody="When a high-priority report comes in it will appear here until it is resolved."
      />
      <div className="form-note">
        <Info size={16} />
        <span>Resolved reports drop off this list automatically. Use All reports to browse the full history.</span>
      </div>
    </div>
  );
}
