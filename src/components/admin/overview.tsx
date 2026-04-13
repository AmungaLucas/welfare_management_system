'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/shared/stat-card';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Heart, Wallet, TrendingUp, AlertTriangle, DollarSign,
  UserCheck, UserX, Calendar
} from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  suspendedMembers: number;
  activeCases: number;
  monthlyCollections: number;
  monthlyContributors: number;
  yearlyCollections: number;
  totalWalletBalance: number;
  membersWithArrears: number;
  redAlertMembers: number;
  totalBenefitsDisbursed: number;
  currentYear: number;
  currentMonth: number;
}

interface ChartData {
  contributionTrends: { month: string; amount: number; count: number }[];
  districtDistribution: { district: string; count: number }[];
  casesByCategory: { category: string; count: number }[];
  casesByStatus: { status: string; count: number }[];
  arrearsByDistrict: { district: string; count: number }[];
}

export function AdminOverview() {
   
  const { session } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      }),
      fetch('/api/dashboard/charts').then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      }),
    ])
      .then(([s, c]) => {
        setStats(s);
        setCharts(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={stats?.totalMembers || 0}
          subtitle={`${stats?.activeMembers || 0} active`}
          icon={Users}
          className="border-l-4 border-l-navy-500"
        />
        <StatCard
          title="Monthly Collections"
          value={`Ksh ${(stats?.monthlyCollections || 0).toLocaleString()}`}
          subtitle={`${stats?.monthlyContributors || 0} contributors`}
          icon={DollarSign}
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Active Cases"
          value={stats?.activeCases || 0}
          subtitle={`${stats?.totalBenefitsDisbursed || 0} disbursed`}
          icon={Heart}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Outstanding Arrears"
          value={stats?.membersWithArrears || 0}
          subtitle={`${stats?.redAlertMembers || 0} red alert`}
          icon={AlertTriangle}
          className="border-l-4 border-l-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingMembers || 0}
          icon={UserCheck}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Yearly Collections"
          value={`Ksh ${(stats?.yearlyCollections || 0).toLocaleString()}`}
          subtitle={`Year ${stats?.currentYear}`}
          icon={TrendingUp}
          className="border-l-4 border-l-violet-500"
        />
        <StatCard
          title="Wallet Balance"
          value={`Ksh ${(stats?.totalWalletBalance || 0).toLocaleString()}`}
          icon={Wallet}
          className="border-l-4 border-l-teal-500"
        />
        <StatCard
          title="Suspended"
          value={stats?.suspendedMembers || 0}
          icon={UserX}
          className="border-l-4 border-l-rose-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contribution Trends ({stats?.currentYear})</CardTitle>
            <CardDescription>Monthly collections overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(charts?.contributionTrends || []).map((item) => {
                const maxAmount = Math.max(...(charts?.contributionTrends || []).map((c) => c.amount), 1);
                return (
                  <div key={item.month} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-muted-foreground shrink-0">{item.month}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-600 rounded-full transition-all"
                        style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-20 text-right shrink-0">
                      Ksh {item.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* District Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members by District</CardTitle>
            <CardDescription>Distribution across church districts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(charts?.districtDistribution || []).map((item) => {
                const maxCount = Math.max(...(charts?.districtDistribution || []).map((c) => c.count), 1);
                return (
                  <div key={item.district} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-muted-foreground shrink-0 truncate">{item.district}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-church-gold rounded-full transition-all"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right shrink-0">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Arrears by District */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arrears by District</CardTitle>
            <CardDescription>Members with outstanding payments</CardDescription>
          </CardHeader>
          <CardContent>
            {charts?.arrearsByDistrict.length ? (
              <div className="space-y-2">
                {charts.arrearsByDistrict.map((item) => (
                  <div key={item.district} className="flex items-center justify-between py-1">
                    <span className="text-sm">{item.district}</span>
                    <Badge variant={item.count >= 3 ? 'destructive' : 'secondary'}>
                      {item.count} members
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No arrears reported</p>
            )}
          </CardContent>
        </Card>

        {/* Case Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case Statistics</CardTitle>
            <CardDescription>Bereavement cases overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(charts?.casesByCategory || []).map((item) => (
                <div key={item.category} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-navy-900">{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.category === 'NUCLEAR_FAMILY' ? 'Nuclear Family' : 'Parent'}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(charts?.casesByStatus || []).map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-sm">{item.status.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
