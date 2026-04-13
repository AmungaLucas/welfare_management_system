'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Plus, Eye, CheckCircle, XCircle, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface CaseDetail {
  id: string;
  case: BereavementCase;
}

interface BereavementCase {
  id: string;
  deceasedName: string;
  deceasedRelationship: string;
  deceasedAge: number | null;
  dateOfDeath: string | null;
  dateOfBurial: string | null;
  burialLocation: string | null;
  category: string;
  contributionPerMember: number;
  totalExpected: number;
  totalCollected: number;
  benefitAmount: number;
  benefitStatus: string;
  status: string;
  memberEligible: boolean;
  eligibilityNotes: string | null;
  loggedAt: string;
  member: { firstName: string; lastName: string; churchMembershipNo: string; district: { name: string } };
  paidContributions?: number;
  pendingContributions?: number;
}

export function BereavementCases() {
  const [cases, setCases] = useState<BereavementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<BereavementCase | null>(null);
  const [form, setForm] = useState({
    memberId: '',
    deceasedName: '',
    deceasedRelationship: 'SPOUSE',
    deceasedAge: '',
    dateOfDeath: '',
    dateOfBurial: '',
    burialLocation: '',
    category: 'NUCLEAR_FAMILY',
  });

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bereavement');
      const data = await res.json();
      setCases(data.cases || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); }, []);

  const fetchCaseDetail = async (id: string) => {
    const res = await fetch(`/api/bereavement/${id}`);
    const data = await res.json();
    setSelectedCase(data);
  };

  const handleCreate = async () => {
    if (!form.memberId || !form.deceasedName) { toast.error('Required fields missing'); return; }
    try {
      const res = await fetch('/api/bereavement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          memberId: form.memberId,
          deceasedAge: form.deceasedAge ? parseInt(form.deceasedAge) : null,
        }),
      });
      if (res.ok) {
        toast.success('Case created successfully');
        setShowNewDialog(false);
        fetchCases();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch { toast.error('Failed'); }
  };

  const handleCloseCase = async (caseId: string) => {
    try {
      const res = await fetch(`/api/bereavement/${caseId}/close`, { method: 'POST' });
      if (res.ok) { toast.success('Contributions closed'); fetchCases(); }
    } catch { toast.error('Failed'); }
  };

  const handleDisburse = async (caseId: string) => {
    try {
      const res = await fetch(`/api/bereavement/${caseId}/disburse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) { toast.success('Benefit disbursed'); fetchCases(); setSelectedCase(null); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">{cases.length} total cases</p>
        </div>
        <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Log New Case
            </Button>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Log Bereavement Case</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Affected Member ID</Label>
                <Input placeholder="Member ID" value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Deceased Name *</Label>
                <Input placeholder="Full name" value={form.deceasedName}
                  onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Relationship *</Label>
                  <Select value={form.deceasedRelationship || ''} onValueChange={(v) => setForm({ ...form, deceasedRelationship: v as 'MEMBER' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'SPOUSE_PARENT' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="SPOUSE">Spouse</SelectItem>
                      <SelectItem value="CHILD">Child</SelectItem>
                      <SelectItem value="PARENT">Parent</SelectItem>
                      <SelectItem value="SPOUSE_PARENT">Spouse Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category || ''} onValueChange={(v) => setForm({ ...form, category: v as 'NUCLEAR_FAMILY' | 'PARENT' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUCLEAR_FAMILY">Nuclear Family (Ksh 100k)</SelectItem>
                      <SelectItem value="PARENT">Parent (Ksh 60k)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Age</Label>
                  <Input type="number" value={form.deceasedAge}
                    onChange={(e) => setForm({ ...form, deceasedAge: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Burial Location</Label>
                  <Input value={form.burialLocation}
                    onChange={(e) => setForm({ ...form, burialLocation: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-800" onClick={handleCreate}>Create Case</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>
          ))
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No bereavement cases recorded
            </CardContent>
          </Card>
        ) : (
          cases.map((c) => (
            <Card key={c.id} className="border-l-4 border-l-red-300">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{c.deceasedName}</p>
                    <p className="text-xs text-muted-foreground">{c.member?.firstName} {c.member?.lastName} — {c.deceasedRelationship}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {c.category === 'NUCLEAR_FAMILY' ? 'Nuclear Family' : 'Parent'} • Ksh {Number(c.contributionPerMember).toLocaleString()}/member
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={
                      c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                      c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                    {!c.memberEligible && (
                      <Badge variant="destructive" className="text-[10px]">INELIGIBLE</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs space-y-0.5">
                    <p className="text-muted-foreground">Collected: <span className="font-medium text-navy-900">Ksh {Number(c.totalCollected).toLocaleString()}</span></p>
                    <p className="text-muted-foreground">Benefit: <span className="font-medium">Ksh {Number(c.benefitAmount).toLocaleString()}</span></p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => { fetchCaseDetail(c.id); }}>
                    <Eye className="h-3 w-3 mr-1" />Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bereavement Case — {selectedCase?.deceasedName}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Member:</span><br />{selectedCase.member?.firstName} {selectedCase.member?.lastName}</div>
                <div><span className="text-muted-foreground">Relationship:</span><br />{selectedCase.deceasedRelationship}</div>
                <div><span className="text-muted-foreground">Benefit:</span><br />Ksh {Number(selectedCase.benefitAmount).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Benefit Status:</span><br /><Badge>{selectedCase.benefitStatus}</Badge></div>
              </div>
              {!selectedCase.memberEligible && (
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  ⚠ {selectedCase.eligibilityNotes || 'Member is not eligible for benefits'}
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium mb-2">Collection Progress</p>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-navy-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (Number(selectedCase.totalCollected) / (Number(selectedCase.contributionPerMember) * selectedCase.totalExpected)) * 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Ksh {Number(selectedCase.totalCollected).toLocaleString()} collected</span>
                  <span>{selectedCase.totalExpected} members</span>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedCase.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" onClick={() => handleCloseCase(selectedCase.id)}>
                    Close Contributions
                  </Button>
                )}
                {selectedCase.memberEligible && selectedCase.status !== 'COMPLETED' && selectedCase.benefitStatus !== 'DISBURSED' && (
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => handleDisburse(selectedCase.id)}>
                    <DollarSign className="h-4 w-4 mr-1" />Disburse Benefit
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
