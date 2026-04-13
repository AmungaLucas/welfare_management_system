'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, CheckCircle, XCircle, Ban, Trash2, Upload, Edit, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  id: string;
  churchMembershipNo: string;
  welfareNo: number | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  districtId: number;
  district: { id: number; name: string };
  walletBalance: number;
  consecutiveArrears: number;
  dateJoinedWelfare: string | null;
  user?: { id: string; isActive: boolean };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REMOVED: 'bg-gray-100 text-gray-800',
};

export function MembersTable() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setTotal(data.pagination?.total || 0);
    } catch { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, [search, statusFilter]);

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
    } catch { toast.error('Failed to update status'); }
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
            <Button variant="outline" size="sm" onClick={() => toast.info('CSV import feature — upload via file input')}>
              <Upload className="h-4 w-4 mr-1" />Import
            </Button>
          </label>
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
    </div>
  );
}
