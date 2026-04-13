'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { Wallet, Calendar, AlertTriangle, Heart, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MemberStats {
  member: {
    walletBalance: number;
    status: string;
    consecutiveArrears: number;
    totalDefaultEvents: number;
  };
  walletBalance: number;
  currentMonthPaid: boolean;
  contributions: Record<string, unknown>[];
  recentTransactions: Record<string, unknown>[];
  activeCasesRequiringPayment: Record<string, unknown>[];
  myCaseContributions: Record<string, unknown>[];
  renewalStatus: string;
  currentYear: number;
  currentMonth: number;
}

export function MemberOverview() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => (
      <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
    ))}</div>;
  }

  if (!stats) return null;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold">Welcome back, {(session as any)?.user?.member?.firstName || 'Member'}!</h2>
          <p className="text-navy-300 text-sm mt-1">Here&apos;s your welfare dashboard overview</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Wallet Balance"
          value={`Ksh ${stats.walletBalance.toLocaleString()}`}
          icon={Wallet}
          className="border-l-4 border-l-teal-500"
        />
        <StatCard
          title="This Month"
          value={stats.currentMonthPaid ? 'Paid ✓' : 'Unpaid'}
          subtitle={`${monthNames[(stats.currentMonth || 1) - 1]} ${stats.currentYear}`}
          icon={Calendar}
          className={`border-l-4 ${stats.currentMonthPaid ? 'border-l-emerald-500' : 'border-l-amber-500'}`}
        />
        <StatCard
          title="Pending Cases"
          value={stats.activeCasesRequiringPayment?.length || 0}
          subtitle="requiring contribution"
          icon={Heart}
          className="border-l-4 border-l-red-400"
        />
        <StatCard
          title="Membership Status"
          value={stats.member?.status || 'N/A'}
          icon={stats.member?.status === 'ACTIVE' ? CheckCircle : AlertTriangle}
          className={`border-l-4 ${stats.member?.status === 'ACTIVE' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}
        />
      </div>

      {/* Active Cases */}
      {stats.activeCasesRequiringPayment?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Cases Requiring Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.activeCasesRequiringPayment.map((cc: Record<string, unknown>) => (
                <div key={String(cc.id)} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                  <div>
                    <p className="text-sm font-medium">{String(cc.case && (cc.case as Record<string, unknown>).deceasedName || '')}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(cc.case && (cc.case as Record<string, unknown>).deceasedRelationship || '')} — Ksh {Number(cc.expectedAmount).toLocaleString()} due
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">PENDING</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Wallet Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions?.length > 0 ? (
            <div className="space-y-2">
              {stats.recentTransactions.slice(0, 5).map((tx: Record<string, unknown>) => (
                <div key={String(tx.id)} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm">{String(tx.description)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(String(tx.createdAt)).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}Ksh {Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          )}
        </CardContent>
      </Card>

      {/* Renewal Status */}
      {stats.renewalStatus === 'PENDING' && (
        <Card className="border-amber-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Annual Renewal Due</p>
                <p className="text-xs text-muted-foreground">Your {stats.currentYear} membership renewal is pending</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300">
              Go to Renewals
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
