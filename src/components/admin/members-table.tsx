'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, CheckCircle, XCircle, Ban, Trash2, Upload, Edit, ChevronLeft, ChevronRight,
  UserPlus, Loader2, Church, Users, Phone, Mail, Heart, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  id: string;
  churchMembershipNo: string;
  welfareNo: number | null;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  phone: string;
  email: string | null;
  status: string;
  districtId: number;
  district: { id: number; name: string };
  walletBalance: number;
  consecutiveArrears: number;
  dateJoinedWelfare: string | null;
  spouseName: string | null;
  user?: { id: string; isActive: boolean };
}

interface District {
  id: number;
  name: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REMOVED: 'bg-gray-100 text-gray-800',
};

const MEMBERSHIP_PREFIX = 'ACK/UTW';

// District name → 3-letter code mapping for membership numbers
const DISTRICT_CODES: Record<string, string> = {
  BETHLEHEM: 'BTH', SAMARIA: 'SAM', NAZARETH: 'NAZ', JERUSALEM: 'JER',
  GALILEE: 'GAL', BETHANY: 'BTN', JUDEA: 'JUD', DIASPORA: 'DSP', UNIVERSAL: 'UNI',
};

function getDistrictCode(districtId: string, districts: District[]): string {
  const d = districts.find((dist) => String(dist.id) === districtId);
  return d ? (DISTRICT_CODES[d.name] || '---') : '---';
}

function buildMembershipNo(districtId: string, memberNum: string, districts: District[]): string {
  const code = getDistrictCode(districtId, districts);
  const num = memberNum.trim().padStart(3, '0');
  return `${MEMBERSHIP_PREFIX}/${code}/${num}`;
}

const emptyForm = {
  memberNumber: '',
  churchMembershipNo: '',
  firstName: '',
  lastName: '',
  otherNames: '',
  phone: '',
  email: '',
  districtId: '',
  password: '',
  churchMembershipDate: '',
  spouseName: '',
  spouseAlive: 'true',
  fatherName: '',
  fatherAlive: 'true',
  motherName: '',
  motherAlive: 'true',
  nextOfKinName: '',
  nextOfKinPhone: '',
  nextOfKinRelationship: '',
  status: 'ACTIVE',
  joiningFeePaid: '',
  registrationFeePaid: '',
  dateJoinedWelfare: '',
};

export function MembersTable() {
  const [members, setMembers] = useState<Member[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Fetch districts from the database (not hardcoded)
  useEffect(() => {
    fetch('/api/districts')
      .then((r) => r.json())
      .then((data) => { if (data.districts) setDistricts(data.districts); })
      .catch(() => toast.error('Failed to load districts'));
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Member ${newStatus.toLowerCase()}`);
        fetchMembers();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setSubmitting(false);
  };

  // Compute the full membership number from district + member number
  const fullMembershipNo = form.memberNumber.trim() && form.districtId
    ? buildMembershipNo(form.districtId, form.memberNumber, districts)
    : '';

  // Auto-build the full code whenever district or member number changes
  useEffect(() => {
    if (form.memberNumber.trim() && form.districtId && districts.length > 0) {
      setForm((f) => ({
        ...f,
        churchMembershipNo: buildMembershipNo(f.districtId, f.memberNumber, districts),
      }));
    } else {
      setForm((f) => ({ ...f, churchMembershipNo: '' }));
    }
  }, [form.districtId, form.memberNumber, districts]);

  const handleSubmit = async () => {
    // Validation
    if (!form.memberNumber.trim()) { toast.error('Member number is required'); return; }
    if (!form.districtId) { toast.error('District is required'); return; }
    if (!form.firstName.trim()) { toast.error('First Name is required'); return; }
    if (!form.lastName.trim()) { toast.error('Last Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (!form.districtId) { toast.error('District is required'); return; }
    if (form.status === 'ACTIVE' && !form.password.trim()) {
      toast.error('Password is required when adding an active member');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchMembershipNo: form.churchMembershipNo.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          otherNames: form.otherNames.trim() || undefined,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          districtId: parseInt(form.districtId),
          churchMembershipDate: form.churchMembershipDate || undefined,
          spouseName: form.spouseName.trim() || undefined,
          spouseAlive: form.spouseAlive === 'true' ? true : form.spouseAlive === 'false' ? false : undefined,
          fatherName: form.fatherName.trim() || undefined,
          fatherAlive: form.fatherAlive === 'true' ? true : form.fatherAlive === 'false' ? false : undefined,
          motherName: form.motherName.trim() || undefined,
          motherAlive: form.motherAlive === 'true' ? true : form.motherAlive === 'false' ? false : undefined,
          nextOfKinName: form.nextOfKinName.trim() || undefined,
          nextOfKinPhone: form.nextOfKinPhone.trim() || undefined,
          nextOfKinRelationship: form.nextOfKinRelationship.trim() || undefined,
          status: form.status,
          password: form.password || undefined,
          joiningFeePaid: form.joiningFeePaid ? parseFloat(form.joiningFeePaid) : undefined,
          registrationFeePaid: form.registrationFeePaid ? parseFloat(form.registrationFeePaid) : undefined,
          dateJoinedWelfare: form.dateJoinedWelfare || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const m = data.member;
        toast.success(`Member "${m.firstName} ${m.lastName}" added successfully!`, {
          description: `Welfare No: ${m.welfareNo} | Status: ${m.status.replace(/_/g, ' ')}`,
        });
        setShowAddDialog(false);
        resetForm();
        fetchMembers();
      } else {
        toast.error(data.error || 'Failed to add member');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : (v || ''))}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="REMOVED">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" />
            <Button variant="outline" size="sm" onClick={() => toast.info('CSV import — upload via file input')}>
              <Upload className="h-4 w-4 mr-1" />Import
            </Button>
          </label>
          <Button size="sm" className="bg-navy-900 hover:bg-navy-800" onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <UserPlus className="h-4 w-4 mr-1" />Add Member
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
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Membership No</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">District</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Arrears</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{m.churchMembershipNo}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{m.district?.name}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[m.status] || ''} text-[10px] px-2 py-0.5`}>
                          {m.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {m.consecutiveArrears > 0 ? (
                          <Badge variant={m.consecutiveArrears >= 2 ? 'destructive' : 'secondary'}>
                            {m.consecutiveArrears}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {m.status === 'PENDING_APPROVAL' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600"
                              onClick={() => handleStatusChange(m.id, 'ACTIVE')}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {m.status === 'ACTIVE' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600"
                                onClick={() => handleStatusChange(m.id, 'SUSPENDED')}>
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600"
                                onClick={() => handleStatusChange(m.id, 'REMOVED')}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {m.status === 'SUSPENDED' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600"
                              onClick={() => handleStatusChange(m.id, 'ACTIVE')}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-right">
        Showing {members.length} of {total} members
      </div>

      {/* ==================== ADD MEMBER DIALOG ==================== */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { resetForm(); } setShowAddDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-navy-900 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              Add New Member
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* --- Personal Details --- */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-navy-700" />
                <h3 className="text-sm font-semibold text-navy-900">Personal Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Church Membership No. *</Label>
                  <div className="flex gap-0 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-navy-500 focus-within:ring-offset-1">
                    <div className="flex items-center px-3 bg-muted/60 text-xs font-mono font-medium text-navy-800 whitespace-nowrap select-all border-r border-input">
                      {MEMBERSHIP_PREFIX}/{form.districtId ? getDistrictCode(form.districtId, districts) : '---'}/
                    </div>
                    <Input
                      placeholder="001"
                      value={form.memberNumber}
                      onChange={(e) => update('memberNumber', e.target.value)}
                      className="border-0 ring-0 focus-visible:ring-0 shadow-none font-mono text-sm tracking-wider"
                      maxLength={4}
                    />
                  </div>
                  {fullMembershipNo && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Full code: <span className="font-mono font-medium text-navy-700">{fullMembershipNo}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">District *</Label>
                  <Select value={form.districtId} onValueChange={(v) => update('districtId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.length > 0 ? districts.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      )) : (
                        <SelectItem value="" disabled>Loading districts...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input placeholder="John" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input placeholder="Mwangi" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Other Names</Label>
                  <Input placeholder="(optional)" value={form.otherNames} onChange={(e) => update('otherNames', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number *</Label>
                  <Input type="tel" placeholder="0711000001" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="(optional)" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Church Membership Date</Label>
                  <Input type="date" value={form.churchMembershipDate} onChange={(e) => update('churchMembershipDate', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Account & Status --- */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-navy-700" />
                <h3 className="text-sm font-semibold text-navy-900">Account & Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Membership Status *</Label>
                  <Select value={form.status} onValueChange={(v) => update('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active (can login immediately)</SelectItem>
                      <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Password {form.status === 'ACTIVE' && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type="password"
                    placeholder={form.status === 'ACTIVE' ? 'Required for active members' : 'Optional for pending'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Joining Fee Paid (Ksh)</Label>
                  <Input type="number" placeholder="0" value={form.joiningFeePaid} onChange={(e) => update('joiningFeePaid', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Registration Fee Paid (Ksh)</Label>
                  <Input type="number" placeholder="0" value={form.registrationFeePaid} onChange={(e) => update('registrationFeePaid', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date Joined Welfare</Label>
                  <Input type="date" value={form.dateJoinedWelfare} onChange={(e) => update('dateJoinedWelfare', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Family Details --- */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-navy-700" />
                <h3 className="text-sm font-semibold text-navy-900">Family Details</h3>
                <span className="text-[10px] text-muted-foreground">(for bereavement coverage)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Spouse Name</Label>
                  <Input placeholder="(optional)" value={form.spouseName} onChange={(e) => update('spouseName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Spouse Alive?</Label>
                  <Select value={form.spouseAlive} onValueChange={(v) => update('spouseAlive', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No (Deceased)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
                <div className="space-y-1">
                  <Label className="text-xs">Father Name</Label>
                  <Input placeholder="(optional)" value={form.fatherName} onChange={(e) => update('fatherName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Father Alive?</Label>
                  <Select value={form.fatherAlive} onValueChange={(v) => update('fatherAlive', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No (Deceased)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
                <div className="space-y-1">
                  <Label className="text-xs">Mother Name</Label>
                  <Input placeholder="(optional)" value={form.motherName} onChange={(e) => update('motherName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mother Alive?</Label>
                  <Select value={form.motherAlive} onValueChange={(v) => update('motherAlive', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No (Deceased)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
              </div>
            </div>

            <Separator />

            {/* --- Next of Kin --- */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-navy-700" />
                <h3 className="text-sm font-semibold text-navy-900">Next of Kin</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input placeholder="e.g. Peter Mwangi" value={form.nextOfKinName} onChange={(e) => update('nextOfKinName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input type="tel" placeholder="0711..." value={form.nextOfKinPhone} onChange={(e) => update('nextOfKinPhone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select value={form.nextOfKinRelationship} onValueChange={(v) => update('nextOfKinRelationship', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Brother">Brother</SelectItem>
                      <SelectItem value="Sister">Sister</SelectItem>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Son">Son</SelectItem>
                      <SelectItem value="Daughter">Daughter</SelectItem>
                      <SelectItem value="Uncle">Uncle</SelectItem>
                      <SelectItem value="Aunt">Aunt</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }} disabled={submitting}>
              Cancel
            </Button>
            <Button className="bg-navy-900 hover:bg-navy-800" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Adding...</> : <><UserPlus className="h-4 w-4 mr-1" />Add Member</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
