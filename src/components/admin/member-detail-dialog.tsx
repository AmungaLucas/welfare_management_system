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
import {
  Loader2, Phone, Mail, Calendar, Church, Users, Shield,
  Wallet, Heart, AlertTriangle, CheckCircle, XCircle, Receipt,
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

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REMOVED: 'bg-gray-100 text-gray-800',
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh]" aria-describedby={undefined}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading member details...</span>
          </div>
        ) : member ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-lg">
                    {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''}{member.lastName}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {member.welfareNo ? `SMW-${String(member.welfareNo).padStart(3, '0')}` : '—'}
                    {' | '}Church Reg: {member.churchMembershipNo}
                  </p>
                </div>
                <Badge className={`${statusColors[member.status] || ''} text-xs px-3 py-1`}>
                  {member.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-5">
                {/* Status Alerts */}
                {member.status === 'SUSPENDED' && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
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

                {/* Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InfoItem icon={<Church className="h-3.5 w-3.5" />} label="Church Reg. No." value={member.churchMembershipNo} />
                  <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Church Years" value={member.churchDurationYears ? `${member.churchDurationYears} years` : '—'} />
                  <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={member.email || '—'} />
                  <InfoItem icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={member.phone} />
                  <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Join Date" value={formatDate(member.dateJoinedWelfare)} />
                  <InfoItem icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Arrears" value={member.consecutiveArrears > 0 ? `${member.consecutiveArrears} missed` : 'None'} highlight={member.consecutiveArrears > 0} />
                  <InfoItem icon={<CheckCircle className="h-3.5 w-3.5" />} label="Registration Paid" value={Number(member.registrationFeePaid) > 0 ? 'Yes' : 'No'} highlight={Number(member.registrationFeePaid) <= 0} />
                  <InfoItem icon={<CheckCircle className="h-3.5 w-3.5" />} label="Joining Fee Paid" value={Number(member.joiningFeePaid) > 0 ? 'Yes' : 'No'} highlight={Number(member.joiningFeePaid) <= 0} />
                </div>

                <Separator />

                {/* Wallet */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Wallet Balance</span>
                  </div>
                  <span className={`text-lg font-bold ${Number(member.walletBalance) > 0 ? 'text-teal-700' : 'text-muted-foreground'}`}>
                    {formatCurrency(Number(member.walletBalance))}
                  </span>
                </div>

                <Separator />

                {/* Recent Transactions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="h-4 w-4 text-navy-700" />
                    <h3 className="text-sm font-semibold text-navy-900">Recent Transactions</h3>
                  </div>

                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions recorded</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Receipt</TableHead>
                          <TableHead className="text-xs text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 10).map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs py-2 max-w-[160px]">
                              <span className="truncate block">{tx.type}</span>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium py-2">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-xs font-mono hidden sm:table-cell py-2">
                              {tx.receipt || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground py-2">
                              {tx.date ? formatDate(tx.date) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Family & Next of Kin */}
                {(member.spouseName || member.fatherName || member.motherName || member.nextOfKinName) && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-4 w-4 text-navy-700" />
                        <h3 className="text-sm font-semibold text-navy-900">Family & Next of Kin</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {member.spouseName && (
                          <div>
                            <span className="text-xs text-muted-foreground">Spouse</span>
                            <p className="font-medium">{member.spouseName} {member.spouseAlive === false ? <span className="text-red-500 text-xs">(Deceased)</span> : null}</p>
                          </div>
                        )}
                        {member.fatherName && (
                          <div>
                            <span className="text-xs text-muted-foreground">Father</span>
                            <p className="font-medium">{member.fatherName} {member.fatherAlive === false ? <span className="text-red-500 text-xs">(Deceased)</span> : null}</p>
                          </div>
                        )}
                        {member.motherName && (
                          <div>
                            <span className="text-xs text-muted-foreground">Mother</span>
                            <p className="font-medium">{member.motherName} {member.motherAlive === false ? <span className="text-red-500 text-xs">(Deceased)</span> : null}</p>
                          </div>
                        )}
                        {member.nextOfKinName && (
                          <div>
                            <span className="text-xs text-muted-foreground">Next of Kin</span>
                            <p className="font-medium">{member.nextOfKinName}</p>
                            <p className="text-xs text-muted-foreground">{member.nextOfKinRelationship} {member.nextOfKinPhone ? `• ${member.nextOfKinPhone}` : ''}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="py-10 text-center text-muted-foreground">Member not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-amber-700' : ''}`}>
        {value}
      </p>
    </div>
  );
}
