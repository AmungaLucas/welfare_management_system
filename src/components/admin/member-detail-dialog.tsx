'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Phone, Mail, Calendar, Church, Users, Shield,
  Wallet, Heart, AlertTriangle, CheckCircle, XCircle, Receipt,
  User, Clock, Activity, MapPin, CreditCard,
  ShieldCheck, Smartphone, TrendingUp, TrendingDown,
  Award, Gift, Star, Fingerprint, Building2, Linkedin,
  Sparkles, Crown, Gem, Zap
} from 'lucide-react';

interface ContributionRecord {
  id: string;
  year: number;
  month: number;
  amount: number;
  paymentMethod: string;
  mpesaRef: string | null;
  paidDate: string;
  status: string;
}

interface CaseContributionRecord {
  id: string;
  expectedAmount: number;
  paidAmount: number;
  status: string;
  paymentMethod: string;
  mpesaRef: string | null;
  paidDate: string | null;
  createdAt: string;
  case: {
    id: string;
    deceasedName: string;
    deceasedRelationship: string;
    status: string;
    createdAt: string;
  };
}

interface RenewalRecord {
  id: string;
  year: number;
  amount: number;
  status: string;
  paidDate: string | null;
  paymentMethod: string | null;
  mpesaRef: string | null;
}

interface WalletTransactionRecord {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface BereavementCaseRecord {
  id: string;
  deceasedName: string;
  deceasedRelationship: string;
  status: string;
  benefitAmount: number;
  totalCollected: number;
  createdAt: string;
  caseContributions: { status: string }[];
}

interface MemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  phone: string;
  email: string | null;
  churchMembershipNo: string;
  welfareNo: number | null;
  status: string;
  consecutiveArrears: number;
  totalDefaultEvents: number;
  walletBalance: number;
  joiningFeePaid: number;
  registrationFeePaid: number;
  dateJoinedWelfare: string | null;
  churchMembershipDate: string | null;
  churchDurationYears: number | null;
  isNewChurchMember: boolean;
  suspendedUntil: string | null;
  removedFromRegister: boolean;
  spouseName: string | null;
  spouseAlive: boolean | null;
  fatherName: string | null;
  fatherAlive: boolean | null;
  motherName: string | null;
  motherAlive: boolean | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  district: { id: number; name: string };
  user: { id: string; email: string; isActive: boolean } | null;
  contributions: ContributionRecord[];
  caseContributions: CaseContributionRecord[];
  annualRenewals: RenewalRecord[];
  walletTransactions: WalletTransactionRecord[];
  bereavementCases: BereavementCaseRecord[];
}

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: typeof Shield; label: string }> = {
  ACTIVE: {
    bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
    label: 'Active Member'
  },
  PENDING_APPROVAL: {
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    label: 'Pending Approval'
  },
  SUSPENDED: {
    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: AlertTriangle,
    label: 'Suspended'
  },
  REMOVED: {
    bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: XCircle,
    label: 'Removed'
  },
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  receipt: string | null;
  date: string;
  status: string;
  category: 'contribution' | 'case' | 'renewal';
}

function buildTransactions(member: MemberDetail): TransactionRow[] {
  const rows: TransactionRow[] = [];
  for (const c of member.contributions) {
    rows.push({ id: c.id, type: `Monthly (${monthNames[c.month]} ${c.year})`, amount: Number(c.amount), receipt: c.mpesaRef, date: c.paidDate, status: c.status, category: 'contribution' });
  }
  for (const cc of member.caseContributions) {
    rows.push({ id: cc.id, type: `Bereavement (${cc.case?.deceasedName || ''})`, amount: Number(cc.paidAmount), receipt: cc.mpesaRef, date: cc.paidDate || cc.createdAt, status: cc.status, category: 'case' });
  }
  for (const r of member.annualRenewals) {
    rows.push({ id: r.id, type: `Renewal (${r.year})`, amount: Number(r.amount), receipt: r.mpesaRef, date: r.paidDate || '', status: r.status, category: 'renewal' });
  }
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

const relationLabels: Record<string, string> = {
  MEMBER: 'Self (Member)',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SPOUSE_PARENT: "Spouse's Parent",
};

interface MemberDetailDialogProps {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}

export function MemberDetailDialog({ memberId, open, onClose }: MemberDetailDialogProps) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchMember = useCallback(async () => {
    if (!memberId || !open) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/members/${memberId}`);
      const data = await r.json();
      setMember(data.member || null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [memberId, open]);

  useEffect(() => {
    if (!memberId || !open) return;
    fetchMember();
  }, [fetchMember, memberId, open]);

  useEffect(() => {
    if (!open) { setMember(null); setActiveTab('overview'); }
  }, [open]);

  const transactions = member ? buildTransactions(member) : [];
  const status = member ? statusConfig[member.status] || statusConfig.ACTIVE : null;
  const StatusIcon = status?.icon || Shield;

  const totalPaid = member
    ? member.contributions.reduce((s, c) => s + Number(c.amount), 0) +
      member.caseContributions.reduce((s, cc) => s + Number(cc.paidAmount), 0) +
      member.annualRenewals.reduce((s, r) => s + Number(r.amount), 0)
    : 0;

  const getPaymentTrend = () => {
    if (!member) return 'neutral';
    const lastThreeMonths = member.contributions
      .filter(c => {
        const date = new Date(c.paidDate);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return date >= threeMonthsAgo;
      })
      .length;
    return lastThreeMonths >= 2 ? 'good' : lastThreeMonths >= 1 ? 'average' : 'poor';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl" aria-describedby={undefined}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-32"
            >
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Loading member details...</p>
              </div>
            </motion.div>
          ) : member ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header with Gradient Background */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="relative p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-bold text-white">
                            {member.firstName[0]}{member.lastName[0]}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
                      </motion.div>

                      <div className="space-y-1">
                        <DialogTitle className="text-xl font-bold tracking-tight">
                          {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''}{member.lastName}
                        </DialogTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] font-mono bg-black/5">
                            <Fingerprint className="h-3 w-3 mr-1" />
                            SMW-{String(member.welfareNo || '---').padStart(3, '0')}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] bg-black/5">
                            <Church className="h-3 w-3 mr-1" />
                            {member.churchMembershipNo}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] bg-black/5">
                            <Building2 className="h-3 w-3 mr-1" />
                            {member.district?.name}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`${status?.bg} ${status?.text} rounded-full px-3 py-1.5 border ${status?.border} flex items-center gap-2 shadow-sm`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{status?.label}</span>
                    </motion.div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Wallet</p>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(Number(member.walletBalance))}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-4 w-4 text-blue-600" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getPaymentTrend() === 'good' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : getPaymentTrend() === 'poor' ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-amber-600" />
                        )}
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trend</p>
                      </div>
                      <p className="text-sm font-semibold capitalize">
                        {getPaymentTrend() === 'good' ? 'Excellent' : getPaymentTrend() === 'average' ? 'Stable' : 'Needs Attn'}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>

              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/50 p-1 rounded-xl">
                    {[
                      { value: 'overview', icon: User, label: 'Profile' },
                      { value: 'transactions', icon: Receipt, label: 'Payments' },
                      { value: 'family', icon: Heart, label: 'Family & Cases' }
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <ScrollArea className="max-h-[60vh]">
                  <div className="px-6 pb-6 pt-4">

                    {/* PROFILE TAB */}
                    <TabsContent value="overview" className="mt-0 space-y-5">
                      {member.status === 'SUSPENDED' && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"
                        >
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-900">Member Suspended</p>
                            {member.suspendedUntil && (
                              <p className="text-xs text-red-700 mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>
                            )}
                            {member.consecutiveArrears > 0 && (
                              <p className="text-xs text-red-700 mt-0.5">{member.consecutiveArrears} consecutive months in arrears</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Contact */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                        </div>
                        <div className="grid gap-2 pl-8">
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{member.phone}</span>
                          </div>
                          {member.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{member.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                      {/* Church */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Church className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Church Membership</h3>
                        </div>
                        <div className="grid gap-2 pl-8">
                          <DetailItem icon={Calendar} label="Joined Welfare" value={formatDate(member.dateJoinedWelfare)} />
                          <DetailItem icon={Calendar} label="Church Member Since" value={formatDate(member.churchMembershipDate)} />
                          <DetailItem icon={Clock} label="Church Tenure" value={member.churchDurationYears ? `${member.churchDurationYears} years` : undefined} />
                          <DetailItem icon={Star} label="Member Type" value={member.isNewChurchMember ? 'New Member' : 'Existing Member'} highlight />
                        </div>
                      </div>

                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                      {/* Financial Standing */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financial Standing</h3>
                        </div>
                        <div className="grid gap-2 pl-8">
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground">Registration Fee</span>
                            <Badge className={Number(member.registrationFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {Number(member.registrationFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground">Joining Fee</span>
                            <Badge className={Number(member.joiningFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {Number(member.joiningFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground">Arrears Status</span>
                            <span className={`text-xs font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : member.consecutiveArrears >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                              {member.consecutiveArrears === 0 ? 'Good Standing' : `${member.consecutiveArrears} months missed`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      {transactions.length > 0 && (
                        <>
                          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Activity className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
                              </div>
                              <button
                                onClick={() => setActiveTab('transactions')}
                                className="text-xs text-primary hover:underline"
                              >
                                View all
                              </button>
                            </div>
                            <div className="space-y-2 pl-8">
                              {transactions.slice(0, 3).map((tx, idx) => (
                                <motion.div
                                  key={tx.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                  <div className="flex-1">
                                    <p className="text-xs font-medium">{tx.type}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatRelativeDate(tx.date)}</p>
                                  </div>
                                  <p className="text-xs font-bold">{formatCurrency(tx.amount)}</p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* PAYMENTS TAB */}
                    <TabsContent value="transactions" className="mt-0 space-y-5">
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-4 text-white"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-emerald-100 mb-1">Available Balance</p>
                            <p className="text-2xl font-bold">{formatCurrency(Number(member.walletBalance))}</p>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Wallet className="h-6 w-6" />
                          </div>
                        </div>
                      </motion.div>

                      {member.walletTransactions.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            Wallet Activity
                          </h3>
                          <div className="space-y-2">
                            {member.walletTransactions.slice(0, 5).map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex-1">
                                  <p className="text-xs font-medium">{tx.description}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</p>
                                </div>
                                <span className={`text-xs font-bold ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          Payment History
                        </h3>
                        {transactions.length === 0 ? (
                          <div className="text-center py-12 bg-muted/20 rounded-xl">
                            <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No transactions recorded</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {transactions.map((tx, idx) => (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between py-3 px-3 rounded-lg border hover:shadow-sm transition-all"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px]">
                                      {tx.category === 'contribution' ? 'Monthly Dues' : tx.category === 'case' ? 'Bereavement' : 'Annual Renewal'}
                                    </Badge>
                                    <span className="text-xs font-medium">{tx.type}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDate(tx.date)}
                                    {tx.receipt && <span className="ml-2 font-mono"> {tx.receipt}</span>}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{formatCurrency(tx.amount)}</p>
                                  <Badge className={`text-[10px] mt-1 ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {tx.status}
                                  </Badge>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* FAMILY & CASES TAB */}
                    <TabsContent value="family" className="mt-0 space-y-5">
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          Family Members
                        </h3>
                        <div className="grid gap-2">
                          {[
                            { name: member.spouseName, alive: member.spouseAlive, role: 'Spouse', icon: Heart, color: 'text-pink-500' },
                            { name: member.fatherName, alive: member.fatherAlive, role: 'Father', icon: User, color: 'text-blue-500' },
                            { name: member.motherName, alive: member.motherAlive, role: 'Mother', icon: User, color: 'text-purple-500' },
                          ].map((fam) => (
                            fam.name ? (
                              <div key={fam.role} className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${fam.color.replace('text', 'from')}/10 to-transparent flex items-center justify-center`}>
                                    <fam.icon className={`h-4 w-4 ${fam.color}`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{fam.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{fam.role}</p>
                                  </div>
                                </div>
                                {fam.alive === true && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                                    <CheckCircle className="h-3 w-3 mr-1" />Alive
                                  </Badge>
                                )}
                                {fam.alive === false && (
                                  <Badge className="bg-red-100 text-red-700 text-[10px]">
                                    <Heart className="h-3 w-3 mr-1" />Deceased
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div key={fam.role} className="py-2 px-3 rounded-lg border border-dashed text-center">
                                <p className="text-[11px] text-muted-foreground">No {fam.role.toLowerCase()} information provided</p>
                              </div>
                            )
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                      {/* Next of Kin */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          Next of Kin
                        </h3>
                        {member.nextOfKinName ? (
                          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{member.nextOfKinName}</p>
                                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                  {member.nextOfKinRelationship && <span>{member.nextOfKinRelationship}</span>}
                                  {member.nextOfKinPhone && (
                                    <span className="flex items-center gap-1">
                                      <Smartphone className="h-3 w-3" />{member.nextOfKinPhone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 px-4 rounded-lg border border-dashed text-center">
                            <p className="text-sm text-muted-foreground">No next of kin information available</p>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                      {/* Bereavement Cases */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            Bereavement Cases
                          </h3>
                          {member.caseContributions.filter(cc => cc.status === 'PENDING').length > 0 && (
                            <Badge className="bg-red-100 text-red-700">
                              {member.caseContributions.filter(cc => cc.status === 'PENDING').length} Active
                            </Badge>
                          )}
                        </div>
                        {member.bereavementCases.length === 0 ? (
                          <div className="text-center py-12 bg-muted/20 rounded-xl">
                            <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No bereavement cases recorded</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {member.bereavementCases.map((c) => (
                              <div key={c.id} className="p-4 rounded-xl border hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="font-semibold text-sm">{c.deceasedName}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {relationLabels[c.deceasedRelationship] || c.deceasedRelationship}
                                      <span className="mx-1">·</span>
                                      {formatDate(c.createdAt)}
                                    </p>
                                  </div>
                                  <Badge className={`${c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {c.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-4 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Benefit Amount</p>
                                    <p className="font-bold text-emerald-600">{formatCurrency(c.benefitAmount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Collected</p>
                                    <p className="font-bold">{formatCurrency(c.totalCollected)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* My Contributions */}
                      {member.caseContributions.length > 0 && (
                        <>
                          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                              <div className="w-1 h-4 bg-primary rounded-full" />
                              My Contributions to Cases
                            </h3>
                            <div className="space-y-2">
                              {member.caseContributions.map((cc) => (
                                <div key={cc.id} className="flex items-center justify-between py-2 px-3 rounded-lg border">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium">{cc.case?.deceasedName}</p>
                                    <p className="text-[10px] text-muted-foreground">Expected: {formatCurrency(cc.expectedAmount)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold">{cc.paidAmount > 0 ? formatCurrency(cc.paidAmount) : '\u2014'}</p>
                                    <Badge className={`text-[10px] mt-1 ${cc.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : cc.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                                      {cc.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                  </div>
                </ScrollArea>
              </Tabs>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Member not found</p>
              <p className="text-xs text-muted-foreground mt-1">The member may have been removed or does not exist</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string | undefined; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-32">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-primary font-semibold' : ''}`}>{value || '\u2014'}</span>
    </div>
  );
}
