'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Renewal {
  id: string;
  year: number;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
}

export function MemberRenewals() {
  const { data: session } = useSession();
  const memberId = session?.user?.memberId;
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const fetchRenewals = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals?year=${new Date().getFullYear()}`);
      const data = await res.json();
      setRenewals(data.renewals || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRenewals(); }, [memberId]);

  const handlePay = async (renewal: Renewal) => {
    setPaying(true);
    try {
      const res = await fetch('/api/renewals/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: renewal.year, useWallet: false }),
      });
      if (res.ok) {
        toast.success('Renewal payment recorded');
        fetchRenewals();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
    finally { setPaying(false); }
  };

  const statusColors: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800',
    OVERDUE: 'bg-red-100 text-red-800',
    WAIVED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Annual Renewals</h3>
        <p className="text-sm text-muted-foreground">Your membership renewal status</p>
      </div>

      {loading ? (
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
      ) : renewals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No renewal records found for this year</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renewals.map((r) => (
            <Card key={r.id} className={`border-l-4 ${r.status === 'PAID' ? 'border-l-emerald-400' : r.status === 'OVERDUE' ? 'border-l-red-400' : 'border-l-amber-400'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${r.status === 'PAID' ? 'bg-emerald-100' : r.status === 'OVERDUE' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {r.status === 'PAID' ? <CheckCircle className="h-5 w-5 text-emerald-700" /> :
                       r.status === 'OVERDUE' ? <AlertTriangle className="h-5 w-5 text-red-700" /> :
                       <Clock className="h-5 w-5 text-amber-700" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{r.year} Annual Renewal</p>
                      <p className="text-xs text-muted-foreground">Due: {new Date(r.dueDate).toLocaleDateString()}</p>
                      {r.paidDate && (
                        <p className="text-xs text-emerald-600">Paid on: {new Date(r.paidDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold">Ksh {Number(r.amount).toLocaleString()}</p>
                    <Badge className={statusColors[r.status] || ''}>{r.status}</Badge>
                    {(r.status === 'PENDING' || r.status === 'OVERDUE') && (
                      <Button size="sm" className="bg-navy-900 hover:bg-navy-800 h-7"
                        onClick={() => handlePay(r)} disabled={paying}>
                        {paying ? 'Processing...' : `Pay Ksh ${Number(r.amount).toLocaleString()}`}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
