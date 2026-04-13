'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Wallet, CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Contribution {
  id: string;
  year: number;
  month: number;
  amount: number;
  paymentMethod: string;
  mpesaRef: string | null;
  status: string;
  paidDate: string;
}

export function MemberContributions() {
  const { session } = useAuth();
  const memberId = session?.user?.memberId;
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [paying, setPaying] = useState(false);
  const [mpesaReceipt, setMpesaReceipt] = useState('');

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    fetch(`/api/contributions?memberId=${memberId}&limit=50`)
      .then((r) => r.json())
      .then((data) => setContributions(data.contributions || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [memberId]);

  const handlePay = async () => {
    if (!mpesaReceipt.trim()) {
      toast.error('Please enter your M-Pesa receipt number');
      return;
    }
    setPaying(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: payYear, month: payMonth, paymentMethod: 'MPESA', mpesaRef: mpesaReceipt.trim() }),
      });
      if (res.ok) {
        toast.success('Payment recorded successfully');
        setShowPayDialog(false);
        setMpesaReceipt('');
        // Refresh
        fetch(`/api/contributions?memberId=${memberId}&limit=50`)
          .then((r) => r.json())
          .then((data) => setContributions(data.contributions || []));
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
    finally { setPaying(false); }
  };

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonthPaid = contributions.some((c) => c.year === currentYear && c.month === currentMonth);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">My Contributions</h3>
          <p className="text-sm text-muted-foreground">Monthly welfare contributions history</p>
        </div>
        {!isCurrentMonthPaid && (
          <Button size="sm" className="bg-navy-900 hover:bg-navy-800" onClick={() => setShowPayDialog(true)}>
            <DollarSign className="h-4 w-4 mr-1" />Make Payment
          </Button>
        )}
        {isCurrentMonthPaid && (
          <Badge className="bg-emerald-100 text-emerald-800">
            <CheckCircle className="h-3 w-3 mr-1" />Current Month Paid
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Month/Year</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Receipt</TableHead>
                  <TableHead className="text-xs">Date Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-8 w-8 opacity-30" />
                        <p>No contributions yet</p>
                        <p className="text-xs">Click &quot;Make Payment&quot; to record your first contribution</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{monthNames[c.month - 1]} {c.year}</TableCell>
                      <TableCell className="text-sm">Ksh {Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{c.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {c.mpesaRef ? (
                          <span className="font-mono text-[10px] bg-green-50 text-green-800 px-2 py-0.5 rounded">{c.mpesaRef}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.paidDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Make Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={(open) => { if (!open) setMpesaReceipt(''); setShowPayDialog(open); }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* M-Pesa Paybill Info */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">M-Pesa Paybill: <span className="font-mono font-bold">123456</span></p>
              <p className="text-xs text-green-700 mt-1">Send payment via M-Pesa Paybill first, then enter the receipt number below.</p>
            </div>

            {/* Payment Type */}
            <div>
              <Label className="text-xs">Payment Type</Label>
              <Select defaultValue="monthly" onValueChange={(v) => {
                // Could allow registration/joining fee in future
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Contribution (Ksh 200)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month/Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={String(payMonth)} onValueChange={(v) => setPayMonth(parseInt(v || '1'))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input type="number" className="mt-1" value={payYear} onChange={(e) => setPayYear(parseInt(e.target.value))} />
              </div>
            </div>

            {/* Amount */}
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="text-2xl font-bold">Ksh 200</p>
            </div>

            {/* M-Pesa Receipt */}
            <div>
              <Label className="text-xs">M-Pesa Receipt No. <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1"
                placeholder="e.g. QK3A7B2X9R"
                value={mpesaReceipt}
                onChange={(e) => setMpesaReceipt(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Enter the M-Pesa transaction receipt number from your SMS confirmation</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMpesaReceipt(''); setShowPayDialog(false); }}>Cancel</Button>
            <Button className="bg-navy-900" onClick={handlePay} disabled={paying || !mpesaReceipt.trim()}>
              {paying ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing...</> : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
