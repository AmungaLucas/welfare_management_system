'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/shared/login-form';
import { RegisterForm } from '@/components/shared/register-form';
import { LoadingScreen } from '@/components/shared/loading';
import { Sidebar, MobileNav } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// Admin views
import { AdminOverview } from '@/components/admin/overview';
import { MembersTable } from '@/components/admin/members-table';
import { PaymentsView } from '@/components/admin/payments-view';
import { WalletView } from '@/components/admin/wallet-view';
import { ReportsView } from '@/components/admin/reports-view';
import { SettingsForm } from '@/components/admin/settings-form';

// Member views
import { MemberOverview } from '@/components/member/member-overview';
import { MemberProfile } from '@/components/member/member-profile';
import { MemberPayments } from '@/components/member/member-payments';

type View = 'login' | 'register' | 'overview' | 'members' | 'payments' |
  'wallets' | 'wallet' | 'reports' | 'settings' |
  'member-overview' | 'member-profile' | 'member-payments';

const ADMIN_DEFAULT: View = 'overview';
const MEMBER_DEFAULT: View = 'member-overview';

export default function Home() {
  const { session, status } = useAuth();
  const [userView, setUserView] = useState<View | null>(null);

  // Listen for navigation events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setUserView(customEvent.detail as View);
      }
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setUserView(newView);
  }, []);

  const isAuthenticated = status === 'authenticated' && !!session;

  let view: View;
  if (!isAuthenticated) {
    view = userView === 'register' ? 'register' : 'login';
  } else if (userView !== null && userView !== 'login' && userView !== 'register') {
    view = userView;
  } else {
    view = session!.user.role === 'ADMIN' ? ADMIN_DEFAULT : MEMBER_DEFAULT;
  }

  if (status === 'loading') {
    return <LoadingScreen message="Authenticating..." />;
  }

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

  const role = session!.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const isAdmin = role === 'ADMIN';

  const renderContent = () => {
    if (isAdmin) {
      switch (view) {
        case 'overview': return <AdminOverview />;
        case 'members': return <MembersTable />;
        case 'payments': return <PaymentsView />;
        case 'wallets':
        case 'wallet': return <WalletView />;
        case 'reports': return <ReportsView />;
        case 'settings': return <SettingsForm />;
        default: return <AdminOverview />;
      }
    }

    switch (view) {
      case 'member-overview': return <MemberOverview />;
      case 'member-profile': return <MemberProfile />;
      case 'member-payments': return <MemberPayments />;
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
