'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, Wallet, Heart, PiggyBank, BarChart3, Settings, RefreshCw, User, CreditCard } from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const adminNav: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'wallets', label: 'Wallets', icon: PiggyBank },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const memberNav: SidebarItem[] = [
  { id: 'member-overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'member-profile', label: 'My Profile', icon: User },
  { id: 'member-payments', label: 'Payments', icon: CreditCard },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (view: 'login' | 'register' | 'overview' | 'members' | 'payments' | 'wallets' | 'wallet' | 'reports' | 'settings' | 'member-overview' | 'member-profile' | 'member-payments') => void;
  role: 'ADMIN' | 'MEMBER';
}

export function Sidebar({ activeView, onViewChange, role }: SidebarProps) {
  const items = role === 'ADMIN' ? adminNav : memberNav;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-navy-950 text-white min-h-screen">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-church-gold">
          <span className="text-navy-950 font-bold text-lg">✟</span>
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">ACK St. Monica</h1>
          <p className="text-[11px] text-navy-400 leading-tight">Welfare Management</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as Parameters<typeof onViewChange>[0])}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left',
              activeView === item.id
                ? 'bg-navy-800 text-church-gold font-medium'
                : 'text-navy-300 hover:bg-navy-900 hover:text-white'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-navy-800">
        <p className="text-[10px] text-navy-500">© {new Date().getFullYear()} ACK St. Monica</p>
      </div>
    </aside>
  );
}

interface MobileNavProps {
  activeView: string;
  onViewChange: (view: 'login' | 'register' | 'overview' | 'members' | 'payments' | 'wallets' | 'wallet' | 'reports' | 'settings' | 'member-overview' | 'member-profile' | 'member-payments') => void;
  role: 'ADMIN' | 'MEMBER';
}

export function MobileNav({ activeView, onViewChange, role }: MobileNavProps) {
  const items = role === 'ADMIN' ? adminNav.slice(0, 5) : memberNav;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-navy-100 px-2 py-1 safe-area-bottom">
      <div className="flex justify-around items-center">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as Parameters<typeof onViewChange>[0])}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px]',
              activeView === item.id ? 'text-navy-900 font-medium' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
