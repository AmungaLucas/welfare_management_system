'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LogOut, Menu, Bell, User, Shield } from 'lucide-react';
import { adminNav, memberNav } from './sidebar';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMobileViewChange: (view: 'login' | 'register' | 'overview' | 'members' | 'contributions' | 'bereavement' | 'wallet' | 'reports' | 'settings' | 'renewals' | 'member-overview' | 'member-profile' | 'member-contributions' | 'member-cases' | 'member-renewals') => void;
  activeView: string;
}

export function Header({ onMobileViewChange, activeView }: HeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const items = role === 'ADMIN' ? adminNav : memberNav;

  const initials = session?.user?.email
    ? session.user.email.substring(0, 2).toUpperCase()
    : 'U';

  const currentLabel = items.find((i) => i.id === activeView)?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-navy-100 bg-white/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => document.querySelector('[data-state]')?.setAttribute('data-state', 'open')}>
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-64 p-0 bg-navy-950 text-white">
            <SheetHeader className="px-5 py-5 border-b border-navy-800">
              <SheetTitle className="text-left text-church-gold flex items-center gap-2">
                <span>✟</span>
                <div>
                  <div className="text-sm font-bold">ACK St. Monica</div>
                  <div className="text-[10px] text-navy-400 font-normal">Welfare Management</div>
                </div>
              </SheetTitle>
            </SheetHeader>
            <nav className="px-3 py-4 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onMobileViewChange(item.id as Parameters<typeof onMobileViewChange>[0]);
                    document.querySelector('[data-radix-sheet-close]')?.dispatchEvent(new MouseEvent('click'));
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left',
                    activeView === item.id
                      ? 'bg-navy-800 text-church-gold font-medium'
                      : 'text-navy-300 hover:bg-navy-900 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <h2 className="text-lg font-semibold text-navy-900">{currentLabel}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-navy-600" />
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-accent cursor-pointer bg-transparent border-0 text-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-navy-900 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none">
                  {(session as any)?.user?.member?.firstName || session?.user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  {role === 'ADMIN' ? (
                    <><Shield className="h-3 w-3" />Admin</>
                  ) : (
                    <><User className="h-3 w-3" />Member</>
                  )}
                </p>
              </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
