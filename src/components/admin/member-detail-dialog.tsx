'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Phone, Mail, Calendar, Church, Users, Shield,
  Wallet, Heart, AlertTriangle, CheckCircle, Receipt,
  User, MapPin, Clock, Copy, Landmark, UserCheck, Ban,
  CircleDollarSign, HandCoins, FileText,
} from 'lucide-react';

/* ─── Types ─── */

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
  contributionPerMember: number;
  totalExpected: number;
  createdAt: string;
  dateOfDeath: string | null;
  dateOfBurial: string | null;
  category: string;
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

/* ─── Constants & Helpers ─── */

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  REMOVED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
}

function getInitials(first: string, last: string): string {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-teal-500 to-cyan-700',
    'from-emerald-600 to-green-700',
    'from-violet-600 to-purple-700',
    'from-rose-600 to-pink-700',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-blue-700',
    'from-fuchsia-600 to-pink-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

/* ─── Unified Transaction List ─── */

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  receipt: string | null;
  date: string;
  status: string;
}

function buildTransactions(member: MemberDetail): TransactionRow[] {
  const rows: TransactionRow[] = [];
  for (const c of member.contributions) {
    rows.push({ id: c.id, type: `Monthly (${monthNames[c.month]} ${c.year})`, amount: Number(c.amount), receipt: c.mpesaRef, date: c.paidDate, status: c.status });
  }
  for (const cc of member.caseContributions) {
    rows.push({ id: cc.id, type: `Bereavement (${cc.case?.deceasedName || ''})`, amount: Number(cc.paidAmount), receipt: cc.mpesaRef, date: cc.paidDate || cc.createdAt, status: cc.status });
  }
  for (const r of member.annualRenewals) {
    rows.push({ id: r.id, type: `Renewal (${r.year})`, amount: Number(r.amount), receipt: r.mpesaRef, date: r.paidDate || '', status: r.status });
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

/* ─── Sidebar Info Row ─── */

function InfoRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-sm font-medium leading-snug mt-0.5 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );
}

/* ─── Component ─── */

interface MemberDetailDialogProps {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}

export function MemberDetailDialog({ memberId, open, onClose }: MemberDetailDialogProps) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!open) setMember(null);
  }, [open]);

  const transactions = member ? buildTransactions(member) : [];

  const totalContributions = member
    ? member.contributions.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + Number(c.amount), 0)
    : 0;
  const totalCasePaid = member
    ? member.caseContributions.filter(cc => cc.status === 'PAID').reduce((s, cc) => s + Number(cc.paidAmount), 0)
    : 0;
  const activeCasesCount = member
    ? member.caseContributions.filter(cc => cc.status === 'PENDING').length
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[900px] max-h-[92vh] p-0 gap-0 overflow-hidden rounded-xl" aria-describedby={undefined}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Loading member details...</span>
          </div>
        ) : member ? (
          <div className="flex h-[92vh]">
            {/* ═══ LEFT SIDEBAR ═══ */}
            <div className="w-[280px] shrink-0 border-r bg-muted/30 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className={`h-20 w-20 rounded-full bg-gradient-to-br ${getAvatarGradient(member.firstName + member.lastName)} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                      {getInitials(member.firstName, member.lastName)}
                    </div>
                    <h3 className="text-base font-bold mt-3 leading-tight">
                      {member.firstName}{member.otherNames ? ` ${member.otherNames}` : ''} {member.lastName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      SMW-{String(member.welfareNo || '---').padStart(3, '0')}
                    </p>
                    {/* Status pill */}
                    <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[member.status]?.bg} ${statusConfig[member.status]?.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[member.status]?.dot}`} />
                      {member.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <Separator className="mb-4" />

                  {/* Wallet Card */}
                  <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-4 mb-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-teal-100" />
                      <span className="text-xs text-teal-100 font-medium">Wallet Balance</span>
                    </div>
                    <p className="text-xl font-bold tracking-tight">
                      {formatCurrency(Number(member.walletBalance))}
                    </p>
                    <p className="text-[10px] text-teal-200 mt-0.5">Available funds</p>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="bg-background rounded-lg p-3 text-center border">
                      <p className="text-sm font-bold text-blue-700">{formatCurrency(totalContributions)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Contributions</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 text-center border">
                      <p className="text-sm font-bold text-rose-700">{formatCurrency(totalCasePaid)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Case Paid</p>
                    </div>
                  </div>

                  <Separator className="mb-4" />

                  {/* Contact & Details */}
                  <div className="space-y-0.5">
                    <InfoRow icon={Phone} label="Phone" value={member.phone} />
                    <InfoRow icon={Mail} label="Email" value={member.email || undefined} />
                    <InfoRow icon={Landmark} label="District" value={member.district?.name} />
                    <InfoRow icon={Church} label="Church Reg." value={member.churchMembershipNo} mono />
                    <InfoRow icon={Clock} label="Church Years" value={member.churchDurationYears ? `${member.churchDurationYears} years` : undefined} />
                    <InfoRow icon={Calendar} label="Joined Welfare" value={formatDate(member.dateJoinedWelfare)} />
                    <InfoRow icon={Calendar} label="Church Member Since" value={formatDate(member.churchMembershipDate)} />
                    <InfoRow icon={UserCheck} label="Member Type" value={member.isNewChurchMember ? 'New Church Member' : 'Existing Member'} />
                  </div>

                  {/* Fees & Standing */}
                  <Separator className="my-4" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fees &amp; Standing</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Registration Fee</span>
                      <Badge className={`text-[10px] ${Number(member.registrationFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {Number(member.registrationFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Joining Fee</span>
                      <Badge className={`text-[10px] ${Number(member.joiningFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {Number(member.joiningFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Arrears</span>
                      <span className={`text-xs font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : member.consecutiveArrears >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                        {member.consecutiveArrears} missed
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Defaults</span>
                      <span className={`text-xs font-bold ${member.totalDefaultEvents === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {member.totalDefaultEvents}
                      </span>
                    </div>
                  </div>

                  {/* Account */}
                  {member.user && (
                    <>
                      <Separator className="my-4" />
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
                      <div className="space-y-0.5">
                        <InfoRow icon={Mail} label="Login Email" value={member.user.email} mono />
                        <div className="flex items-center justify-between py-2 pl-6">
                          <span className="text-[11px] text-muted-foreground">Status</span>
                          <Badge variant={member.user.isActive ? 'default' : 'destructive'} className="text-[10px]">
                            {member.user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* ═══ RIGHT CONTENT ═══ */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tab Bar */}
              <div className="px-5 pt-4 pb-3 border-b bg-background shrink-0">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="overview" className="text-xs gap-1.5">
                      <User className="h-3.5 w-3.5" />Overview
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="text-xs gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />Payments
                    </TabsTrigger>
                    <TabsTrigger value="family" className="text-xs gap-1.5">
                      <Heart className="h-3.5 w-3.5" />Family
                    </TabsTrigger>
                    <TabsTrigger value="cases" className="text-xs gap-1.5">
                      <Users className="h-3.5 w-3.5" />Cases
                    </TabsTrigger>
                  </TabsList>

                  {/* Suspended Banner */}
                  {member.status === 'SUSPENDED' && (
                    <div className="flex items-start gap-2.5 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <Ban className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-red-700">
                        <p className="font-medium">Member is Suspended</p>
                        {member.suspendedUntil && <p className="text-xs mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>}
                        {member.consecutiveArrears > 0 && <p className="text-xs mt-0.5">{member.consecutiveArrears} consecutive arrears</p>}
                      </div>
                    </div>
                  )}

                  <ScrollArea className="h-[calc(92vh-140px)] mt-4">
                    <div className="px-1 pb-6">

                      {/* ── OVERVIEW TAB ── */}
                      <TabsContent value="overview" className="mt-0">
                        <div className="space-y-6">
                          {/* Summary Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border p-4 bg-gradient-to-br from-blue-50 to-white">
                              <CircleDollarSign className="h-5 w-5 text-blue-600 mb-2" />
                              <p className="text-lg font-bold text-blue-800">{formatCurrency(totalContributions)}</p>
                              <p className="text-xs text-blue-600 mt-0.5">Total Contributions</p>
                            </div>
                            <div className="rounded-xl border p-4 bg-gradient-to-br from-rose-50 to-white">
                              <HandCoins className="h-5 w-5 text-rose-600 mb-2" />
                              <p className="text-lg font-bold text-rose-800">{formatCurrency(totalCasePaid)}</p>
                              <p className="text-xs text-rose-600 mt-0.5">Case Contributions</p>
                            </div>
                            <div className={`rounded-xl border p-4 ${member.consecutiveArrears === 0 ? 'bg-gradient-to-br from-emerald-50 to-white' : member.consecutiveArrears >= 3 ? 'bg-gradient-to-br from-red-50 to-white' : 'bg-gradient-to-br from-amber-50 to-white'}`}>
                              <AlertTriangle className={`h-5 w-5 mb-2 ${member.consecutiveArrears === 0 ? 'text-emerald-600' : member.consecutiveArrears >= 3 ? 'text-red-600' : 'text-amber-600'}`} />
                              <p className={`text-lg font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-800' : member.consecutiveArrears >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                                {member.consecutiveArrears}
                              </p>
                              <p className={`text-xs mt-0.5 ${member.consecutiveArrears === 0 ? 'text-emerald-600' : member.consecutiveArrears >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                                Consecutive Arrears
                              </p>
                            </div>
                          </div>

                          {/* Recent Transactions */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Recent Transactions
                            </h4>
                            {transactions.length === 0 ? (
                              <div className="text-center py-10 rounded-xl border border-dashed bg-muted/20">
                                <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No transactions yet</p>
                              </div>
                            ) : (
                              <div className="rounded-xl border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs">Type</TableHead>
                                      <TableHead className="text-xs text-right">Amount</TableHead>
                                      <TableHead className="text-xs text-right">Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {transactions.slice(0, 8).map((tx) => (
                                      <TableRow key={tx.id}>
                                        <TableCell className="text-sm py-2.5">{tx.type}</TableCell>
                                        <TableCell className="text-sm text-right font-semibold py-2.5">
                                          {formatCurrency(tx.amount)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-muted-foreground py-2.5">
                                          {tx.date ? formatDate(tx.date) : '—'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* ── TRANSACTIONS TAB ── */}
                      <TabsContent value="transactions" className="mt-0">
                        <div className="space-y-6">
                          {/* Wallet Balance Card */}
                          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl text-white">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Wallet className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-teal-100">Wallet Balance</p>
                                <p className="text-xs text-teal-200">Available funds</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold">
                              {formatCurrency(Number(member.walletBalance))}
                            </span>
                          </div>

                          {/* Wallet Activity */}
                          {member.walletTransactions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Wallet Activity</h4>
                              <div className="rounded-xl border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs">Description</TableHead>
                                      <TableHead className="text-xs text-right">Amount</TableHead>
                                      <TableHead className="text-xs text-right">Balance</TableHead>
                                      <TableHead className="text-xs text-right">Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {member.walletTransactions.slice(0, 10).map((tx) => (
                                      <TableRow key={tx.id}>
                                        <TableCell className="py-2.5">
                                          <p className="text-sm font-medium">{tx.description}</p>
                                          <p className="text-[11px] text-muted-foreground">{tx.type}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-right font-semibold py-2.5">
                                          <span className={tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-muted-foreground py-2.5">
                                          {formatCurrency(tx.balanceAfter)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-muted-foreground py-2.5">
                                          {formatDate(tx.createdAt)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Payment History */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Payment History</h4>
                            {transactions.length === 0 ? (
                              <div className="text-center py-10 rounded-xl border border-dashed bg-muted/20">
                                <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No transactions recorded</p>
                              </div>
                            ) : (
                              <div className="rounded-xl border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs">Type</TableHead>
                                      <TableHead className="text-xs text-right">Amount</TableHead>
                                      <TableHead className="text-xs">Status</TableHead>
                                      <TableHead className="text-xs">Receipt</TableHead>
                                      <TableHead className="text-xs text-right">Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {transactions.slice(0, 20).map((tx) => (
                                      <TableRow key={tx.id}>
                                        <TableCell className="text-sm py-2.5 max-w-[200px]">
                                          <span className="truncate block">{tx.type}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-right font-semibold py-2.5">
                                          {formatCurrency(tx.amount)}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                          <Badge className={
                                            tx.status === 'COMPLETED' || tx.status === 'PAID'
                                              ? 'bg-emerald-100 text-emerald-700 text-[10px]'
                                              : 'bg-amber-100 text-amber-700 text-[10px]'
                                          }>
                                            {tx.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono py-2.5 text-muted-foreground">
                                          {tx.receipt || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-muted-foreground py-2.5">
                                          {tx.date ? formatDate(tx.date) : '—'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* ── FAMILY TAB ── */}
                      <TabsContent value="family" className="mt-0">
                        <div className="space-y-6">
                          {/* Family Members */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              Family Members
                            </h4>
                            <div className="space-y-3">
                              {[
                                { name: member.spouseName, alive: member.spouseAlive, role: 'Spouse', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', Icon: Heart },
                                { name: member.fatherName, alive: member.fatherAlive, role: 'Father', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', Icon: User },
                                { name: member.motherName, alive: member.motherAlive, role: 'Mother', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', Icon: User },
                              ].map((fam) => (
                                fam.name ? (
                                  <div key={fam.role} className="flex items-center justify-between p-4 rounded-xl border bg-background">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-10 w-10 rounded-full ${fam.iconBg} flex items-center justify-center`}>
                                        <fam.Icon className={`h-4 w-4 ${fam.iconColor}`} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold">{fam.name}</p>
                                        <p className="text-xs text-muted-foreground">{fam.role}</p>
                                      </div>
                                    </div>
                                    {fam.alive === true && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Alive</Badge>}
                                    {fam.alive === false && <Badge className="bg-red-100 text-red-700 text-[10px]">Deceased</Badge>}
                                  </div>
                                ) : (
                                  <div key={fam.role} className="p-4 rounded-xl border border-dashed text-center">
                                    <p className="text-xs text-muted-foreground">No {fam.role.toLowerCase()} information</p>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Next of Kin */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              Next of Kin
                            </h4>
                            {member.nextOfKinName ? (
                              <div className="flex items-center gap-4 p-4 rounded-xl border bg-background">
                                <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center">
                                  <Shield className="h-5 w-5 text-slate-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">{member.nextOfKinName}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    {member.nextOfKinRelationship && (
                                      <Badge variant="outline" className="text-[10px]">{member.nextOfKinRelationship}</Badge>
                                    )}
                                    {member.nextOfKinPhone && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Phone className="h-3 w-3" />{member.nextOfKinPhone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl border border-dashed text-center">
                                <p className="text-xs text-muted-foreground">No next of kin information provided</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* ── CASES TAB ── */}
                      <TabsContent value="cases" className="mt-0">
                        <div className="space-y-6">
                          {/* Summary */}
                          <div className="flex items-center gap-3 p-4 rounded-xl border bg-red-50">
                            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm text-red-700">
                              <span className="font-bold">{activeCasesCount}</span> active case{activeCasesCount !== 1 ? 's' : ''} requiring payment
                            </p>
                          </div>

                          {/* Bereavement Cases */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              Bereavement Cases
                            </h4>
                            {member.bereavementCases.length === 0 ? (
                              <div className="text-center py-10 rounded-xl border border-dashed bg-muted/20">
                                <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No bereavement cases</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {member.bereavementCases.map((c) => (
                                  <div key={c.id} className="p-4 rounded-xl border bg-background">
                                    <div className="flex items-start justify-between mb-3">
                                      <div>
                                        <p className="text-sm font-semibold">{c.deceasedName}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {relationLabels[c.deceasedRelationship] || c.deceasedRelationship}
                                          {c.dateOfDeath && <span className="ml-2">Died: {formatDate(c.dateOfDeath)}</span>}
                                        </p>
                                      </div>
                                      <Badge className={
                                        c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' :
                                        c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-gray-100 text-gray-600'
                                      }>
                                        {c.status.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                      <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <p className="text-[10px] text-muted-foreground">Benefit</p>
                                        <p className="text-sm font-semibold">{formatCurrency(c.benefitAmount)}</p>
                                      </div>
                                      <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <p className="text-[10px] text-muted-foreground">Collected</p>
                                        <p className="text-sm font-semibold">{formatCurrency(c.totalCollected)}</p>
                                      </div>
                                      <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <p className="text-[10px] text-muted-foreground">Category</p>
                                        <p className="text-sm font-semibold">{c.category === 'NUCLEAR_FAMILY' ? 'Nuclear' : 'Parent'}</p>
                                      </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${Math.min(100, c.totalExpected > 0 && c.contributionPerMember > 0 ? (Number(c.totalCollected) / (Number(c.contributionPerMember) * c.totalExpected)) * 100 : 0)}%`,
                                          backgroundColor: Number(c.totalCollected) >= Number(c.benefitAmount) ? '#10b981' : '#1e3a5f',
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Case Contributions */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <HandCoins className="h-4 w-4 text-muted-foreground" />
                              My Case Contributions
                            </h4>
                            {member.caseContributions.length === 0 ? (
                              <div className="text-center py-8 rounded-xl border border-dashed bg-muted/20">
                                <p className="text-sm text-muted-foreground">No case contributions</p>
                              </div>
                            ) : (
                              <div className="rounded-xl border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs">Case</TableHead>
                                      <TableHead className="text-xs text-right">Expected</TableHead>
                                      <TableHead className="text-xs text-right">Paid</TableHead>
                                      <TableHead className="text-xs text-right">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {member.caseContributions.map((cc) => (
                                      <TableRow key={cc.id}>
                                        <TableCell className="py-2.5">
                                          <p className="text-sm font-medium">{cc.case?.deceasedName}</p>
                                          <p className="text-[11px] text-muted-foreground">{relationLabels[cc.case?.deceasedRelationship] || cc.case?.deceasedRelationship}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-right py-2.5">{formatCurrency(cc.expectedAmount)}</TableCell>
                                        <TableCell className="text-sm text-right font-semibold py-2.5">
                                          {Number(cc.paidAmount) > 0 ? formatCurrency(cc.paidAmount) : '—'}
                                        </TableCell>
                                        <TableCell className="py-2.5 text-right">
                                          <Badge className={
                                            cc.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                                            cc.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-600 text-[10px]' :
                                            'bg-amber-100 text-amber-700 text-[10px]'
                                          }>
                                            {cc.status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                    </div>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center">
            <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Member not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
