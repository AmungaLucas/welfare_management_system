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
  User, MapPin, Clock, Landmark, UserCheck, Ban,
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

/* ─── Info Pill ─── */

function InfoPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl bg-muted/50 border min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
      <span className="text-xs font-semibold text-center leading-snug truncate w-full">{value || '—'}</span>
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
      <DialogContent className="sm:max-w-[520px] max-w-[calc(100vw-2rem)] max-h-[88vh] p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Loading member details...</span>
          </div>
        ) : member ? (
          <>
            {/* ═══ HERO HEADER ═══ */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-5 pb-6 text-white">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${getAvatarGradient(member.firstName + member.lastName)} flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0`}>
                  {getInitials(member.firstName, member.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-bold leading-tight truncate">
                    {member.firstName}{member.otherNames ? ` ${member.otherNames}` : ''} {member.lastName}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono text-white/60">
                      SMW-{String(member.welfareNo || '---').padStart(3, '0')}
                    </span>
                    <span className="text-white/30">|</span>
                    <span className="text-xs font-mono text-white/60 truncate">
                      {member.churchMembershipNo}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig[member.status]?.bg} ${statusConfig[member.status]?.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[member.status]?.dot}`} />
                      {member.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet strip */}
              <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  <span className="text-xs text-white/70">Wallet Balance</span>
                </div>
                <span className="text-base font-bold text-emerald-300">
                  {formatCurrency(Number(member.walletBalance))}
                </span>
              </div>
            </div>

            {/* ═══ SCROLLABLE BODY ═══ */}
            <ScrollArea className="max-h-[60vh]">
              <div className="p-5 space-y-5">
                {/* Suspended Alert */}
                {member.status === 'SUSPENDED' && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-lg border border-red-200">
                    <Ban className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Member is Suspended</p>
                      {member.suspendedUntil && <p className="text-xs mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>}
                      {member.consecutiveArrears > 0 && <p className="text-xs mt-0.5">{member.consecutiveArrears} consecutive arrears</p>}
                    </div>
                  </div>
                )}

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-sm font-bold text-blue-800">{formatCurrency(totalContributions)}</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Contributions</p>
                  </div>
                  <div className="text-center py-3 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-sm font-bold text-rose-800">{formatCurrency(totalCasePaid)}</p>
                    <p className="text-[10px] text-rose-600 mt-0.5">Case Paid</p>
                  </div>
                  <div className={`text-center py-3 rounded-xl border ${member.consecutiveArrears === 0 ? 'bg-emerald-50 border-emerald-100' : member.consecutiveArrears >= 3 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className={`text-sm font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-800' : member.consecutiveArrears >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                      {member.consecutiveArrears}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${member.consecutiveArrears === 0 ? 'text-emerald-600' : member.consecutiveArrears >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                      Arrears
                    </p>
                  </div>
                </div>

                {/* ─── TABS ─── */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 h-9">
                    <TabsTrigger value="overview" className="text-xs gap-1">
                      <User className="h-3 w-3" />Profile
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="text-xs gap-1">
                      <Receipt className="h-3 w-3" />Payments
                    </TabsTrigger>
                    <TabsTrigger value="family" className="text-xs gap-1">
                      <Heart className="h-3 w-3" />Family &amp; Cases
                    </TabsTrigger>
                  </TabsList>

                  {/* ═══ PROFILE TAB ═══ */}
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    {/* Contact */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{member.phone}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{member.email}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <InfoPill icon={Landmark} label="District" value={member.district?.name} />
                      <InfoPill icon={Clock} label="Church Years" value={member.churchDurationYears ? `${member.churchDurationYears} yrs` : undefined} />
                      <InfoPill icon={Calendar} label="Joined Welfare" value={formatDate(member.dateJoinedWelfare)} />
                      <InfoPill icon={Calendar} label="Church Member" value={formatDate(member.churchMembershipDate)} />
                      <InfoPill icon={UserCheck} label="Member Type" value={member.isNewChurchMember ? 'New' : 'Existing'} />
                      <InfoPill icon={Church} label="Church Reg." value={member.churchMembershipNo} />
                    </div>

                    <Separator />

                    {/* Fees */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fees &amp; Standing</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Registration</span>
                          <Badge className={`text-[10px] ${Number(member.registrationFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(member.registrationFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Joining Fee</span>
                          <Badge className={`text-[10px] ${Number(member.joiningFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(member.joiningFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Arrears</span>
                          <span className={`text-xs font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {member.consecutiveArrears} missed
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Defaults</span>
                          <span className={`text-xs font-bold ${member.totalDefaultEvents === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {member.totalDefaultEvents}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account */}
                    {member.user && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
                          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <span className="text-xs text-muted-foreground">{member.user.email}</span>
                            <Badge variant={member.user.isActive ? 'default' : 'destructive'} className="text-[10px]">
                              {member.user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Recent Transactions */}
                    {transactions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Transactions</p>
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-[11px] h-8">Type</TableHead>
                                  <TableHead className="text-[11px] h-8 text-right">Amount</TableHead>
                                  <TableHead className="text-[11px] h-8 text-right">Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactions.slice(0, 5).map((tx) => (
                                  <TableRow key={tx.id}>
                                    <TableCell className="text-xs py-2">{tx.type}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold py-2">{formatCurrency(tx.amount)}</TableCell>
                                    <TableCell className="text-xs text-right text-muted-foreground py-2">{tx.date ? formatDate(tx.date) : '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* ═══ PAYMENTS TAB ═══ */}
                  <TabsContent value="transactions" className="mt-4 space-y-5">
                    {/* Wallet */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-teal-100">Wallet Balance</p>
                          <p className="text-xl font-bold">{formatCurrency(Number(member.walletBalance))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Activity */}
                    {member.walletTransactions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Wallet Activity</p>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-[11px] h-8">Description</TableHead>
                                <TableHead className="text-[11px] h-8 text-right">Amount</TableHead>
                                <TableHead className="text-[11px] h-8 text-right">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {member.walletTransactions.slice(0, 10).map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="py-2">
                                    <p className="text-xs font-medium">{tx.description}</p>
                                    <p className="text-[10px] text-muted-foreground">{tx.type}</p>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-semibold py-2">
                                    <span className={tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}>
                                      {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-muted-foreground py-2">
                                    {formatDate(tx.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {member.walletTransactions.length > 0 && <Separator />}

                    {/* Payment History */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</p>
                      {transactions.length === 0 ? (
                        <div className="text-center py-8 rounded-lg border border-dashed">
                          <Receipt className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No transactions recorded</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-[11px] h-8">Type</TableHead>
                                <TableHead className="text-[11px] h-8 text-right">Amount</TableHead>
                                <TableHead className="text-[11px] h-8">Status</TableHead>
                                <TableHead className="text-[11px] h-8 text-right">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.slice(0, 20).map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-xs py-2 max-w-[160px]"><span className="truncate block">{tx.type}</span></TableCell>
                                  <TableCell className="text-xs text-right font-semibold py-2">{formatCurrency(tx.amount)}</TableCell>
                                  <TableCell className="py-2">
                                    <Badge className={tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                                      {tx.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-muted-foreground py-2">{tx.date ? formatDate(tx.date) : '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ═══ FAMILY & CASES TAB ═══ */}
                  <TabsContent value="family" className="mt-4 space-y-5">
                    {/* Family Members */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Family Members</p>
                      {[
                        { name: member.spouseName, alive: member.spouseAlive, role: 'Spouse', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', Icon: Heart },
                        { name: member.fatherName, alive: member.fatherAlive, role: 'Father', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', Icon: User },
                        { name: member.motherName, alive: member.motherAlive, role: 'Mother', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', Icon: User },
                      ].map((fam) =>
                        fam.name ? (
                          <div key={fam.role} className={`flex items-center justify-between p-3 rounded-lg border ${fam.bg} ${fam.border}`}>
                            <div className="flex items-center gap-3">
                              <fam.Icon className={`h-4 w-4 ${fam.color}`} />
                              <div>
                                <p className="text-sm font-semibold">{fam.name}</p>
                                <p className="text-[11px] text-muted-foreground">{fam.role}</p>
                              </div>
                            </div>
                            {fam.alive === true && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Alive</Badge>}
                            {fam.alive === false && <Badge className="bg-red-100 text-red-700 text-[10px]">Deceased</Badge>}
                          </div>
                        ) : (
                          <div key={fam.role} className="p-3 rounded-lg border border-dashed text-center">
                            <p className="text-xs text-muted-foreground">No {fam.role.toLowerCase()} info</p>
                          </div>
                        )
                      )}
                    </div>

                    <Separator />

                    {/* Next of Kin */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next of Kin</p>
                      {member.nextOfKinName ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{member.nextOfKinName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {member.nextOfKinRelationship && <Badge variant="outline" className="text-[10px]">{member.nextOfKinRelationship}</Badge>}
                              {member.nextOfKinPhone && <span className="text-xs text-muted-foreground">{member.nextOfKinPhone}</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border border-dashed text-center">
                          <p className="text-xs text-muted-foreground">No next of kin provided</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Cases */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bereavement Cases</p>
                        {activeCasesCount > 0 && (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">{activeCasesCount} active</Badge>
                        )}
                      </div>
                      {member.bereavementCases.length === 0 ? (
                        <div className="text-center py-6 rounded-lg border border-dashed">
                          <Heart className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No bereavement cases</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {member.bereavementCases.map((c) => (
                            <div key={c.id} className="p-3 rounded-lg border space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-semibold">{c.deceasedName}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {relationLabels[c.deceasedRelationship] || c.deceasedRelationship}
                                    {c.dateOfDeath && <span className="ml-1.5">| {formatDate(c.dateOfDeath)}</span>}
                                  </p>
                                </div>
                                <Badge className={c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                                  {c.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="text-center py-1.5 rounded bg-muted/50 text-[10px]">
                                  <span className="text-muted-foreground block">Benefit</span>
                                  <span className="font-semibold">{formatCurrency(c.benefitAmount)}</span>
                                </div>
                                <div className="text-center py-1.5 rounded bg-muted/50 text-[10px]">
                                  <span className="text-muted-foreground block">Collected</span>
                                  <span className="font-semibold">{formatCurrency(c.totalCollected)}</span>
                                </div>
                                <div className="text-center py-1.5 rounded bg-muted/50 text-[10px]">
                                  <span className="text-muted-foreground block">Category</span>
                                  <span className="font-semibold">{c.category === 'NUCLEAR_FAMILY' ? 'Nuclear' : 'Parent'}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, c.totalExpected > 0 && c.contributionPerMember > 0 ? (Number(c.totalCollected) / (Number(c.contributionPerMember) * c.totalExpected)) * 100 : 0)}%`,
                                    backgroundColor: Number(c.totalCollected) >= Number(c.benefitAmount) ? '#10b981' : '#334155',
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Case Contributions */}
                    {member.caseContributions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Case Contributions</p>
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-[11px] h-8">Case</TableHead>
                                  <TableHead className="text-[11px] h-8 text-right">Expected</TableHead>
                                  <TableHead className="text-[11px] h-8 text-right">Paid</TableHead>
                                  <TableHead className="text-[11px] h-8 text-right">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {member.caseContributions.map((cc) => (
                                  <TableRow key={cc.id}>
                                    <TableCell className="py-2">
                                      <p className="text-xs font-medium">{cc.case?.deceasedName}</p>
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-2">{formatCurrency(cc.expectedAmount)}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold py-2">
                                      {Number(cc.paidAmount) > 0 ? formatCurrency(cc.paidAmount) : '—'}
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                      <Badge className={cc.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : cc.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-600 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                                        {cc.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </>
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
