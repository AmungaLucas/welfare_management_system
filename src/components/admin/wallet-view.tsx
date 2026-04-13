'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PiggyBank, ArrowUpDown, Plus, Search, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface MemberWallet {
  id: string;
  firstName: string;
  lastName: string;
  churchMembershipNo: string;
  district: { name: string };
  walletBalance: number;
  status: string;
}

interface MemberSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  churchMembershipNo: string;
  welfareNo: number | null;
  status: string;
  walletBalance: number | string;
}

export function WalletView() {
  const [wallets, setWallets] = useState<MemberWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'balance' | 'name'>('balance');

  // Credit dialog state
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  // Inline credit on table row
  const [inlineCreditId, setInlineCreditId] = useState<string | null>(null);
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  // Member search for dialog
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [creditMethod, setCreditMethod] = useState('CASH');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/members?limit=200');
      const data = await res.json();
      const members: MemberWallet[] = (data.members || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        churchMembershipNo: m.churchMembershipNo,
        district: m.district,
        walletBalance: Number(m.walletBalance || 0),
        status: m.status,
      }));
      setWallets(members);
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // Search members with debounce
  const searchMembers = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.members || []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchMembers(searchInput);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchInput, searchMembers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetDialog = () => {
    setSearchInput('');
    setSearchResults([]);
    setSelectedMember(null);
    setCreditAmount('');
    setCreditDescription('');
    setCreditMethod('CASH');
    setSearching(false);
    setShowDropdown(false);
  };

  const handleCreditWallet = async (memberId: string, amount: string, description: string) => {
    const creditAmt = parseFloat(amount);
    if (isNaN(creditAmt) || creditAmt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setCreditSubmitting(true);
    try {
      const res = await fetch('/api/wallets/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          amount: creditAmt,
          description: description || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        resetDialog();
        setShowCreditDialog(false);
        fetchWallets();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to credit wallet');
      }
    } catch {
      toast.error('Failed to credit wallet');
    } finally {
      setCreditSubmitting(false);
    }
  };

  const handleInlineCredit = async (wallet: MemberWallet) => {
    const amt = parseFloat(inlineAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (inlineSubmitting) return;
    setInlineSubmitting(true);
    try {
      const res = await fetch('/api/wallets/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: wallet.id,
          amount: amt,
          description: `Admin manual credit`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        setInlineCreditId(null);
        setInlineAmount('');
        fetchWallets();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setInlineSubmitting(false);
    }
  };

  const sorted = [...wallets].sort((a, b) => {
    if (sortBy === 'balance') return b.walletBalance - a.walletBalance;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });

  const totalBalance = wallets.reduce((s, w) => s + w.walletBalance, 0);
  const withBalance = wallets.filter((w) => w.walletBalance > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Wallet Balance</p>
              <p className="text-lg font-bold">Ksh {totalBalance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members with Balance</p>
              <p className="text-lg font-bold">{withBalance}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-navy-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-navy-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Balance</p>
              <p className="text-lg font-bold">
                Ksh {withBalance > 0 ? Math.round(totalBalance / withBalance).toLocaleString() : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={sortBy === 'balance' ? 'default' : 'outline'}
          onClick={() => setSortBy('balance')} className="text-xs">
          <ArrowUpDown className="h-3 w-3 mr-1" />By Balance
        </Button>
        <Button size="sm" variant={sortBy === 'name' ? 'default' : 'outline'}
          onClick={() => setSortBy('name')} className="text-xs">
          <ArrowUpDown className="h-3 w-3 mr-1" />By Name
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white"
          onClick={() => setShowCreditDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />Credit Wallet
        </Button>
      </div>

      {/* Credit Wallet Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowCreditDialog(open); }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Credit Member Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Searchable Member Dropdown */}
            <div className="space-y-1">
              <Label className="text-xs">Select Member *</Label>
              {selectedMember ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50">
                  <span className="text-sm flex-1 truncate">{selectedMember.firstName} {selectedMember.lastName} — {selectedMember.churchMembershipNo}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(null); setSearchResults([]); }}
                    className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or membership no..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-8 pr-8"
                    />
                    {searching && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/80 border-b border-border last:border-0 transition-colors"
                          onClick={() => { setSelectedMember(m); setSearchInput(''); setShowDropdown(false); }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{m.firstName} {m.lastName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">
                              {m.welfareNo ? `#${m.welfareNo}` : m.churchMembershipNo}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Balance: Ksh {Number(m.walletBalance || 0).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && searchInput.trim().length >= 1 && !searching && searchResults.length === 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Amount (Ksh) *</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="1"
                disabled={!selectedMember}
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                placeholder="Reason for credit..."
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                rows={2}
                disabled={!selectedMember}
              />
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={creditMethod} onValueChange={(v) => setCreditMethod(v)} disabled={!selectedMember}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedMember && creditAmount && (
              <div className="p-3 bg-teal-50 rounded-lg text-sm">
                <p className="text-teal-800">
                  New balance will be: <span className="font-bold">Ksh {(Number(selectedMember.walletBalance || 0) + parseFloat(creditAmount || '0')).toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetDialog(); setShowCreditDialog(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-teal-700 hover:bg-teal-800"
              disabled={creditSubmitting || !selectedMember || !creditAmount}
              onClick={() => handleCreditWallet(selectedMember!.id, creditAmount, `${creditDescription} (via ${creditMethod})`)}
            >
              {creditSubmitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Crediting...</> : <><Wallet className="h-4 w-4 mr-1" />Credit Wallet</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Membership No</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">District</TableHead>
                  <TableHead className="text-xs text-right">Wallet Balance</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No wallets found</TableCell>
                  </TableRow>
                ) : (
                  sorted.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{w.firstName} {w.lastName}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono">{w.churchMembershipNo}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{w.district?.name}</TableCell>
                      <TableCell className="text-right">
                        <span className={w.walletBalance > 0 ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}>
                          Ksh {w.walletBalance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {inlineCreditId === w.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              placeholder="0"
                              value={inlineAmount}
                              onChange={(e) => setInlineAmount(e.target.value)}
                              className="w-24 h-7 text-xs"
                              min="1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineCredit(w);
                                if (e.key === 'Escape') { setInlineCreditId(null); setInlineAmount(''); }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-teal-700 hover:bg-teal-800 text-xs"
                              disabled={inlineSubmitting || !inlineAmount}
                              onClick={() => handleInlineCredit(w)}
                            >
                              {inlineSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1 text-xs"
                              onClick={() => { setInlineCreditId(null); setInlineAmount(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                            onClick={() => { setInlineCreditId(w.id); setInlineAmount(''); }}
                          >
                            <Plus className="h-3 w-3 mr-1" />Credit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
