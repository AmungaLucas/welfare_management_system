'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck, Smartphone,
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

const statusColors: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
  REMOVED: { bg: 'bg-gray-50', text: 'text-gray-700', icon: XCircle },
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
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
  const statusInfo = member ? statusColors[member.status] || statusColors.ACTIVE : null;
  const StatusIcon = statusInfo?.icon || Shield;

  const totalPaid = member
    ? member.contributions.reduce((s, c) => s + Number(c.amount), 0) +
      member.caseContributions.reduce((s, cc) => s + Number(cc.paidAmount), 0) +
      member.annualRenewals.reduce((s, r) => s + Number(r.amount), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0" aria-describedby={undefined}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading member details...</p>
            </div>
          </div>
        ) : member ? (
          <>
            {/* Header */}
            <div className="p-5 pb-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shrink-0">
                    <span className="text-lg font-bold text-white">
                      {member.firstName[0]}{member.lastName[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-bold leading-tight truncate">
                      {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''}{member.lastName}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground">SMW-{String(member.welfareNo || '---').padStart(3, '0')}</span>
                      <span className="text-[11px] text-muted-foreground">{member.churchMembershipNo}</span>
                      <span className="text-[11px] text-muted-foreground">{member.district?.name}</span>
                    </div>
                  </div>
                </div>
                <Badge className={`${statusInfo?.bg} ${statusInfo?.text} border-0 px-2.5 py-1 text-[11px] font-semibold gap-1 shrink-0`}>
                  <StatusIcon className="h-3 w-3" />
                  {member.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-teal-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Wallet</p>
                    <p className="text-sm font-bold">{formatCurrency(Number(member.walletBalance))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Receipt className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Total Paid</p>
                    <p className="text-sm font-bold">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-5 pt-3">
                <TabsList className="w-full grid grid-cols-3 h-9">
                  <TabsTrigger value="overview" className="text-xs gap-1">
                    <User className="h-3 w-3" />Profile
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="text-xs gap-1">
                    <Receipt className="h-3 w-3" />Payments
                  </TabsTrigger>
                  <TabsTrigger value="family" className="text-xs gap-1">
                    <Heart className="h-3 w-3" />Family & Cases
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="max-h-[55vh]">
                <div className="px-5 pb-5 pt-3">

                  {/* ═══ PROFILE TAB ═══ */}
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    {/* Suspended Alert */}
                    {member.status === 'SUSPENDED' && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">
                          <p className="font-medium">Member is Suspended</p>
                          {member.suspendedUntil && <p className="text-xs mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>}
                          {member.consecutiveArrears > 0 && <p className="text-xs mt-0.5">{member.consecutiveArrears} consecutive arrears</p>}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{member.phone}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{member.email}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Church & Welfare Details */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Church &amp; Welfare</p>
                      <div className="space-y-2">
                        <DetailRow icon={Church} label="Church Reg." value={member.churchMembershipNo} mono />
                        <DetailRow icon={MapPin} label="District" value={member.district?.name} />
                        <DetailRow icon={Clock} label="Church Years" value={member.churchDurationYears ? `${member.churchDurationYears} years` : undefined} />
                        <DetailRow icon={Calendar} label="Joined Welfare" value={formatDate(member.dateJoinedWelfare)} />
                        <DetailRow icon={Calendar} label="Church Member Since" value={formatDate(member.churchMembershipDate)} />
                        <DetailRow icon={User} label="Member Type" value={member.isNewChurchMember ? 'New Church Member' : 'Existing Member'} />
                      </div>
                    </div>

                    <Separator />

                    {/* Fees & Standing */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fees &amp; Standing</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border">
                          <span className="text-xs text-muted-foreground">Registration Fee</span>
                          <Badge className={`text-[10px] ${Number(member.registrationFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(member.registrationFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border">
                          <span className="text-xs text-muted-foreground">Joining Fee</span>
                          <Badge className={`text-[10px] ${Number(member.joiningFeePaid) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(member.joiningFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border">
                          <span className="text-xs text-muted-foreground">Arrears</span>
                          <span className={`text-xs font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : member.consecutiveArrears >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                            {member.consecutiveArrears} missed
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border">
                          <span className="text-xs text-muted-foreground">Default Events</span>
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
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
                          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border">
                            <span className="text-xs text-muted-foreground font-mono">{member.user.email}</span>
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
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</p>
                          {transactions.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="text-xs font-medium truncate">{tx.type}</p>
                                <p className="text-[11px] text-muted-foreground">{tx.date ? formatDate(tx.date) : '\u2014'}</p>
                              </div>
                              <p className="text-xs font-bold shrink-0">{formatCurrency(tx.amount)}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* ═══ PAYMENTS TAB ═══ */}
                  <TabsContent value="transactions" className="mt-0 space-y-4">
                    {/* Wallet */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-teal-100">Wallet Balance</p>
                          <p className="text-lg font-bold">{formatCurrency(Number(member.walletBalance))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Activity */}
                    {member.walletTransactions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Wallet Activity</p>
                        {member.walletTransactions.slice(0, 5).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-xs font-medium truncate">{tx.description}</p>
                              <p className="text-[11px] text-muted-foreground">{tx.type} &middot; {formatDate(tx.createdAt)}</p>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {tx.type === 'CREDIT' ? '+' : '\u2212'}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {member.walletTransactions.length > 0 && <Separator />}

                    {/* Payment History */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                      {transactions.length === 0 ? (
                        <div className="text-center py-8">
                          <Receipt className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No transactions recorded</p>
                        </div>
                      ) : (
                        transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                            <div className="min-w-0 flex-1 mr-3">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {tx.category === 'contribution' ? 'Monthly' : tx.category === 'case' ? 'Bereavement' : 'Renewal'}
                                </Badge>
                                <span className="text-xs font-medium truncate">{tx.type}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{tx.date ? formatDate(tx.date) : '\u2014'}{tx.receipt ? ` \u00B7 ${tx.receipt}` : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold">{formatCurrency(tx.amount)}</p>
                              <Badge className={`text-[10px] mt-0.5 ${tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* ═══ FAMILY & CASES TAB ═══ */}
                  <TabsContent value="family" className="mt-0 space-y-4">
                    {/* Family Members */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Family Members</p>
                      {[
                        { name: member.spouseName, alive: member.spouseAlive, role: 'Spouse', color: 'text-pink-600', Icon: Heart },
                        { name: member.fatherName, alive: member.fatherAlive, role: 'Father', color: 'text-blue-600', Icon: User },
                        { name: member.motherName, alive: member.motherAlive, role: 'Mother', color: 'text-violet-600', Icon: User },
                      ].map((fam) =>
                        fam.name ? (
                          <div key={fam.role} className="flex items-center justify-between py-2.5 px-3 rounded-lg border">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <fam.Icon className={`h-4 w-4 ${fam.color} shrink-0`} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{fam.name}</p>
                                <p className="text-[11px] text-muted-foreground">{fam.role}</p>
                              </div>
                            </div>
                            {fam.alive === true && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">Alive</Badge>}
                            {fam.alive === false && <Badge className="bg-red-100 text-red-700 text-[10px] shrink-0">Deceased</Badge>}
                          </div>
                        ) : (
                          <div key={fam.role} className="py-2.5 px-3 rounded-lg border border-dashed text-center">
                            <p className="text-[11px] text-muted-foreground">No {fam.role.toLowerCase()} info</p>
                          </div>
                        )
                      )}
                    </div>

                    <Separator />

                    {/* Next of Kin */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next of Kin</p>
                      {member.nextOfKinName ? (
                        <div className="py-2.5 px-3 rounded-lg border space-y-1">
                          <div className="flex items-center gap-2.5">
                            <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                            <p className="text-sm font-medium truncate">{member.nextOfKinName}</p>
                          </div>
                          <div className="flex items-center gap-3 pl-6 text-[11px] text-muted-foreground">
                            {member.nextOfKinRelationship && <span>{member.nextOfKinRelationship}</span>}
                            {member.nextOfKinPhone && (
                              <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />{member.nextOfKinPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-2.5 px-3 rounded-lg border border-dashed text-center">
                          <p className="text-[11px] text-muted-foreground">No next of kin provided</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Bereavement Cases */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bereavement Cases</p>
                        {member.caseContributions.filter(cc => cc.status === 'PENDING').length > 0 && (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">
                            {member.caseContributions.filter(cc => cc.status === 'PENDING').length} active
                          </Badge>
                        )}
                      </div>
                      {member.bereavementCases.length === 0 ? (
                        <div className="text-center py-6">
                          <Heart className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No bereavement cases</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {member.bereavementCases.map((c) => (
                            <div key={c.id} className="p-3 rounded-lg border space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1 mr-2">
                                  <p className="text-xs font-semibold truncate">{c.deceasedName}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {relationLabels[c.deceasedRelationship] || c.deceasedRelationship}
                                    {c.createdAt && <span className="ml-1.5">&middot; {formatDate(c.createdAt)}</span>}
                                  </p>
                                </div>
                                <Badge className={`text-[10px] shrink-0 ${c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {c.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div className="flex gap-3 text-xs">
                                <span className="text-muted-foreground">Benefit: <strong>{formatCurrency(c.benefitAmount)}</strong></span>
                                <span className="text-muted-foreground">Collected: <strong>{formatCurrency(c.totalCollected)}</strong></span>
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
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">My Case Contributions</p>
                          {member.caseContributions.map((cc) => (
                            <div key={cc.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="text-xs font-medium truncate">{cc.case?.deceasedName}</p>
                                <p className="text-[11px] text-muted-foreground">Expected: {formatCurrency(cc.expectedAmount)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-bold">{Number(cc.paidAmount) > 0 ? formatCurrency(cc.paidAmount) : '\u2014'}</p>
                                <Badge className={`text-[10px] mt-0.5 ${cc.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : cc.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                                  {cc.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="py-20 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Member not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helper: Detail Row ─── */
function DetailRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value || '\u2014'}</span>
    </div>
  );
}
