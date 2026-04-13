'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Heart, DollarSign, Calendar, Loader2, CheckCircle } from 'lucide-react';
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
    createdAt: string;
    dateOfBurial: string | null;
    totalCollected: number;
    benefitAmount: number;
  };
}

export function MemberCases() {
  const { session } = useAuth();
  const memberId = session?.user?.memberId;
  const [cases, setCases] = useState<CaseContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingCase, setPayingCase] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseContribution | null>(null);
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCases = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bereavement');
      const data = await res.json();
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

  const handlePayClick = (cc: CaseContribution) => {
    setSelectedCase(cc);
    setShowPayDialog(true);
    setMpesaReceipt('');
  };

  const handleConfirmPay = async () => {
    if (!selectedCase || !mpesaReceipt.trim()) {
      toast.error('Please enter your M-Pesa receipt number');
      return;
    }
    setSubmitting(true);
    setPayingCase(selectedCase.caseId);
    try {
      const res = await fetch(`/api/bereavement/${selectedCase.caseId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useWallet: false, paymentMethod: 'MPESA' }),
      });
      if (res.ok) {
        toast.success('Contribution recorded successfully');
        setShowPayDialog(false);
        setMpesaReceipt('');
        setSelectedCase(null);
        fetchCases();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
    finally { setPayingCase(null); setSubmitting(false); }
  };

  const relationLabels: Record<string, string> = {
    MEMBER: 'Member (Self)',
    SPOUSE: 'Spouse',
    CHILD: 'Child',
    PARENT: 'Parent',
    SPOUSE_PARENT: "Spouse's Parent",
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
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-sm">{c.case?.deceasedName}</p>
                    <p className="text-xs text-muted-foreground">
                      {relationLabels[c.case?.deceasedRelationship] || c.case?.deceasedRelationship}
                      {' — '}{c.case?.status?.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-2 text-sm space-y-0.5">
                      <p className="text-muted-foreground">
                        Amount: <span className="font-medium">Ksh {Number(c.expectedAmount).toLocaleString()}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Paid: <span className="font-medium">{Number(c.paidAmount) > 0 ? `Ksh ${Number(c.paidAmount).toLocaleString()}` : '—'}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.case?.createdAt ? new Date(c.case.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                        {c.case?.dateOfBurial && <span>Burial: {new Date(c.case.dateOfBurial).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className={
                      c.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'EXEMPTED' ? 'bg-gray-100 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }>
                      {c.status === 'PAID' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {c.status}
                    </Badge>
                    {c.status === 'PENDING' && (c.case?.status === 'ACTIVE' || c.case?.status === 'CONTRIBUTIONS_CLOSED') && (
                      <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white h-7 text-xs"
                        onClick={() => handlePayClick(c)}
                        disabled={payingCase === c.caseId}>
                        {payingCase === c.caseId ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing...</> : (
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

      {/* M-Pesa Receipt Dialog */}
      {showPayDialog && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-[10px]">M</span>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Pay for: {selectedCase?.case?.deceasedName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedCase && (relationLabels[selectedCase.case.deceasedRelationship] || selectedCase.case.deceasedRelationship)} &mdash;
                  {' '}Ksh {selectedCase ? Number(selectedCase.expectedAmount).toLocaleString() : '—'}
                </p>
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">M-Pesa Paybill: <span className="font-mono font-bold">123456</span></p>
              <p className="text-xs text-green-700 mt-1">Send payment via M-Pesa Paybill first, then enter the receipt number below.</p>
            </div>
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
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowPayDialog(false); setSelectedCase(null); setMpesaReceipt(''); }}>Cancel</Button>
              <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white"
                disabled={submitting || !mpesaReceipt.trim()}
                onClick={handleConfirmPay}>
                {submitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing...</> : 'Confirm Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
