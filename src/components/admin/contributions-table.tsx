'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { DollarSign, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Contribution {
  id: string;
  memberId: string;
  year: number;
  month: number;
  amount: number;
  paymentMethod: string;
  status: string;
  paidDate: string;
  notes?: string;
  member: { firstName: string; lastName: string; churchMembershipNo: string; district?: { name: string } };
}

export function ContributionsTable() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  // Helper to safely render summary values
  const sv = (key: string) => String(summary?.[key] ?? 0);
  const [recordForm, setRecordForm] = useState({
    churchMembershipNo: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: 200,
    paymentMethod: 'CASH',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/contributions?year=${year}&limit=200`),
        fetch(`/api/contributions/summary?year=${year}`),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      setContributions(cData.contributions || []);
      setSummary(sData);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year]);

  const handleRecord = async () => {
    if (!recordForm.churchMembershipNo) { toast.error('Enter membership number'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      // Find member by membership number
      const mRes = await fetch(`/api/members?search=${recordForm.churchMembershipNo}&limit=1`);
      const mData = await mRes.json();
      const member = mData.members?.[0];
      if (!member) { toast.error('Member not found'); return; }

      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          year: recordForm.year,
          month: recordForm.month,
          amount: recordForm.amount,
          paymentMethod: recordForm.paymentMethod,
        }),
      });
      if (res.ok) { toast.success('Contribution recorded'); setShowRecordDialog(false); fetchData(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const handleAutoDeduct = async () => {
    const month = new Date().getMonth() + 1;
    const yr = new Date().getFullYear();
    try {
      const res = await fetch('/api/contributions/auto-deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: yr, month }),
      });
      const data = await res.json();
      toast.success(`Auto-deducted from ${data.deducted} members. ${data.skipped} skipped.`);
      fetchData();
    } catch { toast.error('Auto-deduct failed'); }
  };

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Yearly Total</p>
              <p className="text-lg font-bold">Ksh {sv('total')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Collection Rate</p>
              <p className="text-lg font-bold">{sv('collectionRate')}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active Members</p>
              <p className="text-lg font-bold">{sv('activeMembers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Unique Contributors</p>
              <p className="text-lg font-bold">{sv('uniqueMembers')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v || String(new Date().getFullYear())))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-navy-900 hover:bg-navy-800" onClick={() => setShowRecordDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />Record Payment
              </Button>
          <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Record Contribution</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Membership No</Label>
                  <Input placeholder="ACK/UTW/BTH/001" value={recordForm.churchMembershipNo}
                    onChange={(e) => setRecordForm({ ...recordForm, churchMembershipNo: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Year</Label>
                    <Input type="number" value={recordForm.year}
                      onChange={(e) => setRecordForm({ ...recordForm, year: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Month</Label>
                    <Select value={String(recordForm.month)}
                      onValueChange={(v) => setRecordForm({ ...recordForm, month: parseInt(v || '1') })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Amount (Ksh)</Label>
                    <Input type="number" value={recordForm.amount}
                      onChange={(e) => setRecordForm({ ...recordForm, amount: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={recordForm.paymentMethod}
                      onValueChange={(v) => setRecordForm({ ...recordForm, paymentMethod: v || 'MPESA' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MPESA">M-Pesa</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="WALLET">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
                <Button className="bg-navy-900" onClick={handleRecord} disabled={submitting}>
              {submitting ? 'Recording...' : 'Record'}
            </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" onClick={handleAutoDeduct}>
            <Zap className="h-4 w-4 mr-1" />Auto-Deduct
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Method</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contributions found</TableCell>
                  </TableRow>
                ) : (
                  contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{c.member?.firstName} {c.member?.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.member?.churchMembershipNo}</p>
                      </TableCell>
                      <TableCell className="text-xs">{monthNames[c.month - 1]}/{c.year}</TableCell>
                      <TableCell className="text-sm font-medium">Ksh {Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{c.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(c.paidDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-amber-100 text-amber-800 text-[10px]'}>
                          {c.status}
                        </Badge>
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
