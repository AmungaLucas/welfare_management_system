'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Wallet, Heart, AlertTriangle, CheckCircle, XCircle, Receipt,
  User, MapPin, Clock, ChevronRight,
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

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  REMOVED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
}

function getInitials(first: string, last: string): string {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-navy-800', 'bg-teal-700', 'bg-emerald-700', 'bg-blue-700',
    'bg-violet-700', 'bg-rose-700', 'bg-amber-700', 'bg-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Build a unified recent transactions list from all payment types
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

  // Monthly contributions
  for (const c of member.contributions) {
    rows.push({
      id: c.id,
      type: `Monthly (${monthNames[c.month]} ${c.year})`,
      amount: Number(c.amount),
      receipt: c.mpesaRef,
      date: c.paidDate,
      status: c.status,
    });
  }

  // Case contributions (bereavement)
  for (const cc of member.caseContributions) {
    rows.push({
      id: cc.id,
      type: `Bereavement (${cc.case?.deceasedName || ''})`,
      amount: Number(cc.paidAmount),
      receipt: cc.mpesaRef,
      date: cc.paidDate || cc.createdAt,
      status: cc.status,
    });
  }

  // Annual renewals
  for (const r of member.annualRenewals) {
    rows.push({
      id: r.id,
      type: `Renewal (${r.year})`,
      amount: Number(r.amount),
      receipt: r.mpesaRef,
      date: r.paidDate || '',
      status: r.status,
    });
  }

  // Sort by date descending
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

  // Reset when dialog closes
  useEffect(() => {
    if (!open) setMember(null);
  }, [open]);

  const transactions = member ? buildTransactions(member) : [];

  // Stats calculations
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
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0" aria-describedby={undefined}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Loading member details...</span>
          </div>
        ) : member ? (
          <>
            {/* ── HEADER ── */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${getAvatarColor(member.firstName + member.lastName)}`}>
                  {getInitials(member.firstName, member.lastName)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <DialogTitle className="text-xl font-bold leading-tight">
                        {member.firstName}{member.otherNames ? ` ${member.otherNames}` : ''} {member.lastName}
                      </DialogTitle>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          SMW-{String(member.welfareNo || '---').padStart(3, '0')}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {member.churchMembershipNo}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{member.district?.name}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${statusColors[member.status] || ''} text-xs px-3 py-1 border shrink-0`}>
                      {member.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Suspended Alert */}
              {member.status === 'SUSPENDED' && (
                <div className="flex items-start gap-2 p-3 mt-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Member is Suspended</p>
                    {member.suspendedUntil && (
                      <p className="text-xs mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>
                    )}
                    {member.consecutiveArrears > 0 && (
                      <p className="text-xs mt-0.5">{member.consecutiveArrears} consecutive arrears</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Wallet className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                  <p className={`text-sm font-bold ${Number(member.walletBalance) > 0 ? 'text-teal-700' : 'text-muted-foreground'}`}>
                    {formatCurrency(Number(member.walletBalance))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Wallet</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Receipt className="h-4 w-4 text-navy-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-navy-800">
                    {formatCurrency(totalContributions)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Contributions</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Heart className="h-4 w-4 text-red-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-red-700">
                    {formatCurrency(totalCasePaid)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Case Contributions</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <p className={`text-sm font-bold ${member.consecutiveArrears > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {member.consecutiveArrears}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Arrears</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── TABS ── */}
            <Tabs defaultValue="overview" className="w-full">
              <div className="px-6 pt-3">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1 text-xs">
                    <User className="h-3 w-3 mr-1" />Overview
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex-1 text-xs">
                    <Receipt className="h-3 w-3 mr-1" />Transactions
                  </TabsTrigger>
                  <TabsTrigger value="family" className="flex-1 text-xs">
                    <Heart className="h-3 w-3 mr-1" />Family
                  </TabsTrigger>
                  <TabsTrigger value="cases" className="flex-1 text-xs">
                    <Users className="h-3 w-3 mr-1" />Cases
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="max-h-[45vh]">
                <div className="px-6 pb-6 pt-3">
                  {/* ── OVERVIEW TAB ── */}
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-5">
                      {/* Contact Information */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{member.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{member.email || '\u2014'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Church & Welfare */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Church &amp; Welfare</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <Church className="h-3 w-3" />Church Reg. No.
                            </div>
                            <p className="text-sm font-mono font-medium">{member.churchMembershipNo}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3" />District
                            </div>
                            <p className="text-sm font-medium">{member.district?.name}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />Church Years
                            </div>
                            <p className="text-sm font-medium">{member.churchDurationYears ? `${member.churchDurationYears} years` : '\u2014'}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />Join Date
                            </div>
                            <p className="text-sm font-medium">{formatDate(member.dateJoinedWelfare)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />Church Member Since
                            </div>
                            <p className="text-sm font-medium">{formatDate(member.churchMembershipDate)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                              <User className="h-3 w-3" />Member Type
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {member.isNewChurchMember ? 'New Church Member' : 'Existing Church Member'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Fees & Arrears */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fees &amp; Standing</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className={`p-3 rounded-lg border text-center ${Number(member.registrationFeePaid) > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                            <CheckCircle className={`h-4 w-4 mx-auto mb-1 ${Number(member.registrationFeePaid) > 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                            <p className="text-xs font-medium">Registration Fee</p>
                            <Badge className={`text-[10px] mt-1 ${Number(member.registrationFeePaid) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {Number(member.registrationFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          <div className={`p-3 rounded-lg border text-center ${Number(member.joiningFeePaid) > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                            <CheckCircle className={`h-4 w-4 mx-auto mb-1 ${Number(member.joiningFeePaid) > 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                            <p className="text-xs font-medium">Joining Fee</p>
                            <Badge className={`text-[10px] mt-1 ${Number(member.joiningFeePaid) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {Number(member.joiningFeePaid) > 0 ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          <div className={`p-3 rounded-lg border text-center ${member.consecutiveArrears === 0 ? 'border-emerald-200 bg-emerald-50' : member.consecutiveArrears >= 3 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                            <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${member.consecutiveArrears === 0 ? 'text-emerald-600' : member.consecutiveArrears >= 3 ? 'text-red-500' : 'text-amber-500'}`} />
                            <p className="text-xs font-medium">Arrears</p>
                            <p className={`text-sm font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : member.consecutiveArrears >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                              {member.consecutiveArrears} missed
                            </p>
                          </div>
                          <div className={`p-3 rounded-lg border text-center ${member.totalDefaultEvents === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                            <Shield className={`h-4 w-4 mx-auto mb-1 ${member.totalDefaultEvents === 0 ? 'text-emerald-600' : 'text-amber-500'}`} />
                            <p className="text-xs font-medium">Default Events</p>
                            <p className={`text-sm font-bold ${member.totalDefaultEvents === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {member.totalDefaultEvents}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Account Info */}
                      {member.user && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 rounded-lg bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">Login Email</p>
                              <p className="text-sm font-mono font-medium">{member.user.email}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">Account Status</p>
                              <Badge variant={member.user.isActive ? 'default' : 'destructive'} className="text-[10px]">
                                {member.user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── TRANSACTIONS TAB ── */}
                  <TabsContent value="transactions" className="mt-0">
                    <div className="space-y-4">
                      {/* Wallet Section */}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg border border-teal-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-teal-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-teal-800">Wallet Balance</p>
                            <p className="text-xs text-teal-600">Available funds</p>
                          </div>
                        </div>
                        <span className={`text-xl font-bold ${Number(member.walletBalance) > 0 ? 'text-teal-700' : 'text-muted-foreground'}`}>
                          {formatCurrency(Number(member.walletBalance))}
                        </span>
                      </div>

                      {/* Wallet Transactions */}
                      {member.walletTransactions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Wallet Activity</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                                <TableHead className="text-xs text-right hidden sm:table-cell">Balance</TableHead>
                                <TableHead className="text-xs text-right">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {member.walletTransactions.slice(0, 5).map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-xs py-2">
                                    <p className="font-medium">{tx.description}</p>
                                    <p className="text-[10px] text-muted-foreground">{tx.type}</p>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium py-2">
                                    <span className={tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}>
                                      {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-muted-foreground hidden sm:table-cell py-2">
                                    {formatCurrency(tx.balanceAfter)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-muted-foreground py-2">
                                    {formatDate(tx.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <Separator />

                      {/* All Transactions */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h4>
                        {transactions.length === 0 ? (
                          <div className="text-center py-8">
                            <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">No transactions recorded</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                                <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                                <TableHead className="text-xs hidden sm:table-cell">Receipt</TableHead>
                                <TableHead className="text-xs text-right">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.slice(0, 15).map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-xs py-2 max-w-[180px]">
                                    <span className="truncate block">{tx.type}</span>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium py-2">
                                    {formatCurrency(tx.amount)}
                                  </TableCell>
                                  <TableCell className="text-xs hidden sm:table-cell py-2">
                                    <Badge className={
                                      tx.status === 'COMPLETED' || tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 text-[10px]' :
                                      'bg-amber-100 text-amber-800 text-[10px]'
                                    }>
                                      {tx.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono hidden sm:table-cell py-2 text-muted-foreground">
                                    {tx.receipt || '\u2014'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-muted-foreground py-2">
                                    {tx.date ? formatDate(tx.date) : '\u2014'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── FAMILY TAB ── */}
                  <TabsContent value="family" className="mt-0">
                    <div className="space-y-5">
                      {/* Family Members */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Family Members</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {member.spouseName ? (
                            <div className="p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
                                    <Heart className="h-4 w-4 text-pink-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{member.spouseName}</p>
                                    <p className="text-[10px] text-muted-foreground">Spouse</p>
                                  </div>
                                </div>
                                {member.spouseAlive === false && (
                                  <Badge className="bg-red-100 text-red-800 text-[10px]">Deceased</Badge>
                                )}
                                {member.spouseAlive === true && (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Alive</Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-dashed bg-muted/10">
                              <p className="text-xs text-muted-foreground text-center">No spouse information</p>
                            </div>
                          )}

                          {member.fatherName ? (
                            <div className="p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{member.fatherName}</p>
                                    <p className="text-[10px] text-muted-foreground">Father</p>
                                  </div>
                                </div>
                                {member.fatherAlive === false && (
                                  <Badge className="bg-red-100 text-red-800 text-[10px]">Deceased</Badge>
                                )}
                                {member.fatherAlive === true && (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Alive</Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-dashed bg-muted/10">
                              <p className="text-xs text-muted-foreground text-center">No father information</p>
                            </div>
                          )}

                          {member.motherName ? (
                            <div className="p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-violet-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{member.motherName}</p>
                                    <p className="text-[10px] text-muted-foreground">Mother</p>
                                  </div>
                                </div>
                                {member.motherAlive === false && (
                                  <Badge className="bg-red-100 text-red-800 text-[10px]">Deceased</Badge>
                                )}
                                {member.motherAlive === true && (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Alive</Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-dashed bg-muted/10">
                              <p className="text-xs text-muted-foreground text-center">No mother information</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Next of Kin */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Next of Kin</h4>
                        {member.nextOfKinName ? (
                          <div className="p-4 rounded-lg border bg-muted/20">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-navy-700" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{member.nextOfKinName}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {member.nextOfKinRelationship && (
                                    <Badge variant="outline" className="text-[10px]">{member.nextOfKinRelationship}</Badge>
                                  )}
                                  {member.nextOfKinPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />{member.nextOfKinPhone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg border border-dashed bg-muted/10">
                            <p className="text-xs text-muted-foreground text-center">No next of kin information provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── CASES TAB ── */}
                  <TabsContent value="cases" className="mt-0">
                    <div className="space-y-4">
                      {/* Active Cases Summary */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <Heart className="h-4 w-4 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">
                          <span className="font-semibold">{activeCasesCount}</span> active case{activeCasesCount !== 1 ? 's' : ''} requiring payment
                        </p>
                      </div>

                      {/* Bereavement Cases */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bereavement Cases</h4>
                        {member.bereavementCases.length === 0 ? (
                          <div className="text-center py-8">
                            <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">No bereavement cases</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {member.bereavementCases.map((c) => (
                              <div key={c.id} className="p-3 rounded-lg border bg-muted/20">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{c.deceasedName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {relationLabels[c.deceasedRelationship] || c.deceasedRelationship}
                                      {c.dateOfDeath && <span className="ml-2">Died: {formatDate(c.dateOfDeath)}</span>}
                                    </p>
                                  </div>
                                  <Badge className={
                                    c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                                    c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {c.status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Benefit:</span>
                                    <span className="font-medium ml-1">{formatCurrency(c.benefitAmount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Collected:</span>
                                    <span className="font-medium ml-1">{formatCurrency(c.totalCollected)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Category:</span>
                                    <span className="font-medium ml-1">{c.category === 'NUCLEAR_FAMILY' ? 'Nuclear' : 'Parent'}</span>
                                  </div>
                                </div>
                                {/* Mini progress */}
                                <div className="mt-2">
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(100, c.totalExpected > 0 && c.contributionPerMember > 0 ? (Number(c.totalCollected) / (Number(c.contributionPerMember) * c.totalExpected)) * 100 : 0)}%`,
                                        backgroundColor: Number(c.totalCollected) >= Number(c.benefitAmount) ? '#10b981' : '#1e3a5f',
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Case Contributions */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Case Contributions</h4>
                        {member.caseContributions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No case contributions</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Case</TableHead>
                                <TableHead className="text-xs text-right">Expected</TableHead>
                                <TableHead className="text-xs text-right">Paid</TableHead>
                                <TableHead className="text-xs text-right">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {member.caseContributions.map((cc) => (
                                <TableRow key={cc.id}>
                                  <TableCell className="text-xs py-2">
                                    <p className="font-medium">{cc.case?.deceasedName}</p>
                                    <p className="text-[10px] text-muted-foreground">{relationLabels[cc.case?.deceasedRelationship] || cc.case?.deceasedRelationship}</p>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-2">{formatCurrency(cc.expectedAmount)}</TableCell>
                                  <TableCell className="text-xs text-right font-medium py-2">
                                    {Number(cc.paidAmount) > 0 ? formatCurrency(cc.paidAmount) : '\u2014'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-2">
                                    <Badge className={
                                      cc.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 text-[10px]' :
                                      cc.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-800 text-[10px]' :
                                      'bg-amber-100 text-amber-800 text-[10px]'
                                    }>
                                      {cc.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="py-16 text-center">
            <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Member not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
