'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
import { Wallet, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Contribution {
  id: string;
  year: number;
  month: number;
  amount: number;
  paymentMethod: string;
  status: string;
  paidDate: string;
}

export function MemberContributions() {
  const { data: session } = useSession();
  const memberId = session?.user?.memberId;
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [paying, setPaying] = useState(false);

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
    setPaying(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: payYear, month: payMonth, paymentMethod: 'MPESA' }),
      });
      if (res.ok) { toast.success('Payment recorded'); setShowPayDialog(false); }
      else { const d = await res.json(); toast.error(d.error); }
      // Refresh
      fetch(`/api/contributions?memberId=${memberId}&limit=50`)
        .then((r) => r.json())
        .then((data) => setContributions(data.contributions || []));
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
            <Wallet className="h-4 w-4 mr-1" />Pay Now
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
                  <TableHead className="text-xs">Date Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No contributions yet</TableCell>
                  </TableRow>
                ) : (
                  contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{monthNames[c.month - 1]} {c.year}</TableCell>
                      <TableCell className="text-sm font-medium">Ksh {Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{c.paymentMethod}</Badge>
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

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Monthly Contribution</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={String(payMonth)} onValueChange={(v) => setPayMonth(parseInt(v || '1'))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input type="number" value={payYear} onChange={(e) => setPayYear(parseInt(e.target.value))} />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="text-2xl font-bold">Ksh 200</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Payment will be recorded. In production, M-Pesa STK push will be initiated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button className="bg-navy-900" onClick={handlePay} disabled={paying}>
              {paying ? 'Processing...' : 'Pay Ksh 200'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
