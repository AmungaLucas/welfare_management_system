'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Heart, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface CaseContribution {
  id: string;
  caseId: string;
  expectedAmount: number;
  paidAmount: number;
  status: string;
  case: {
    id: string;
    deceasedName: string;
    deceasedRelationship: string;
    status: string;
    contributionPerMember: number;
  };
}

export function MemberCases() {
  const { data: session } = useSession();
  const memberId = session?.user?.memberId;
  const [cases, setCases] = useState<CaseContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingCase, setPayingCase] = useState<string | null>(null);

  const fetchCases = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bereavement');
      const data = await res.json();
      // Extract my case contributions from cases
      const myContributions: CaseContribution[] = [];
      for (const c of data.cases || []) {
        if (c.caseContributions) {
          for (const cc of c.caseContributions) {
            if (cc.memberId === memberId) {
              myContributions.push({ ...cc, case: c });
            }
          }
        }
      }
      setCases(myContributions);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); }, [memberId]);

  const handleContribute = async (caseId: string) => {
    setPayingCase(caseId);
    try {
      const res = await fetch(`/api/bereavement/${caseId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useWallet: false }),
      });
      if (res.ok) {
        toast.success('Contribution recorded');
        fetchCases();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
    finally { setPayingCase(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Bereavement Cases</h3>
        <p className="text-sm text-muted-foreground">Active cases requiring your contribution</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
        ))}</div>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No active bereavement cases requiring your contribution</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((c) => (
            <Card key={c.id} className={c.status === 'PAID' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-300'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.case?.deceasedName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.case?.deceasedRelationship} — {c.case?.status?.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-2 text-sm space-y-0.5">
                      <p className="text-muted-foreground">
                        Amount: <span className="font-medium">Ksh {Number(c.expectedAmount).toLocaleString()}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Paid: <span className="font-medium">{Number(c.paidAmount) > 0 ? `Ksh ${Number(c.paidAmount).toLocaleString()}` : '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={
                      c.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }>
                      {c.status}
                    </Badge>
                    {c.status === 'PENDING' && (c.case?.status === 'ACTIVE' || c.case?.status === 'CONTRIBUTIONS_CLOSED') && (
                      <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white h-7"
                        onClick={() => handleContribute(c.caseId)}
                        disabled={payingCase === c.caseId}>
                        {payingCase === c.caseId ? 'Paying...' : (
                          <><DollarSign className="h-3 w-3 mr-1" />Pay Ksh {Number(c.expectedAmount).toLocaleString()}</>
                        )}
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
