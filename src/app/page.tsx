'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/shared/login-form';
import { RegisterForm } from '@/components/shared/register-form';
import { LoadingScreen } from '@/components/shared/loading';
import { Sidebar, MobileNav } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// Admin views
import { AdminOverview } from '@/components/admin/overview';
import { MembersTable } from '@/components/admin/members-table';
import { ContributionsTable } from '@/components/admin/contributions-table';
import { BereavementCases } from '@/components/admin/bereavement-cases';
import { WalletView } from '@/components/admin/wallet-view';
import { ReportsView } from '@/components/admin/reports-view';
import { SettingsForm } from '@/components/admin/settings-form';
import { RenewalsView } from '@/components/admin/renewals-view';

// Member views
import { MemberOverview } from '@/components/member/member-overview';
import { MemberProfile } from '@/components/member/member-profile';
import { MemberContributions } from '@/components/member/member-contributions';
import { MemberCases } from '@/components/member/member-cases';
import { MemberRenewals } from '@/components/member/member-renewals';

type View = 'login' | 'register' | 'overview' | 'members' | 'contributions' | 'bereavement' |
  'wallet' | 'reports' | 'settings' | 'renewals' |
  'member-overview' | 'member-profile' | 'member-contributions' | 'member-cases' | 'member-renewals';

const ADMIN_DEFAULT: View = 'overview';
const MEMBER_DEFAULT: View = 'member-overview';

export default function Home() {
  const { session, status } = useAuth();
  // Track user navigation separately from default view
  const [userView, setUserView] = useState<View | null>(null);

  const handleViewChange = useCallback((newView: View) => {
    setUserView(newView);
  }, []);

  // Compute the active view based on auth state and user navigation
  const isAuthenticated = status === 'authenticated' && !!session;

  let view: View;
  if (!isAuthenticated) {
    // Unauthenticated: show login or register
    view = userView === 'register' ? 'register' : 'login';
  } else if (userView !== null && userView !== 'login' && userView !== 'register') {
    // User has navigated to a specific authenticated view
    view = userView;
  } else {
    // Authenticated with no user navigation yet, use role-based default
    view = session!.user.role === 'ADMIN' ? ADMIN_DEFAULT : MEMBER_DEFAULT;
  }

  // Show loading while session is being fetched
  if (status === 'loading') {
    return <LoadingScreen message="Authenticating..." />;
  }

  // Not authenticated - show login/register
  if (!isAuthenticated) {
    if (view === 'register') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-white p-4">
          <RegisterForm onSwitchToLogin={() => setUserView('login')} />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-white p-4">
        <LoginForm onSwitchToRegister={() => setUserView('register')} />
      </div>
    );
  }

  // Authenticated - show dashboard
  const role = session!.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const isAdmin = role === 'ADMIN';

  const renderContent = () => {
    if (isAdmin) {
      switch (view) {
        case 'overview': return <AdminOverview />;
        case 'members': return <MembersTable />;
        case 'contributions': return <ContributionsTable />;
        case 'bereavement': return <BereavementCases />;
        case 'wallet': return <WalletView />;
        case 'reports': return <ReportsView />;
        case 'settings': return <SettingsForm />;
        case 'renewals': return <RenewalsView />;
        default: return <AdminOverview />;
      }
    }

    switch (view) {
      case 'member-overview': return <MemberOverview />;
      case 'member-profile': return <MemberProfile />;
      case 'member-contributions': return <MemberContributions />;
      case 'member-cases': return <MemberCases />;
      case 'member-renewals': return <MemberRenewals />;
      default: return <MemberOverview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeView={view} onViewChange={handleViewChange} role={role} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header activeView={view} onMobileViewChange={handleViewChange} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {renderContent()}
        </main>
      </div>

      <MobileNav activeView={view} onViewChange={handleViewChange} role={role} />
    </div>
  );
}
