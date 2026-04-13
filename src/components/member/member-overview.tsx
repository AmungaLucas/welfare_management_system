'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/shared/stat-card';
import {
  Wallet, Calendar, AlertTriangle, Heart, CheckCircle, Clock, DollarSign,
  Loader2, CreditCard, Church, Hash, Phone, Shield, TrendingUp, Bell,
} from 'lucide-react';
import { toast } from 'sonner';

interface MemberStats {
  member: {
    walletBalance: number;
    status: string;
    consecutiveArrears: number;
    totalDefaultEvents: number;
    firstName: string;
    lastName: string;
    churchMembershipNo: string;
    churchDurationYears: number | null;
    dateJoinedWelfare: string | null;
    registrationFeePaid: number;
    joiningFeePaid: number;
    phone: string;
    email: string | null;
    district: { name: string } | null;
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
  const { session } = useAuth();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingCase, setPayingCase] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null);
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then(setStats)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => (
      <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
    ))}</div>;
  }

  const handleContributeClick = (caseId: string) => {
    setShowPayDialog(caseId);
    setMpesaReceipt('');
  };

  const handleConfirmPayment = async (caseId: string) => {
    if (!mpesaReceipt.trim()) {
      toast.error('Please enter your M-Pesa receipt number');
      return;
    }
    setReceiptSubmitting(true);
    setPayingCase(caseId);
    try {
      const res = await fetch(`/api/bereavement/${caseId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useWallet: false, paymentMethod: 'MPESA' }),
      });
      if (res.ok) {
        toast.success('Contribution recorded successfully');
        setShowPayDialog(null);
        setMpesaReceipt('');
        // Refresh stats
        fetch('/api/dashboard/stats').then(async (r) => r.ok ? r.json() : null).then(setStats);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to pay');
      }
    } catch { toast.error('Failed'); }
    finally { setPayingCase(null); setReceiptSubmitting(false); }
  };

  if (!stats) return null;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = stats.member;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold">Welcome back, {m.firstName}!</h2>
          <p className="text-navy-300 text-sm mt-1">Here&apos;s your welfare dashboard overview</p>
        </CardContent>
      </Card>

      {/* M-Pesa Paybill Info Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="font-semibold text-green-800">M-Pesa Paybill: <span className="font-mono text-lg">123456</span></p>
              <p className="text-sm text-green-700">All welfare payments must be made via M-Pesa Paybill. Go to Payments to record your contribution with the M-Pesa receipt number.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Wallet Balance"
          value={`Ksh ${stats.walletBalance.toLocaleString()}`}
          icon={Wallet}
          className="border-l-4 border-l-teal-500"
        />
        <StatCard
          title="This Month"
          value={stats.currentMonthPaid ? 'Paid' : 'Unpaid'}
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
          title="Status"
          value={m.status?.replace(/_/g, ' ') || 'N/A'}
          icon={m.status === 'ACTIVE' ? CheckCircle : AlertTriangle}
          className={`border-l-4 ${m.status === 'ACTIVE' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}
        />
      </div>

      {/* Active Cases */}
      {stats.activeCasesRequiringPayment?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Active Cases Requiring Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.activeCasesRequiringPayment.map((cc: Record<string, unknown>) => {
                const caseData = cc.case as Record<string, unknown>;
                const caseId = String(caseData?.id || '');
                const isPaying = payingCase === caseId;
                return (
                  <div key={String(cc.id)} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{String(caseData?.deceasedName || '')}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(caseData?.deceasedRelationship || '')} &mdash; <span className="font-medium">Ksh {Number(cc.expectedAmount).toLocaleString()}</span> due
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="destructive" className="text-[10px]">PENDING</Badge>
                      <Button
                        size="sm"
                        className="bg-red-700 hover:bg-red-800 text-white h-7 text-xs"
                        disabled={isPaying}
                        onClick={() => handleContributeClick(caseId)}
                      >
                        {isPaying ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Paying...</> : <><DollarSign className="h-3 w-3 mr-1" />Pay</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Information + Arrears Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-navy-700" />
              Membership Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Church Reg.</span>
              <span className="text-sm font-mono font-medium">{m.churchMembershipNo}</span>
            </div>
            <div className="flex items-center gap-3">
              <Church className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Church Reg.</span>
              <span className="text-sm font-mono font-medium">{m.churchMembershipNo || '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Join Date</span>
              <span className="text-sm font-medium">{m.dateJoinedWelfare ? new Date(m.dateJoinedWelfare).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Church Years</span>
              <span className="text-sm font-medium">{m.churchDurationYears ? `${m.churchDurationYears} years` : '—'}</span>
            </div>
            {m.district && (
              <div className="flex items-center gap-3">
                <Church className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-28 shrink-0">District</span>
                <span className="text-sm font-medium">{m.district.name}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-3">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Registration</span>
              {Number(m.registrationFeePaid) > 0
                ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Paid</Badge>
                : <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>}
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-28 shrink-0">Joining Fee</span>
              {Number(m.joiningFeePaid) > 0
                ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Paid</Badge>
                : <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>}
            </div>

            {/* Arrears Warning */}
            {m.consecutiveArrears > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {m.consecutiveArrears} missed contribution(s)
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {m.consecutiveArrears >= 6
                    ? 'You have been removed from the register. Please contact the admin.'
                    : m.consecutiveArrears >= 3
                    ? 'You must wait 6 months before qualifying for benefits.'
                    : 'Please settle your arrears to avoid red alert status.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Wallet Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-teal-600" />
              Wallet &amp; Recent Transactions
            </CardTitle>
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
      </div>

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
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300" onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'member-payments' }));
            }}>
              <CreditCard className="h-3.5 w-3.5 mr-1" />Go to Renewals
            </Button>
          </CardContent>
        </Card>
      )}

      {/* M-Pesa Receipt Dialog for Case Payment */}
      <Card className={`border-blue-200 ${!showPayDialog ? 'hidden' : ''}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Confirm Bereavement Payment</p>
              <p className="text-xs text-muted-foreground">
                Send payment via M-Pesa Paybill <span className="font-mono font-bold">123456</span> first, then enter your receipt number below.
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">M-Pesa Receipt No. *</label>
            <input
              type="text"
              className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
              placeholder="e.g. QK3A7B2X9R"
              value={mpesaReceipt}
              onChange={(e) => setMpesaReceipt(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Enter the M-Pesa transaction receipt number from your SMS confirmation</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowPayDialog(null); setMpesaReceipt(''); }}>Cancel</Button>
            <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white"
              disabled={receiptSubmitting || !mpesaReceipt.trim()}
              onClick={() => showPayDialog && handleConfirmPayment(showPayDialog)}>
              {receiptSubmitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing...</> : 'Confirm Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
