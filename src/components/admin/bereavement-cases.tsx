'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Heart, Plus, Eye, CheckCircle, XCircle, Users, DollarSign, Search, Loader2 } from 'lucide-react';
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

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  churchMembershipNo: string;
  welfareNo: number | null;
  status: string;
}

export function BereavementCases() {
  const [cases, setCases] = useState<BereavementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<BereavementCase | null>(null);
  const [form, setForm] = useState({
    memberId: '',
    memberLabel: '',
    deceasedName: '',
    deceasedRelationship: 'SPOUSE',
    dateOfDeath: '',
    dateOfBurial: '',
    burialLocation: '',
    category: 'NUCLEAR_FAMILY',
  });

  // Member search state
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Search members with debounce
  const searchMembers = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setMemberResults([]);
      setShowMemberDropdown(false);
      return;
    }
    setMemberSearching(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(query)}&limit=10&status=ACTIVE`);
      const data = await res.json();
      setMemberResults(data.members || []);
      setShowMemberDropdown(true);
    } catch {
      setMemberResults([]);
    } finally {
      setMemberSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchMembers(memberQuery);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [memberQuery, searchMembers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectMember = (member: MemberOption) => {
    const label = `${member.firstName} ${member.lastName} — ${member.churchMembershipNo}${member.welfareNo ? ` (#${member.welfareNo})` : ''}`;
    setForm((f) => ({ ...f, memberId: member.id, memberLabel: label }));
    setMemberQuery('');
    setShowMemberDropdown(false);
  };

  const clearMember = () => {
    setForm((f) => ({ ...f, memberId: '', memberLabel: '' }));
    setMemberResults([]);
  };

  const fetchCaseDetail = async (id: string) => {
    const res = await fetch(`/api/bereavement/${id}`);
    const data = await res.json();
    setSelectedCase(data);
  };

  const handleCreate = async () => {
    if (!form.memberId || !form.deceasedName) { toast.error('Please select an affected member and enter the deceased name'); return; }
    try {
      const res = await fetch('/api/bereavement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: form.memberId,
          deceasedName: form.deceasedName,
          deceasedRelationship: form.deceasedRelationship,
          dateOfDeath: form.dateOfDeath || null,
          dateOfBurial: form.dateOfBurial || null,
          burialLocation: form.burialLocation || null,
          category: form.category,
        }),
      });
      if (res.ok) {
        toast.success('Case created successfully');
        setShowNewDialog(false);
        setForm({
          memberId: '', memberLabel: '', deceasedName: '', deceasedRelationship: 'SPOUSE',
          dateOfDeath: '', dateOfBurial: '', burialLocation: '', category: 'NUCLEAR_FAMILY',
        });
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
        <Dialog open={showNewDialog} onOpenChange={(open) => { if (!open) clearMember(); setShowNewDialog(open); }}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Log Bereavement Case</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {/* Searchable Member Dropdown */}
              <div className="space-y-1">
                <Label className="text-xs">Affected Member *</Label>
                {form.memberId ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50">
                    <span className="text-sm flex-1 truncate">{form.memberLabel}</span>
                    <button
                      type="button"
                      onClick={clearMember}
                      className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                    >
                      ✕ Change
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or membership no..."
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                        className="pl-8 pr-8"
                      />
                      {memberSearching && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {showMemberDropdown && memberResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {memberResults.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/80 border-b border-border last:border-0 transition-colors"
                            onClick={() => selectMember(m)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{m.firstName} {m.lastName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">
                                #{m.welfareNo || '—'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {m.churchMembershipNo} • {m.status === 'ACTIVE' ? (
                                <span className="text-emerald-600">Active</span>
                              ) : (
                                <span className="text-amber-600">{m.status.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showMemberDropdown && memberQuery.trim().length >= 1 && !memberSearching && memberResults.length === 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                        No members found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Deceased Name *</Label>
                <Input placeholder="Full name" value={form.deceasedName}
                  onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Relationship *</Label>
                  <Select value={form.deceasedRelationship || ''} onValueChange={(v) => setForm({ ...form, deceasedRelationship: v })}>
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
                  <Select value={form.category || ''} onValueChange={(v) => setForm({ ...form, category: v })}>
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
                  <Label className="text-xs">Burial Location</Label>
                  <Input value={form.burialLocation}
                    onChange={(e) => setForm({ ...form, burialLocation: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { clearMember(); setShowNewDialog(false); }}>Cancel</Button>
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
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
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
