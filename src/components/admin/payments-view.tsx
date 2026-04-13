'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign, Plus, Loader2, Users, CheckCircle, CircleDashed,
} from 'lucide-react';
import { toast } from 'sonner';

import { ContributionsTable } from './contributions-table';
import { RenewalsView } from './renewals-view';
import { BereavementCases } from './bereavement-cases';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberFeeRow {
  id: string;
  firstName: string;
  lastName: string;
  churchMembershipNo: string;
  district: { name: string };
  isNewChurchMember: boolean;
  feePaid: number;
  status: string;
}

interface FeeSettings {
  joiningFeeNewMember: number;
  joiningFeeOldMember: number;
  registrationFee: number;
}

// ─── Shared: Fee Table Component ────────────────────────────────────────────

function FeeTableView({
  feeType,
}: {
  feeType: 'joining' | 'registration';
}) {
  const [members, setMembers] = useState<MemberFeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<FeeSettings>({
    joiningFeeNewMember: 2600,
    joiningFeeOldMember: 5000,
    registrationFee: 200,
  });

  // Record dialog state
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; firstName: string; lastName: string; churchMembershipNo: string; isNewChurchMember: boolean; [key: string]: unknown }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(typeof searchResults)[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amount, setAmount] = useState('');

  const isJoining = feeType === 'joining';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch('/api/members?limit=200&status=ACTIVE'),
        fetch('/api/settings'),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();

      const s = sData.settings;
      setSettings({
        joiningFeeNewMember: Number(s.joiningFeeNewMember) || 2600,
        joiningFeeOldMember: Number(s.joiningFeeOldMember) || 5000,
        registrationFee: Number(s.registrationFee) || 200,
      });

      const rows: MemberFeeRow[] = (mData.members || []).map((m: {
        id: string;
        firstName: string;
        lastName: string;
        churchMembershipNo: string;
        district: { name: string };
        isNewChurchMember: boolean;
        status: string;
        joiningFeePaid: number | string;
        registrationFeePaid: number | string;
      }) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        churchMembershipNo: m.churchMembershipNo,
        district: m.district,
        isNewChurchMember: m.isNewChurchMember,
        feePaid: Number(isJoining ? m.joiningFeePaid : m.registrationFeePaid),
        status: m.status,
      }));
      setMembers(rows);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [feeType]);

  // Summary calculations
  const expectedFee = (m: MemberFeeRow) => {
    if (isJoining) {
      return m.isNewChurchMember ? settings.joiningFeeNewMember : settings.joiningFeeOldMember;
    }
    return settings.registrationFee;
  };

  const membersPaid = members.filter((m) => m.feePaid > 0);
  const membersUnpaid = members.filter((m) => m.feePaid === 0);
  const totalCollected = members.reduce((sum, m) => sum + m.feePaid, 0);

  // Search for member to record fee
  const handleSearch = async () => {
    if (searchInput.trim().length < 1) {
      toast.error('Enter a membership number to search');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/members?search=${encodeURIComponent(searchInput)}&limit=5&status=ACTIVE`,
      );
      const data = await res.json();
      setSearchResults(data.members || []);
      if ((data.members || []).length === 0) {
        toast.error('No member found');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMember = (member: (typeof searchResults)[0]) => {
    setSelectedMember(member);
    const expected = isJoining
      ? member.isNewChurchMember
        ? settings.joiningFeeNewMember
        : settings.joiningFeeOldMember
      : settings.registrationFee;
    setAmount(String(expected));
  };

  const handleRecordFee = async () => {
    if (!selectedMember) {
      toast.error('Select a member first');
      return;
    }
    const feeAmount = parseFloat(amount);
    if (isNaN(feeAmount) || feeAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const currentPaid = Number(
        isJoining
          ? (selectedMember as Record<string, unknown>).joiningFeePaid || 0
          : (selectedMember as Record<string, unknown>).registrationFeePaid || 0,
      );
      const newTotal = currentPaid + feeAmount;

      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isJoining ? 'joiningFeePaid' : 'registrationFeePaid']: newTotal,
        }),
      });

      if (res.ok) {
        toast.success(
          `${isJoining ? 'Joining' : 'Registration'} fee of Ksh ${feeAmount.toLocaleString()} recorded for ${selectedMember.firstName} ${selectedMember.lastName}`,
        );
        setShowRecordDialog(false);
        resetDialog();
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to record fee');
      }
    } catch {
      toast.error('Failed to record fee');
    } finally {
      setSubmitting(false);
    }
  };

  const resetDialog = () => {
    setSearchInput('');
    setSearchResults([]);
    setSelectedMember(null);
    setAmount('');
    setPaymentMethod('CASH');
    setSearching(false);
  };

  const feeLabel = isJoining ? 'Joining Fee' : 'Registration Fee';
  const feeLabelLower = isJoining ? 'joining fee' : 'registration fee';

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Total Collected
            </div>
            <p className="text-lg font-bold mt-1">
              Ksh {totalCollected.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              Members Paid
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {membersPaid.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleDashed className="h-3.5 w-3.5 text-amber-600" />
              Members Unpaid
            </div>
            <p className="text-lg font-bold text-amber-700 mt-1">
              {membersUnpaid.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Total Active
            </div>
            <p className="text-lg font-bold mt-1">{members.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isJoining
              ? `New members pay Ksh ${settings.joiningFeeNewMember.toLocaleString()}, old members Ksh ${settings.joiningFeeOldMember.toLocaleString()}`
              : `Standard fee: Ksh ${settings.registrationFee.toLocaleString()} per member`}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-navy-900 hover:bg-navy-800"
          onClick={() => setShowRecordDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Record {feeLabel}
        </Button>
      </div>

      {/* Record Fee Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowRecordDialog(open); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Record {feeLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Search by Membership No</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="ACK/UTW/BTH/001"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={searching}
                  onClick={handleSearch}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && !selectedMember && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/80 border-b border-border last:border-0 transition-colors"
                    onClick={() => handleSelectMember(m)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {m.firstName} {m.lastName}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {m.churchMembershipNo}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isJoining
                        ? m.isNewChurchMember
                          ? 'New Member'
                          : 'Old Member'
                        : 'Active Member'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Member */}
            {selectedMember && (
              <div className="p-3 bg-muted/50 rounded-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedMember.churchMembershipNo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setSearchResults([]);
                      setAmount('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
                {isJoining && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Member type:{' '}
                    <span className="font-medium">
                      {selectedMember.isNewChurchMember
                        ? `New (Ksh ${settings.joiningFeeNewMember.toLocaleString()})`
                        : `Old (Ksh ${settings.joiningFeeOldMember.toLocaleString()})`}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (Ksh)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!selectedMember}
                />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v || 'CASH')}
                >
                  <SelectTrigger disabled={!selectedMember}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MPESA">M-Pesa</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetDialog(); setShowRecordDialog(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-navy-900 hover:bg-navy-800"
              disabled={submitting || !selectedMember}
              onClick={handleRecordFee}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Record {feeLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">
                    Membership No
                  </TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">
                    District
                  </TableHead>
                  {isJoining && (
                    <TableHead className="text-xs hidden sm:table-cell">
                      Type
                    </TableHead>
                  )}
                  <TableHead className="text-xs">Expected</TableHead>
                  <TableHead className="text-xs">Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(isJoining ? 7 : 6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isJoining ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No active members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => {
                    const expected = expectedFee(m);
                    const paid = m.feePaid;
                    const isPaidInFull = paid >= expected;
                    const isPartiallyPaid = paid > 0 && paid < expected;

                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground md:hidden">
                            {m.churchMembershipNo}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono">
                          {m.churchMembershipNo}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {m.district?.name}
                        </TableCell>
                        {isJoining && (
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant="outline"
                              className={
                                m.isNewChurchMember
                                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]'
                                  : 'text-navy-900 border-navy-200 bg-navy-50 text-[10px]'
                              }
                            >
                              {m.isNewChurchMember ? 'New' : 'Old'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          Ksh {expected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          Ksh {paid.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isPaidInFull ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                              PAID
                            </Badge>
                          ) : isPartiallyPaid ? (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                              PARTIAL
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                              UNPAID
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main PaymentsView Component ─────────────────────────────────────────────

export function PaymentsView() {
  const [activeTab, setActiveTab] = useState('contributions');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="mb-2 w-full flex">
            <TabsTrigger value="contributions" className="flex-1 min-w-0 text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Contributions
            </TabsTrigger>
            <TabsTrigger value="renewals" className="flex-1 min-w-0 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Renewals
            </TabsTrigger>
            <TabsTrigger value="joining-fees" className="flex-1 min-w-0 text-xs sm:text-sm">
              <CheckCircle className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Joining Fees
            </TabsTrigger>
            <TabsTrigger value="registration-fees" className="flex-1 min-w-0 text-xs sm:text-sm">
              <CircleDashed className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Registration
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex-1 min-w-0 text-xs sm:text-sm">
              Cases
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="contributions">
          <ContributionsTable />
        </TabsContent>

        <TabsContent value="renewals">
          <RenewalsView />
        </TabsContent>

        <TabsContent value="joining-fees">
          <FeeTableView feeType="joining" />
        </TabsContent>

        <TabsContent value="registration-fees">
          <FeeTableView feeType="registration" />
        </TabsContent>

        <TabsContent value="cases">
          <BereavementCases />
        </TabsContent>
      </Tabs>
    </div>
  );
}
