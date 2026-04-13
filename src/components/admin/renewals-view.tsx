'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Renewal {
  id: string;
  year: number;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  member: { firstName: string; lastName: string; churchMembershipNo: string };
}

export function RenewalsView() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInitiate, setShowInitiate] = useState(false);
  const [initYear, setInitYear] = useState(new Date().getFullYear() + 1);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals?year=${new Date().getFullYear()}`);
      const data = await res.json();
      setRenewals(data.renewals || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRenewals(); }, []);

  const handleInitiate = async () => {
    try {
      const res = await fetch('/api/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: initYear }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        setShowInitiate(false);
        fetchRenewals();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
  };

  const statusColors: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800',
    OVERDUE: 'bg-red-100 text-red-800',
    WAIVED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">{renewals.length} renewal records</p>
        </div>
        <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
          <Button size="sm" className="bg-navy-900 hover:bg-navy-800" onClick={() => setShowInitiate(true)}>
            <Plus className="h-4 w-4 mr-1" />Initiate Renewal
          </Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Initiate Annual Renewal</DialogTitle></DialogHeader>
            <div>
              <Label className="text-xs">Year</Label>
              <Input type="number" value={initYear} onChange={(e) => setInitYear(parseInt(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">This will create renewal records for all active members</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInitiate(false)}>Cancel</Button>
              <Button className="bg-navy-900" onClick={handleInitiate}>Initiate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{renewals.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-emerald-700">{renewals.filter((r) => r.status === 'PAID').length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="font-bold text-amber-700">{renewals.filter((r) => r.status === 'PENDING').length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Overdue</p><p className="font-bold text-red-700">{renewals.filter((r) => r.status === 'OVERDUE').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Membership No</TableHead>
                  <TableHead className="text-xs">Year</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Due Date</TableHead>
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
                ) : renewals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No renewal records</TableCell>
                  </TableRow>
                ) : (
                  renewals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.member?.firstName} {r.member?.lastName}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono">{r.member?.churchMembershipNo}</TableCell>
                      <TableCell className="text-sm">{r.year}</TableCell>
                      <TableCell className="text-sm">Ksh {Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[r.status] || ''} text-[10px]`}>{r.status}</Badge>
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
