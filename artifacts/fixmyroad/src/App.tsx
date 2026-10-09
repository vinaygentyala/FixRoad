import type { ComponentType, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, Switch } from 'wouter';
import {
  Bell, Camera, ClipboardList, Flame, HardHat, LayoutDashboard, UserRound,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoaderScreen } from '@/components/bits';
import { DashboardShell, roleHome, type NavItem } from '@/components/shell';
import { NotificationsPage } from '@/components/notifications-page';
import { ProfilePage } from '@/components/profile-page';
import { useSession } from '@/lib/session';
import type { Role, User } from '@/lib/types';
import Landing from '@/pages/landing';
import AuthPage from '@/pages/auth';
import NotFound from '@/pages/not-found';
import ReporterOverview from '@/pages/reporter/overview';
import ReportIssue from '@/pages/reporter/report';
import MyReports from '@/pages/reporter/my-reports';
import OfficerOverview from '@/pages/officer/overview';
import AllReports from '@/pages/officer/reports';
import HighPriority from '@/pages/officer/priority';
import Assignments from '@/pages/officer/assignments';

const queryClient = new QueryClient();

const reporterNav: NavItem[] = [
  { href: '/reporter', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/reporter/report', label: 'Report issue', icon: Camera },
  { href: '/reporter/reports', label: 'My reports', icon: ClipboardList },
  { href: '/reporter/notifications', label: 'Notifications', icon: Bell },
  { href: '/reporter/profile', label: 'Profile', icon: UserRound },
];

const officerNav: NavItem[] = [
  { href: '/officer', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/officer/reports', label: 'All reports', icon: ClipboardList },
  { href: '/officer/priority', label: 'High priority', icon: Flame },
  { href: '/officer/assignments', label: 'Assignments', icon: HardHat },
  { href: '/officer/notifications', label: 'Notifications', icon: Bell },
  { href: '/officer/profile', label: 'Profile', icon: UserRound },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/reporter': { title: 'Overview', subtitle: 'Your reports at a glance' },
  '/reporter/report': { title: 'Report an issue', subtitle: 'Capture, assess, submit' },
  '/reporter/reports': { title: 'My reports', subtitle: 'Track every repair you reported' },
  '/reporter/notifications': { title: 'Notifications', subtitle: 'Updates from the road team' },
  '/reporter/profile': { title: 'Profile', subtitle: 'Your account details' },
  '/officer': { title: 'Overview', subtitle: 'City road report command center' },
  '/officer/reports': { title: 'All reports', subtitle: 'Every citizen report in one queue' },
  '/officer/priority': { title: 'High priority', subtitle: 'Urgent reports that need action first' },
  '/officer/assignments': { title: 'Assignments', subtitle: 'Crew workloads and unassigned reports' },
  '/officer/notifications': { title: 'Notifications', subtitle: 'New reports and queue activity' },
  '/officer/profile': { title: 'Profile', subtitle: 'Your account details' },
};

function Protected({ role, children }: { role: Role; children: (user: User) => ReactNode }) {
  const { user, isLoading } = useSession();
  if (isLoading) return <LoaderScreen />;
  if (!user) return <Redirect to={`/auth/${role}`} />;
  if (user.role !== role) return <Redirect to={roleHome(user.role)} />;
  return <>{children(user)}</>;
}

function DashboardPage({ role, path, Page }: { role: Role; path: string; Page: ComponentType<{ user: User }> }) {
  return (
    <Protected role={role}>
      {(user) => (
        <DashboardShell
          user={user}
          nav={role === 'officer' ? officerNav : reporterNav}
          title={pageTitles[path]?.title ?? ''}
          subtitle={pageTitles[path]?.subtitle ?? ''}
        >
          <Page user={user} />
        </DashboardShell>
      )}
    </Protected>
  );
}

const ReporterHome = () => <ReporterOverview />;
const OfficerHome = () => <OfficerOverview />;
const ReporterNotifications = () => <NotificationsPage />;
const OfficerNotifications = () => <NotificationsPage />;
const ReporterProfile = ({ user }: { user: User }) => <ProfilePage user={user} />;
const OfficerProfile = ({ user }: { user: User }) => <ProfilePage user={user} />;
const ReportIssuePage = () => <ReportIssue />;
const MyReportsPage = () => <MyReports />;
const AllReportsPage = () => <AllReports />;
const HighPriorityPage = () => <HighPriority />;
const AssignmentsPage = () => <Assignments />;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/auth/reporter">{() => <AuthPage role="reporter" />}</Route>
          <Route path="/auth/officer">{() => <AuthPage role="officer" />}</Route>

          <Route path="/reporter">{() => <DashboardPage role="reporter" path="/reporter" Page={ReporterHome} />}</Route>
          <Route path="/reporter/report">{() => <DashboardPage role="reporter" path="/reporter/report" Page={ReportIssuePage} />}</Route>
          <Route path="/reporter/reports">{() => <DashboardPage role="reporter" path="/reporter/reports" Page={MyReportsPage} />}</Route>
          <Route path="/reporter/notifications">{() => <DashboardPage role="reporter" path="/reporter/notifications" Page={ReporterNotifications} />}</Route>
          <Route path="/reporter/profile">{() => <DashboardPage role="reporter" path="/reporter/profile" Page={ReporterProfile} />}</Route>

          <Route path="/officer">{() => <DashboardPage role="officer" path="/officer" Page={OfficerHome} />}</Route>
          <Route path="/officer/reports">{() => <DashboardPage role="officer" path="/officer/reports" Page={AllReportsPage} />}</Route>
          <Route path="/officer/priority">{() => <DashboardPage role="officer" path="/officer/priority" Page={HighPriorityPage} />}</Route>
          <Route path="/officer/assignments">{() => <DashboardPage role="officer" path="/officer/assignments" Page={AssignmentsPage} />}</Route>
          <Route path="/officer/notifications">{() => <DashboardPage role="officer" path="/officer/notifications" Page={OfficerNotifications} />}</Route>
          <Route path="/officer/profile">{() => <DashboardPage role="officer" path="/officer/profile" Page={OfficerProfile} />}</Route>

          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
