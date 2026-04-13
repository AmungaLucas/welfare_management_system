'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Phone, Mail, Calendar, Church, Users, Shield,
  Wallet, Heart, AlertTriangle, CheckCircle, XCircle, Receipt,
  User, Clock, Activity, MapPin,
  ShieldCheck, Smartphone, TrendingUp, TrendingDown,
  Award, Star, Building2, ChevronRight,
} from 'lucide-react';

/* ── Types ── */

interface ContributionRecord {
  id: string; year: number; month: number; amount: number;
  paymentMethod: string; mpesaRef: string | null; paidDate: string; status: string;
}
interface CaseContributionRecord {
  id: string; expectedAmount: number; paidAmount: number; status: string;
  paymentMethod: string; mpesaRef: string | null; paidDate: string | null;
  createdAt: string;
  case: { id: string; deceasedName: string; deceasedRelationship: string; status: string; createdAt: string };
}
interface RenewalRecord {
  id: string; year: number; amount: number; status: string;
  paidDate: string | null; paymentMethod: string | null; mpesaRef: string | null;
}
interface WalletTransactionRecord {
  id: string; type: string; amount: number; balanceBefore: number;
  balanceAfter: number; description: string; createdAt: string;
}
interface BereavementCaseRecord {
  id: string; deceasedName: string; deceasedRelationship: string; status: string;
  benefitAmount: number; totalCollected: number; createdAt: string;
  caseContributions: { status: string }[];
}
interface MemberDetail {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  phone: string; email: string | null; churchMembershipNo: string; status: string;
  consecutiveArrears: number; totalDefaultEvents: number; walletBalance: number;
  joiningFeePaid: number; registrationFeePaid: number; dateJoinedWelfare: string | null;
  churchMembershipDate: string | null; churchDurationYears: number | null;
  isNewChurchMember: boolean; suspendedUntil: string | null; removedFromRegister: boolean;
  spouseName: string | null; spouseAlive: boolean | null;
  fatherName: string | null; fatherAlive: boolean | null;
  motherName: string | null; motherAlive: boolean | null;
  nextOfKinName: string | null; nextOfKinPhone: string | null; nextOfKinRelationship: string | null;
  district: { id: number; name: string };
  user: { id: string; email: string; isActive: boolean } | null;
  contributions: ContributionRecord[];
  caseContributions: CaseContributionRecord[];
  annualRenewals: RenewalRecord[];
  walletTransactions: WalletTransactionRecord[];
  bereavementCases: BereavementCaseRecord[];
}

/* ── Config ── */

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: typeof Shield; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Active' },
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock, label: 'Pending' },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle, label: 'Suspended' },
  REMOVED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'Removed' },
};

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── Helpers ── */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatCurrency(amount: number): string {
  return `Ksh ${Number(amount).toLocaleString()}`;
}

interface TransactionRow {
  id: string; type: string; amount: number; receipt: string | null;
  date: string; status: string; category: 'contribution' | 'case' | 'renewal';
}
function buildTransactions(member: MemberDetail): TransactionRow[] {
  const rows: TransactionRow[] = [];
  for (const c of member.contributions)
    rows.push({ id: c.id, type: `Monthly (${monthNames[c.month]} ${c.year})`, amount: Number(c.amount), receipt: c.mpesaRef, date: c.paidDate, status: c.status, category: 'contribution' });
  for (const cc of member.caseContributions)
    rows.push({ id: cc.id, type: `Bereavement (${cc.case?.deceasedName || ''})`, amount: Number(cc.paidAmount), receipt: cc.mpesaRef, date: cc.paidDate || cc.createdAt, status: cc.status, category: 'case' });
  for (const r of member.annualRenewals)
    rows.push({ id: r.id, type: `Renewal (${r.year})`, amount: Number(r.amount), receipt: r.mpesaRef, date: r.paidDate || '', status: r.status, category: 'renewal' });
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

const relationLabels: Record<string, string> = {
  MEMBER: 'Self', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SPOUSE_PARENT: "Spouse's Parent",
};

/* ── Component ── */

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
    } catch { setMember(null); }
    finally { setLoading(false); }
  }, [memberId, open]);

  useEffect(() => { if (memberId && open) fetchMember(); }, [fetchMember, memberId, open]);
  useEffect(() => { if (!open) setMember(null); }, [open]);

  if (!open) return null;

  const transactions = member ? buildTransactions(member) : [];
  const status = member ? statusConfig[member.status] || statusConfig.ACTIVE : null;
  const StatusIcon = status?.icon || Shield;

  const totalPaid = member
    ? member.contributions.reduce((s, c) => s + Number(c.amount), 0) +
      member.caseContributions.reduce((s, cc) => s + Number(cc.paidAmount), 0) +
      member.annualRenewals.reduce((s, r) => s + Number(r.amount), 0)
    : 0;

  const getTrend = () => {
    if (!member) return 'neutral';
    const recent = member.contributions.filter(c => {
      const d = new Date(c.paidDate);
      const ago = new Date(); ago.setMonth(ago.getMonth() - 3);
      return d >= ago;
    }).length;
    return recent >= 2 ? 'good' : recent >= 1 ? 'average' : 'poor';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border shadow-2xl" aria-describedby={undefined}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-32">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </motion.div>
          ) : member ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* ── Header ── */}
              <div className="relative p-5 pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />

                <div className="relative flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md shrink-0">
                    <span className="text-lg font-bold text-white">{member.firstName[0]}{member.lastName[0]}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold truncate">
                        {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''}{member.lastName}
                      </h2>
                      <Badge className={`${status?.bg} ${status?.text} border ${status?.border} px-2 py-0.5 text-[10px] font-semibold gap-1 shrink-0`}>
                        <StatusIcon className="h-3 w-3" />
                        {status?.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{member.churchMembershipNo} &middot; {member.district?.name}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="relative grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Wallet', value: formatCurrency(Number(member.walletBalance)), icon: Wallet, color: 'text-teal-600' },
                    { label: 'Total Paid', value: formatCurrency(totalPaid), icon: Receipt, color: 'text-blue-600' },
                    { label: 'Trend', value: getTrend() === 'good' ? 'Excellent' : getTrend() === 'average' ? 'Stable' : 'Low', icon: getTrend() === 'good' ? TrendingUp : getTrend() === 'poor' ? TrendingDown : Activity, color: getTrend() === 'good' ? 'text-emerald-600' : getTrend() === 'poor' ? 'text-red-600' : 'text-amber-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-muted/50 rounded-lg p-2.5">
                      <s.icon className={`h-3.5 w-3.5 ${s.color} mb-1`} />
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      <p className="text-xs font-bold truncate">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Scrollable Body ── */}
              <ScrollArea className="max-h-[65vh]">
                <div className="px-5 pb-5">

                  {/* Suspended Alert */}
                  {member.status === 'SUSPENDED' && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 mb-4">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-700">
                        <p className="font-semibold">Member Suspended</p>
                        {member.suspendedUntil && <p className="mt-0.5">Until: {formatDate(member.suspendedUntil)}</p>}
                        {member.consecutiveArrears > 0 && <p className="mt-0.5">{member.consecutiveArrears} months in arrears</p>}
                      </div>
                    </div>
                  )}

                  {/* ── Contact ── */}
                  <Section title="Contact">
                    <Row icon={Phone} value={member.phone} />
                    {member.email && <Row icon={Mail} value={member.email} muted />}
                  </Section>

                  {/* ── Church & Welfare ── */}
                  <Section title="Church & Welfare">
                    <Row icon={Church} label="Reg. No." value={member.churchMembershipNo} mono />
                    <Row icon={MapPin} label="District" value={member.district?.name} />
                    <Row icon={Clock} label="Church Tenure" value={member.churchDurationYears ? `${member.churchDurationYears} years` : undefined} />
                    <Row icon={Calendar} label="Joined Welfare" value={formatDate(member.dateJoinedWelfare)} />
                    <Row icon={Calendar} label="Church Member Since" value={formatDate(member.churchMembershipDate)} />
                    <Row icon={Star} label="Member Type" value={member.isNewChurchMember ? 'New Member' : 'Existing'} highlight />
                  </Section>

                  {/* ── Fees & Standing ── */}
                  <Section title="Fees & Standing">
                    <FeeRow label="Registration Fee" paid={Number(member.registrationFeePaid) > 0} />
                    <FeeRow label="Joining Fee" paid={Number(member.joiningFeePaid) > 0} />
                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Arrears</span>
                      <span className={`text-xs font-bold ${member.consecutiveArrears === 0 ? 'text-emerald-700' : member.consecutiveArrears >= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                        {member.consecutiveArrears === 0 ? 'Good Standing' : `${member.consecutiveArrears} months`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Default Events</span>
                      <span className={`text-xs font-bold ${member.totalDefaultEvents === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {member.totalDefaultEvents}
                      </span>
                    </div>
                  </Section>

                  {/* ── Account ── */}
                  {member.user && (
                    <Section title="Account">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30">
                        <span className="text-[11px] text-muted-foreground font-mono truncate mr-2">{member.user.email}</span>
                        <Badge variant={member.user.isActive ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                          {member.user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </Section>
                  )}

                  {/* ── Recent Transactions ── */}
                  {transactions.length > 0 && (
                    <Section title={`Recent Transactions (${transactions.length})`}>
                      {transactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-xs font-medium truncate">{tx.type}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                          </div>
                          <p className="text-xs font-bold shrink-0">{formatCurrency(tx.amount)}</p>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* ── Family ── */}
                  <Section title="Family">
                    {[
                      { name: member.spouseName, alive: member.spouseAlive, role: 'Spouse', icon: Heart },
                      { name: member.fatherName, alive: member.fatherAlive, role: 'Father', icon: User },
                      { name: member.motherName, alive: member.motherAlive, role: 'Mother', icon: User },
                    ].map((fam) =>
                      fam.name ? (
                        <div key={fam.role} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <fam.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{fam.name}</p>
                              <p className="text-[10px] text-muted-foreground">{fam.role}</p>
                            </div>
                          </div>
                          {fam.alive === true && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Alive</Badge>}
                          {fam.alive === false && <Badge className="bg-red-50 text-red-700 text-[10px]">Deceased</Badge>}
                        </div>
                      ) : (
                        <p key={fam.role} className="text-[11px] text-muted-foreground py-1">No {fam.role.toLowerCase()} info</p>
                      )
                    )}
                  </Section>

                  {/* ── Next of Kin ── */}
                  <Section title="Next of Kin">
                    {member.nextOfKinName ? (
                      <div className="py-1">
                        <p className="text-xs font-medium">{member.nextOfKinName}</p>
                        <div className="flex gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          {member.nextOfKinRelationship && <span>{member.nextOfKinRelationship}</span>}
                          {member.nextOfKinPhone && <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" />{member.nextOfKinPhone}</span>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Not provided</p>
                    )}
                  </Section>

                  {/* ── Bereavement Cases ── */}
                  <Section title={`Bereavement Cases (${member.bereavementCases.length})`}>
                    {member.bereavementCases.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No cases recorded</p>
                    ) : (
                      member.bereavementCases.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg border space-y-1.5">
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-semibold truncate">{c.deceasedName}</p>
                            <Badge className={`text-[10px] shrink-0 ml-2 ${c.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700' : c.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}>
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {relationLabels[c.deceasedRelationship] || c.deceasedRelationship} &middot; {formatDate(c.createdAt)}
                          </p>
                          <div className="flex gap-3 text-[10px]">
                            <span className="text-muted-foreground">Benefit: <strong className="text-emerald-700">{formatCurrency(c.benefitAmount)}</strong></span>
                            <span className="text-muted-foreground">Collected: <strong>{formatCurrency(c.totalCollected)}</strong></span>
                          </div>
                        </div>
                      ))
                    )}
                  </Section>

                  {/* ── Case Contributions ── */}
                  {member.caseContributions.length > 0 && (
                    <Section title="My Case Contributions">
                      {member.caseContributions.map((cc) => (
                        <div key={cc.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-xs font-medium truncate">{cc.case?.deceasedName}</p>
                            <p className="text-[10px] text-muted-foreground">Expected: {formatCurrency(cc.expectedAmount)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold">{Number(cc.paidAmount) > 0 ? formatCurrency(cc.paidAmount) : '\u2014'}</p>
                            <Badge className={`text-[10px] mt-0.5 ${cc.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : cc.status === 'EXEMPTED' ? 'bg-gray-50 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>
                              {cc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* ── Wallet Activity ── */}
                  {member.walletTransactions.length > 0 && (
                    <Section title="Wallet Activity">
                      {member.walletTransactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-xs font-medium truncate">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.type} &middot; {formatDate(tx.createdAt)}</p>
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.type === 'CREDIT' ? '+' : '\u2212'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </Section>
                  )}

                </div>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Member not found</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-3.5 bg-primary/60 rounded-full" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, muted, mono, highlight }: {
  icon: React.ElementType; label?: string; value: string | undefined; muted?: boolean; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {label && <span className="text-[11px] text-muted-foreground shrink-0 w-24">{label}</span>}
      <span className={`text-xs flex-1 truncate ${muted ? 'text-muted-foreground' : 'font-medium'} ${mono ? 'font-mono' : ''} ${highlight ? 'text-primary' : ''}`}>
        {value || '\u2014'}
      </span>
    </div>
  );
}

function FeeRow({ label, paid }: { label: string; paid: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge className={`text-[10px] ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
        {paid ? 'Paid' : 'Unpaid'}
      </Badge>
    </div>
  );
}
