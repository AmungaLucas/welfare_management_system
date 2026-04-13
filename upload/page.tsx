'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard, Users, DollarSign, Heart, Bell, FileText, LogOut,
  Menu, X, ChevronRight, Search, Plus, Eye, Edit, AlertTriangle,
  CheckCircle, Clock, XCircle, UserPlus, Church, HandHeart, Shield,
  TrendingUp, Calendar, Phone, Mail, Hash, User
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  churchRegNumber: string;
  joinDate: string;
  churchYears: number;
  role: string;
  status: string;
  arrearsCount: number;
  registrationPaid: boolean;
  joiningFeePaid: boolean;
  contributions?: Contribution[];
  notifications?: Notification[];
  bereavementClaims?: BereavementClaim[];
  bereavementEvents?: BereavementEvent[];
  _count?: { contributions: number };
}

interface Contribution {
  id: string;
  memberId: string;
  type: string;
  amount: number;
  month: string | null;
  bereavementId: string | null;
  mpesaReceipt: string;
  paybillNumber: string;
  status: string;
  paidAt: string;
  createdAt: string;
  member?: { id: string; firstName: string; lastName: string; memberNumber: string };
  bereavement?: BereavementEvent;
}

interface BereavementEvent {
  id: string;
  memberId: string;
  deceasedName: string;
  deceasedRelation: string;
  dateOfDeath: string;
  burialDate: string;
  contributionAmount: number;
  totalCollected: number;
  benefitAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  member?: { id: string; firstName: string; lastName: string; memberNumber: string };
  contributions?: Contribution[];
  claims?: BereavementClaim[];
}

interface BereavementClaim {
  id: string;
  memberId: string;
  bereavementId: string;
  amount: number;
  status: string;
  createdAt: string;
  bereavement?: BereavementEvent;
  member?: { id: string; firstName: string; lastName: string };
}

interface Notification {
  id: string;
  memberId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// Helpers
// ============================================
const formatCurrency = (amount: number) => `Kshs. ${amount.toLocaleString()}/=`;

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    active: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
    red_alert: { variant: 'destructive', icon: <AlertTriangle className="w-3 h-3" /> },
    suspended: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    inactive: { variant: 'secondary', icon: <XCircle className="w-3 h-3" /> },
  };
  const config = variants[status] || variants.inactive;
  const label = status.replace('_', ' ').toUpperCase();
  return <Badge variant={config.variant} className="gap-1 text-xs"><span className="inline-flex">{config.icon}</span> {label}</Badge>;
};

const getContributionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    monthly: 'Monthly',
    registration: 'Registration',
    joining_fee: 'Joining Fee',
    renewal: 'Annual Renewal',
    bereavement: 'Bereavement',
  };
  return labels[type] || type;
};

const getRelationLabel = (relation: string) => {
  const labels: Record<string, string> = {
    self: 'Self (Member)',
    spouse: 'Spouse',
    child: 'Child',
    parent: 'Parent',
    spouse_parent: "Spouse's Parent",
  };
  return labels[relation] || relation;
};

// ============================================
// Custom hook for data fetching
// ============================================
function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; loading: boolean; refetch: () => void } {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean }>({ data: undefined, loading: true });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher().then((result) => {
      if (!cancelled) {
        setState({ data: result, loading: false });
      }
    }).catch(() => {
      if (!cancelled) {
        setState(prev => ({ ...prev, loading: false }));
      }
    });
    return () => { cancelled = true; };
  }, [...deps, refreshKey]);

  const refetch = () => setRefreshKey(k => k + 1);

  return { data: state.data, loading: state.loading, refetch };
}

// ============================================
// API helpers
// ============================================
const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
  },
  members: {
    list: async (params = '') => {
      const res = await fetch(`/api/members${params ? `?${params}` : ''}`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/members/${id}`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    update: async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
    },
  },
  contributions: {
    list: async (params = '') => {
      const res = await fetch(`/api/contributions${params ? `?${params}` : ''}`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/contributions/${id}`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    update: async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/contributions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/contributions/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
  },
  bereavement: {
    list: async (params = '') => {
      const res = await fetch(`/api/bereavement${params ? `?${params}` : ''}`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/bereavement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    update: async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/bereavement/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  notifications: {
    list: async (params = '') => {
      const res = await fetch(`/api/notifications${params ? `?${params}` : ''}`);
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
  },
  dashboard: {
    get: async (params = '') => {
      const res = await fetch(`/api/dashboard${params ? `?${params}` : ''}`);
      return res.json();
    },
  },
  reports: {
    get: async (type: string) => {
      const res = await fetch(`/api/reports?type=${type}`);
      return res.json();
    },
  },
};

// ============================================
// Loading Spinner
// ============================================
function LoadingSpinner() {
  return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;
}

// ============================================
// Login View
// ============================================
function LoginView({ onLogin }: { onLogin: (member: Member) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      onLogin(data.member);
      toast.success('Login successful!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#c9a227]">
            <Church className="w-10 h-10 text-[#c9a227]" />
          </div>
          <h1 className="text-2xl font-bold text-white">ACK St. Monica Parish</h1>
          <p className="text-[#c9a227] font-medium">Utawala Welfare Management System</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-[#1e3a5f]">Sign In</CardTitle>
            <CardDescription>Access your welfare account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8e]"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Admin: admin@stmonica.com / password123</p>
              <p>Member: grace.wanjiku@email.com / password123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Sidebar Component
// ============================================
function Sidebar({
  items,
  activeView,
  onViewChange,
  member,
  onLogout,
  isOpen,
  onToggle,
}: {
  items: { id: string; label: string; icon: React.ReactNode }[];
  activeView: string;
  onViewChange: (view: string) => void;
  member: Member;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />}
      <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-[#1e3a5f] text-white transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c9a227] rounded-full flex items-center justify-center">
              <Church className="w-5 h-5 text-[#1e3a5f]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">St. Monica Welfare</p>
              <p className="text-xs text-[#c9a227]">{member.role === 'admin' ? 'Administrator' : 'Member'} Portal</p>
            </div>
          </div>
        </div>
        <nav className="p-2 flex-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); onToggle(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
                activeView === item.id
                  ? 'bg-white/15 text-[#c9a227] font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#c9a227] rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-sm">
              {member.firstName[0]}{member.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
              <p className="text-xs text-white/60">{member.memberNumber}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-start" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}

// ============================================
// Admin Dashboard
// ============================================
function AdminDashboard() {
  const { data, loading } = useFetch(() => api.dashboard.get(), []);

  if (loading || !data) return <LoadingSpinner />;

  const stats = data.stats as Record<string, number>;
  const recentContributions = (data.recentContributions || []) as (Contribution & { member?: { firstName: string; lastName: string; memberNumber: string } })[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Admin Dashboard</h2>
        <p className="text-muted-foreground">Overview of welfare management activities</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#1e3a5f]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.totalMembers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-[#1e3a5f]/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeMembers || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#c9a227]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contributions</p>
                <p className="text-2xl font-bold text-[#c9a227]">{formatCurrency(stats.totalContributionsAmount || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#c9a227]/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Arrears Cases</p>
                <p className="text-2xl font-bold text-red-600">{(stats.redAlertMembers || 0) + (stats.suspendedMembers || 0)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Recent Contributions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContributions.slice(0, 5).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.member?.firstName} {c.member?.lastName}</TableCell>
                    <TableCell><Badge variant="outline">{getContributionTypeLabel(c.type)}</Badge></TableCell>
                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Bereavements</span>
              <Badge variant="destructive">{stats.activeBereavementEvents || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Claims</span>
              <Badge variant="secondary">{stats.pendingClaims || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Collections</span>
              <span className="font-semibold">{formatCurrency(stats.monthlyContributionsAmount || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bereavement Collections</span>
              <span className="font-semibold">{formatCurrency(stats.bereavementContributionsAmount || 0)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Red Alert</span>
              <Badge variant="destructive">{stats.redAlertMembers || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suspended</span>
              <Badge variant="destructive">{stats.suspendedMembers || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Admin Manage Members
// ============================================
function AdminMembers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', phone: '', churchRegNumber: '', churchYears: '1' });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', churchRegNumber: '', churchYears: '1', status: 'active', arrearsCount: '0', registrationPaid: false, joiningFeePaid: false });

  const buildParams = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  };

  const { data: membersData, refetch: refetchMembers } = useFetch<Member[]>(
    () => api.members.list(buildParams()),
    [search, statusFilter]
  );
  const members = membersData ?? [];

  const handleAddMember = async () => {
    try {
      await api.members.create(newMember);
      toast.success('Member added successfully!');
      setShowAddDialog(false);
      setNewMember({ firstName: '', lastName: '', email: '', phone: '', churchRegNumber: '', churchYears: '1' });
      refetchMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleViewMember = async (id: string) => {
    const data = await api.members.get(id);
    setSelectedMember(data);
    setShowDetailDialog(true);
  };

  const handleEditMember = async (m: Member) => {
    setEditForm({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      churchRegNumber: m.churchRegNumber,
      churchYears: String(m.churchYears),
      status: m.status,
      arrearsCount: String(m.arrearsCount),
      registrationPaid: m.registrationPaid,
      joiningFeePaid: m.joiningFeePaid,
    });
    setSelectedMember(m);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    try {
      await api.members.update(selectedMember.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        churchRegNumber: editForm.churchRegNumber,
        churchYears: parseInt(editForm.churchYears),
        status: editForm.status,
        arrearsCount: parseInt(editForm.arrearsCount),
        registrationPaid: editForm.registrationPaid,
        joiningFeePaid: editForm.joiningFeePaid,
      });
      toast.success('Member details updated!');
      setShowEditDialog(false);
      refetchMembers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.members.update(id, { status });
    toast.success('Member status updated');
    refetchMembers();
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Are you sure you want to delete this member?')) {
      await api.members.delete(id);
      toast.success('Member deleted');
      refetchMembers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Manage Members</h2>
          <p className="text-muted-foreground">{members.length} registered members</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]"><UserPlus className="w-4 h-4 mr-2" /> Add Member</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>Register a new welfare group member</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={newMember.firstName} onChange={e => setNewMember({ ...newMember, firstName: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={newMember.lastName} onChange={e => setNewMember({ ...newMember, lastName: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Church Reg. No.</Label><Input value={newMember.churchRegNumber} onChange={e => setNewMember({ ...newMember, churchRegNumber: e.target.value })} placeholder="e.g. ACK-SM-007" /></div>
                <div><Label>Church Years</Label><Input type="number" value={newMember.churchYears} onChange={e => setNewMember({ ...newMember, churchYears: e.target.value })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Default password: password123. Joining fee: {parseInt(newMember.churchYears) <= 2 ? 'Kshs. 2,600/=' : 'Kshs. 5,000/='}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleAddMember}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, member #, or church reg..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="red_alert">Red Alert</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Church Reg. No.</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Arrears</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.memberNumber}</TableCell>
                    <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                    <TableCell className="font-mono text-xs">{m.churchRegNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm">{m.email}</div>
                      <div className="text-xs text-muted-foreground">{m.phone}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell>
                      {m.arrearsCount > 0 ? <Badge variant="destructive">{m.arrearsCount} missed</Badge> : <Badge variant="outline" className="text-green-600">Clear</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="View details" onClick={() => handleViewMember(m.id)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" title="Edit member" onClick={() => handleEditMember(m)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" title="Delete member" onClick={() => handleDeleteMember(m.id)}><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Member Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMember.firstName} {selectedMember.lastName}</DialogTitle>
                <DialogDescription>{selectedMember.memberNumber} | Church Reg: {selectedMember.churchRegNumber}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Status</p>{getStatusBadge(selectedMember.status)}</div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Church Reg. No.</p><p className="font-medium font-mono">{selectedMember.churchRegNumber}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Church Years</p><p className="font-medium">{selectedMember.churchYears} years</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{selectedMember.email}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{selectedMember.phone}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Join Date</p><p className="font-medium">{formatDate(selectedMember.joinDate)}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Arrears</p><p className="font-medium">{selectedMember.arrearsCount} missed</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Registration Paid</p>{selectedMember.registrationPaid ? <Badge className="bg-green-100 text-green-700">Yes</Badge> : <Badge variant="destructive">No</Badge>}</div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Joining Fee Paid</p>{selectedMember.joiningFeePaid ? <Badge className="bg-green-100 text-green-700">Yes</Badge> : <Badge variant="destructive">No</Badge>}</div>
                </div>
                {selectedMember.contributions && selectedMember.contributions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recent Contributions</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>M-Pesa Receipt</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedMember.contributions.slice(0, 5).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell><Badge variant="outline">{getContributionTypeLabel(c.type)}</Badge></TableCell>
                            <TableCell>{formatCurrency(c.amount)}</TableCell>
                            <TableCell><span className="font-mono text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded">{c.mpesaReceipt}</span></TableCell>
                            <TableCell>{formatDate(c.paidAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update details for {selectedMember?.firstName} {selectedMember?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Church Reg. No.</Label><Input value={editForm.churchRegNumber} onChange={e => setEditForm({ ...editForm, churchRegNumber: e.target.value })} /></div>
              <div><Label>Church Years</Label><Input type="number" value={editForm.churchYears} onChange={e => setEditForm({ ...editForm, churchYears: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="red_alert">Red Alert</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Arrears Count</Label><Input type="number" value={editForm.arrearsCount} onChange={e => setEditForm({ ...editForm, arrearsCount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="editRegPaid" checked={editForm.registrationPaid} onChange={e => setEditForm({ ...editForm, registrationPaid: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="editRegPaid">Registration Paid</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="editJoinPaid" checked={editForm.joiningFeePaid} onChange={e => setEditForm({ ...editForm, joiningFeePaid: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="editJoinPaid">Joining Fee Paid</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Admin Contributions
// ============================================
function AdminContributions() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedContrib, setSelectedContrib] = useState<Contribution | null>(null);
  const [newContribution, setNewContribution] = useState({ memberId: '', type: 'monthly', amount: '200', month: '', mpesaReceipt: '', paybillNumber: '123456' });
  const [editForm, setEditForm] = useState({ type: '', amount: '', month: '', mpesaReceipt: '', paybillNumber: '', status: '' });

  const contribParams = typeFilter !== 'all' ? `type=${typeFilter}` : '';
  const { data: contributionsData, refetch: refetchContribs } = useFetch<Contribution[]>(
    () => api.contributions.list(contribParams),
    [typeFilter]
  );
  const { data: membersData } = useFetch<Member[]>(() => api.members.list(), []);
  const contributions = contributionsData ?? [];
  const members = membersData ?? [];

  const handleAdd = async () => {
    try {
      await api.contributions.create({
        ...newContribution,
        amount: parseFloat(newContribution.amount),
      });
      toast.success('Contribution recorded successfully!');
      setShowAddDialog(false);
      setNewContribution({ memberId: '', type: 'monthly', amount: '200', month: '', mpesaReceipt: '', paybillNumber: '123456' });
      refetchContribs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record contribution');
    }
  };

  const handleEdit = (c: Contribution) => {
    setSelectedContrib(c);
    setEditForm({
      type: c.type,
      amount: String(c.amount),
      month: c.month || '',
      mpesaReceipt: c.mpesaReceipt,
      paybillNumber: c.paybillNumber,
      status: c.status,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedContrib) return;
    try {
      await api.contributions.update(selectedContrib.id, {
        ...editForm,
        amount: parseFloat(editForm.amount),
      });
      toast.success('Contribution updated!');
      setShowEditDialog(false);
      refetchContribs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contribution');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contribution record?')) return;
    try {
      await api.contributions.delete(id);
      toast.success('Contribution deleted');
      refetchContribs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contribution');
    }
  };

  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Contributions</h2>
          <p className="text-muted-foreground">{contributions.length} records | Total: {formatCurrency(totalAmount)}</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]"><Plus className="w-4 h-4 mr-2" /> Record Contribution</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Contribution</DialogTitle>
              <DialogDescription>Record a payment via M-Pesa Paybill</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">M-Pesa Paybill: <span className="font-mono">123456</span></p>
                <p className="text-xs text-green-700 mt-1">All payments must be made via M-Pesa Paybill. Enter the M-Pesa receipt number below.</p>
              </div>
              <div>
                <Label>Member</Label>
                <Select value={newContribution.memberId} onValueChange={v => setNewContribution({ ...newContribution, memberId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (<SelectItem key={m.id} value={m.id}>{m.memberNumber} - {m.firstName} {m.lastName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={newContribution.type} onValueChange={v => {
                    const amounts: Record<string, string> = { monthly: '200', registration: '200', joining_fee: '5000', renewal: '200', bereavement: '300' };
                    setNewContribution({ ...newContribution, type: v, amount: amounts[v] || '200' });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="joining_fee">Joining Fee</SelectItem>
                      <SelectItem value="renewal">Annual Renewal</SelectItem>
                      <SelectItem value="bereavement">Bereavement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (Kshs)</Label><Input type="number" value={newContribution.amount} onChange={e => setNewContribution({ ...newContribution, amount: e.target.value })} /></div>
              </div>
              {newContribution.type === 'monthly' && (
                <div><Label>Month</Label><Input type="month" value={newContribution.month} onChange={e => setNewContribution({ ...newContribution, month: e.target.value })} /></div>
              )}
              <div>
                <Label>M-Pesa Receipt No. <span className="text-destructive">*</span></Label>
                <Input value={newContribution.mpesaReceipt} onChange={e => setNewContribution({ ...newContribution, mpesaReceipt: e.target.value })} placeholder="e.g. QK3A7B2X9R" />
                <p className="text-xs text-muted-foreground mt-1">Enter the M-Pesa transaction receipt number</p>
              </div>
              <div>
                <Label>Paybill Number</Label>
                <Input value={newContribution.paybillNumber} onChange={e => setNewContribution({ ...newContribution, paybillNumber: e.target.value })} placeholder="123456" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleAdd} disabled={!newContribution.mpesaReceipt}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Contribution Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contribution</DialogTitle>
            <DialogDescription>Update payment details for {selectedContrib?.member?.firstName} {selectedContrib?.member?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="joining_fee">Joining Fee</SelectItem>
                    <SelectItem value="renewal">Annual Renewal</SelectItem>
                    <SelectItem value="bereavement">Bereavement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount (Kshs)</Label><Input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></div>
            </div>
            {editForm.type === 'monthly' && (
              <div><Label>Month</Label><Input type="month" value={editForm.month} onChange={e => setEditForm({ ...editForm, month: e.target.value })} /></div>
            )}
            <div>
              <Label>M-Pesa Receipt No. <span className="text-destructive">*</span></Label>
              <Input value={editForm.mpesaReceipt} onChange={e => setEditForm({ ...editForm, mpesaReceipt: e.target.value })} />
            </div>
            <div>
              <Label>Paybill Number</Label>
              <Input value={editForm.paybillNumber} onChange={e => setEditForm({ ...editForm, paybillNumber: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="joining_fee">Joining Fee</SelectItem>
                <SelectItem value="renewal">Renewal</SelectItem>
                <SelectItem value="bereavement">Bereavement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>M-Pesa Receipt</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.slice(0, 50).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.member?.firstName} {c.member?.lastName}<span className="text-xs text-muted-foreground ml-1">({c.member?.memberNumber})</span></TableCell>
                    <TableCell><Badge variant="outline">{getContributionTypeLabel(c.type)}</Badge></TableCell>
                    <TableCell className="font-semibold">{formatCurrency(c.amount)}</TableCell>
                    <TableCell><span className="font-mono text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded">{c.mpesaReceipt}</span></TableCell>
                    <TableCell className="text-muted-foreground">{c.month || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.paidAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Admin Bereavement
// ============================================
function AdminBereavement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BereavementEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ memberId: '', deceasedName: '', deceasedRelation: 'parent', dateOfDeath: '', burialDate: '' });

  const { data: eventsData, refetch: refetchEvents } = useFetch<BereavementEvent[]>(
    () => api.bereavement.list(), []
  );
  const { data: membersData2 } = useFetch<Member[]>(
    () => api.members.list('role=member'), []
  );
  const events = eventsData ?? [];
  const members = membersData2 ?? [];

  const handleAdd = async () => {
    try {
      const isNuclear = ['self', 'spouse', 'child'].includes(newEvent.deceasedRelation);
      await api.bereavement.create({
        ...newEvent,
        contributionAmount: isNuclear ? 300 : 200,
        benefitAmount: isNuclear ? 100000 : 60000,
      });
      toast.success('Bereavement event created');
      setShowAddDialog(false);
      setNewEvent({ memberId: '', deceasedName: '', deceasedRelation: 'parent', dateOfDeath: '', burialDate: '' });
      refetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create event');
    }
  };

  const handleClose = async (id: string) => {
    await api.bereavement.update(id, { status: 'closed' });
    toast.success('Bereavement event closed');
    refetchEvents();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Bereavement Events</h2>
          <p className="text-muted-foreground">{events.length} total events</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]"><Plus className="w-4 h-4 mr-2" /> New Bereavement Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Bereavement Event</DialogTitle>
              <DialogDescription>Record a new bereavement event</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Bereaved Member</Label>
                <Select value={newEvent.memberId} onValueChange={v => setNewEvent({ ...newEvent, memberId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (<SelectItem key={m.id} value={m.id}>{m.memberNumber} - {m.firstName} {m.lastName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Deceased Name</Label><Input value={newEvent.deceasedName} onChange={e => setNewEvent({ ...newEvent, deceasedName: e.target.value })} /></div>
              <div>
                <Label>Relation to Member</Label>
                <Select value={newEvent.deceasedRelation} onValueChange={v => setNewEvent({ ...newEvent, deceasedRelation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self (Member)</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="spouse_parent">Spouse&apos;s Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date of Death</Label><Input type="date" value={newEvent.dateOfDeath} onChange={e => setNewEvent({ ...newEvent, dateOfDeath: e.target.value })} /></div>
                <div><Label>Burial Date</Label><Input type="date" value={newEvent.burialDate} onChange={e => setNewEvent({ ...newEvent, burialDate: e.target.value })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {['self', 'spouse', 'child'].includes(newEvent.deceasedRelation)
                  ? 'Nuclear family: Kshs. 300/= per member | Benefit: Kshs. 100,000/='
                  : 'Parent: Kshs. 200/= per member | Benefit: Kshs. 60,000/='}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleAdd}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className={event.status === 'active' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-gray-300'}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#1e3a5f]">{event.deceasedName}</h3>
                    <Badge variant={event.status === 'active' ? 'destructive' : 'secondary'}>{event.status === 'active' ? 'Active' : 'Closed'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getRelationLabel(event.deceasedRelation)} of {event.member?.firstName} {event.member?.lastName} ({event.member?.memberNumber})
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Death: {formatDate(event.dateOfDeath)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Burial: {formatDate(event.burialDate)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Collected / Benefit</p>
                    <p className="font-semibold">{formatCurrency(event.totalCollected)} / {formatCurrency(event.benefitAmount)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedEvent(event); setShowDetailDialog(true); }}><Eye className="w-3 h-3 mr-1" /> View</Button>
                    {event.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleClose(event.id)}><CheckCircle className="w-3 h-3 mr-1" /> Close</Button>
                    )}
                  </div>
                </div>
              </div>
              {event.status === 'active' && <div className="mt-3"><Progress value={(event.totalCollected / event.benefitAmount) * 100} className="h-2" /></div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>Bereavement: {selectedEvent.deceasedName}</DialogTitle>
                <DialogDescription>{getRelationLabel(selectedEvent.deceasedRelation)} of {selectedEvent.member?.firstName} {selectedEvent.member?.lastName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date of Death:</span> <strong>{formatDate(selectedEvent.dateOfDeath)}</strong></div>
                  <div><span className="text-muted-foreground">Burial Date:</span> <strong>{formatDate(selectedEvent.burialDate)}</strong></div>
                  <div><span className="text-muted-foreground">Contribution/Member:</span> <strong>{formatCurrency(selectedEvent.contributionAmount)}</strong></div>
                  <div><span className="text-muted-foreground">Benefit Amount:</span> <strong>{formatCurrency(selectedEvent.benefitAmount)}</strong></div>
                  <div><span className="text-muted-foreground">Total Collected:</span> <strong>{formatCurrency(selectedEvent.totalCollected)}</strong></div>
                </div>
                {selectedEvent.contributions && selectedEvent.contributions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Contributions Received</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedEvent.contributions.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.member?.firstName} {c.member?.lastName} ({c.member?.memberNumber})</TableCell>
                            <TableCell>{formatCurrency(c.amount)}</TableCell>
                            <TableCell>{formatDate(c.paidAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {selectedEvent.claims && selectedEvent.claims.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Claims</h4>
                    {selectedEvent.claims.map((cl) => (
                      <div key={cl.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{cl.member?.firstName} {cl.member?.lastName}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(cl.amount)}</span>
                          <Badge variant={cl.status === 'disbursed' ? 'default' : 'secondary'}>{cl.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Admin Notifications
// ============================================
function AdminNotifications() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'info', memberId: '' });

  const { data: notificationsData, refetch: refetchNotifs } = useFetch<Notification[]>(
    () => api.notifications.list(), []
  );
  const { data: membersData3 } = useFetch<Member[]>(
    () => api.members.list('role=member'), []
  );
  const notifications = notificationsData ?? [];
  const members = membersData3 ?? [];

  const handleAdd = async () => {
    try {
      await api.notifications.create(newNotif);
      toast.success('Notification sent!');
      setShowAddDialog(false);
      setNewNotif({ title: '', message: '', type: 'info', memberId: '' });
      refetchNotifs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send notification');
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    info: <Bell className="w-4 h-4 text-blue-500" />,
    bereavement: <Heart className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    contribution: <DollarSign className="w-4 h-4 text-green-500" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Notifications</h2>
          <p className="text-muted-foreground">{notifications.length} notifications sent</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]"><Plus className="w-4 h-4 mr-2" /> Send Notification</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>Send a notification to members</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={newNotif.title} onChange={e => setNewNotif({ ...newNotif, title: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={newNotif.type} onValueChange={v => setNewNotif({ ...newNotif, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="contribution">Contribution</SelectItem>
                    <SelectItem value="bereavement">Bereavement</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recipient</Label>
                <Select value={newNotif.memberId} onValueChange={v => setNewNotif({ ...newNotif, memberId: v })}>
                  <SelectTrigger><SelectValue placeholder="All Members (Broadcast)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">All Members (Broadcast)</SelectItem>
                    {members.map(m => (<SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.memberNumber})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Message</Label><Textarea rows={3} value={newNotif.message} onChange={e => setNewNotif({ ...newNotif, message: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleAdd}>Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcons[n.type] || <Bell className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{n.title}</h3>
                    <Badge variant="outline" className="text-xs">{n.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Admin Reports
// ============================================
function AdminReports() {
  const [reportType, setReportType] = useState('members');
  const { data: reportData, loading } = useFetch(() => api.reports.get(reportType), [reportType]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Reports</h2>
        <p className="text-muted-foreground">Generate and view various reports</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
          { id: 'contributions', label: 'Contributions', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'bereavement', label: 'Bereavement', icon: <Heart className="w-4 h-4" /> },
          { id: 'arrears', label: 'Arrears', icon: <AlertTriangle className="w-4 h-4" /> },
        ].map((r) => (
          <Button key={r.id} variant={reportType === r.id ? 'default' : 'outline'} className={reportType === r.id ? 'bg-[#1e3a5f]' : ''} onClick={() => setReportType(r.id)}>
            {r.icon} <span className="ml-2">{r.label}</span>
          </Button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card>
          <CardContent className="p-4">
            {reportType === 'members' && Array.isArray(reportData) && (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Arrears</TableHead><TableHead>Contributions</TableHead><TableHead>Join Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(reportData as Member[]).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.memberNumber}</TableCell>
                      <TableCell>{m.firstName} {m.lastName}</TableCell>
                      <TableCell>{getStatusBadge(m.status)}</TableCell>
                      <TableCell>{m.arrearsCount}</TableCell>
                      <TableCell>{m._count?.contributions || 0}</TableCell>
                      <TableCell>{formatDate(m.joinDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {reportType === 'contributions' && reportData && typeof reportData === 'object' && 'summary' in (reportData as Record<string, unknown>) && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {Object.entries(((reportData as Record<string, unknown>).summary as Record<string, unknown>).byType as Record<string, number>).map(([key, val]) => (
                    <Card key={key}>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                        <p className="font-bold text-[#1e3a5f]">{formatCurrency(val)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-sm font-medium">Total: {formatCurrency(((reportData as Record<string, unknown>).summary as Record<string, unknown>).totalAmount as number)}</p>
              </div>
            )}

            {reportType === 'bereavement' && reportData && typeof reportData === 'object' && 'summary' in (reportData as Record<string, unknown>) && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Object.entries((reportData as Record<string, unknown>).summary as Record<string, unknown>).map(([key, val]) => (
                  <Card key={key}>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="font-bold text-[#1e3a5f]">{typeof val === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('collected') || key.toLowerCase().includes('disbursed')) ? formatCurrency(val) : String(val)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {reportType === 'arrears' && Array.isArray(reportData) && (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Arrears</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(reportData as Member[]).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.memberNumber}</TableCell>
                      <TableCell>{m.firstName} {m.lastName}</TableCell>
                      <TableCell>{getStatusBadge(m.status)}</TableCell>
                      <TableCell><Badge variant="destructive">{m.arrearsCount} missed</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Member Dashboard
// ============================================
function MemberDashboard({ member }: { member: Member }) {
  const { data, loading } = useFetch(() => api.dashboard.get(`memberId=${member.id}`), [member.id]);

  if (loading || !data) return <LoadingSpinner />;

  const stats = data.stats as Record<string, number>;
  const notifications = (data.notifications || []) as Notification[];
  const memberInfo = data.member as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Welcome, {member.firstName}!</h2>
        <p className="text-muted-foreground">Your welfare membership overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#1e3a5f]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Membership Status</p><div className="mt-1">{getStatusBadge(member.status)}</div></div>
              <Shield className="w-8 h-8 text-[#1e3a5f]/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#c9a227]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Contributions</p><p className="text-2xl font-bold text-[#c9a227]">{formatCurrency(stats.totalContributions || 0)}</p></div>
              <TrendingUp className="w-8 h-8 text-[#c9a227]/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Monthly Payments</p><p className="text-2xl font-bold text-green-600">{stats.monthlyContributionsCount || 0}</p></div>
              <Calendar className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Active Bereavements</p><p className="text-2xl font-bold text-red-600">{stats.activeBereavementEvents || 0}</p></div>
              <Heart className="w-8 h-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* M-Pesa Paybill Info Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="font-semibold text-green-800">M-Pesa Paybill: <span className="font-mono text-lg">123456</span></p>
              <p className="text-sm text-green-700">All welfare payments must be made via M-Pesa Paybill. Go to &quot;My Contributions&quot; to record your payment with the M-Pesa receipt number.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Membership Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3"><Hash className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Member No.</span><span className="font-medium font-mono">{String(memberInfo.memberNumber || '')}</span></div>
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Join Date</span><span className="font-medium">{formatDate(String(memberInfo.joinDate || ''))}</span></div>
            <div className="flex items-center gap-3"><Church className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Church Years</span><span className="font-medium">{String(memberInfo.churchYears || 0)} years</span></div>
            <div className="flex items-center gap-3"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Registration</span>{member.registrationPaid ? <Badge className="bg-green-100 text-green-700">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</div>
            <div className="flex items-center gap-3"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Joining Fee</span>{member.joiningFeePaid ? <Badge className="bg-green-100 text-green-700">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</div>
            {member.arrearsCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">You have {member.arrearsCount} missed contribution(s)</p>
                <p className="text-xs text-red-600 mt-1">
                  {member.arrearsCount >= 6 ? 'You have been removed from the register. Contact admin.' :
                   member.arrearsCount >= 3 ? 'You must wait 6 months before qualifying for benefits.' :
                   'Please settle your arrears to avoid red alert status.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Notifications</CardTitle></CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No new notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 pb-3 border-b last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'warning' ? 'bg-amber-500' : n.type === 'bereavement' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Member Contributions
// ============================================
function MemberContributions({ member }: { member: Member }) {
  const { data: contributionsData, loading: contribLoading, refetch: refetchContribs } = useFetch<Contribution[]>(
    () => api.contributions.list(`memberId=${member.id}`),
    [member.id]
  );
  const contributions = contributionsData ?? [];

  // Payment dialog state
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payForm, setPayForm] = useState({ type: 'monthly', amount: '200', month: '', mpesaReceipt: '' });

  if (contribLoading) return <LoadingSpinner />;

  const monthlyContribs = contributions.filter(c => c.type === 'monthly');
  const otherContribs = contributions.filter(c => c.type !== 'monthly');
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  const handleMakePayment = async () => {
    if (!payForm.mpesaReceipt) return;
    try {
      await api.contributions.create({
        memberId: member.id,
        type: payForm.type,
        amount: parseFloat(payForm.amount),
        month: payForm.type === 'monthly' ? payForm.month || null : null,
        mpesaReceipt: payForm.mpesaReceipt,
        paybillNumber: '123456',
      });
      toast.success('Payment recorded successfully!');
      setShowPayDialog(false);
      setPayForm({ type: 'monthly', amount: '200', month: '', mpesaReceipt: '' });
      refetchContribs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">My Contributions</h2>
          <p className="text-muted-foreground">{contributions.length} records | Total: {formatCurrency(totalAmount)}</p>
        </div>
        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={() => setShowPayDialog(true)}>
          <DollarSign className="w-4 h-4 mr-2" /> Make Payment
        </Button>
      </div>

      {/* M-Pesa Paybill Info Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="font-semibold text-green-800">M-Pesa Paybill: <span className="font-mono text-lg">123456</span></p>
              <p className="text-sm text-green-700">All payments must be made via M-Pesa Paybill. Keep your M-Pesa receipt number as proof of payment.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Make Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>Record your M-Pesa payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">M-Pesa Paybill: <span className="font-mono font-bold">123456</span></p>
              <p className="text-xs text-green-700 mt-1">Send payment via M-Pesa Paybill first, then enter the receipt number below.</p>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={payForm.type} onValueChange={v => {
                const amounts: Record<string, string> = { monthly: '200', registration: '200', joining_fee: member.churchYears <= 2 ? '2600' : '5000', renewal: '200' };
                setPayForm({ ...payForm, type: v, amount: amounts[v] || '200' });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Contribution (Kshs. 200/=)</SelectItem>
                  <SelectItem value="registration">Registration Fee (Kshs. 200/=)</SelectItem>
                  <SelectItem value="joining_fee">Joining Fee ({member.churchYears <= 2 ? 'Kshs. 2,600/=' : 'Kshs. 5,000/='})</SelectItem>
                  <SelectItem value="renewal">Annual Renewal (Kshs. 200/=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (Kshs)</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            {payForm.type === 'monthly' && (
              <div><Label>Month</Label><Input type="month" value={payForm.month} onChange={e => setPayForm({ ...payForm, month: e.target.value })} /></div>
            )}
            <div>
              <Label>M-Pesa Receipt No. <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. QK3A7B2X9Z" value={payForm.mpesaReceipt} onChange={e => setPayForm({ ...payForm, mpesaReceipt: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Enter the M-Pesa transaction receipt number from your SMS confirmation</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleMakePayment} disabled={!payForm.mpesaReceipt}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly ({monthlyContribs.length})</TabsTrigger>
          <TabsTrigger value="other">Other ({otherContribs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {monthlyContribs.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No monthly contributions yet</p>
                  <p className="text-sm text-muted-foreground">Click &quot;Make Payment&quot; to record your first contribution</p>
                </div>
              ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Amount</TableHead><TableHead>M-Pesa Receipt</TableHead><TableHead>Date Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {monthlyContribs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.month || '-'}</TableCell>
                      <TableCell>{formatCurrency(c.amount)}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded">{c.mpesaReceipt}</span></TableCell>
                      <TableCell>{formatDate(c.paidAt)}</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-700">Paid</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {otherContribs.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No other contributions yet</p>
                </div>
              ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>M-Pesa Receipt</TableHead><TableHead>Date Paid</TableHead></TableRow></TableHeader>
                <TableBody>
                  {otherContribs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell><Badge variant="outline">{getContributionTypeLabel(c.type)}</Badge></TableCell>
                      <TableCell>{formatCurrency(c.amount)}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded">{c.mpesaReceipt}</span></TableCell>
                      <TableCell>{formatDate(c.paidAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Member Bereavement Support
// ============================================
function MemberBereavement({ member }: { member: Member }) {
  const { data: eventsData, loading: eventsLoading, refetch: refetchEvents } = useFetch<BereavementEvent[]>(
    () => api.bereavement.list('status=active'), []
  );
  const { data: myContributionsData } = useFetch<Contribution[]>(
    () => api.contributions.list(`memberId=${member.id}&type=bereavement`),
    [member.id]
  );
  const events = eventsData ?? [];
  const myContributions = myContributionsData ?? [];
  const [mpesaDialogEvent, setMpesaDialogEvent] = useState<BereavementEvent | null>(null);
  const [mpesaReceipt, setMpesaReceipt] = useState('');

  if (eventsLoading) return <LoadingSpinner />;

  const hasContributed = (eventId: string) => myContributions.some(c => c.bereavementId === eventId);

  const handleContribute = async () => {
    if (!mpesaDialogEvent || !mpesaReceipt) return;
    try {
      await api.contributions.create({
        memberId: member.id,
        type: 'bereavement',
        amount: mpesaDialogEvent.contributionAmount,
        bereavementId: mpesaDialogEvent.id,
        mpesaReceipt,
        paybillNumber: '123456',
      });
      toast.success('Bereavement contribution recorded!');
      setMpesaDialogEvent(null);
      setMpesaReceipt('');
      refetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record contribution');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Bereavement Support</h2>
        <p className="text-muted-foreground">Active bereavement events and your contributions</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No Active Bereavements</h3>
            <p className="text-muted-foreground">There are no active bereavement events at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#1e3a5f]">{event.deceasedName}</h3>
                    <p className="text-sm text-muted-foreground">{getRelationLabel(event.deceasedRelation)} of {event.member?.firstName} {event.member?.lastName}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Burial: {formatDate(event.burialDate)}</span>
                      <span>Contribution: {formatCurrency(event.contributionAmount)}</span>
                    </div>
                  </div>
                  <div>
                    {hasContributed(event.id) ? (
                      <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Contributed</Badge>
                    ) : (
                      <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={() => { setMpesaDialogEvent(event); setMpesaReceipt(''); }}>
                        <HandHeart className="w-4 h-4 mr-2" /> Contribute {formatCurrency(event.contributionAmount)}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {member.bereavementClaims && member.bereavementClaims.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-3">My Claims</h3>
          <div className="grid gap-3">
            {member.bereavementClaims.map((claim) => (
              <Card key={claim.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formatCurrency(claim.amount)}</p>
                    <p className="text-sm text-muted-foreground">{claim.bereavement?.deceasedName || 'Bereavement Claim'}</p>
                  </div>
                  <Badge variant={claim.status === 'disbursed' ? 'default' : 'secondary'}>{claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* M-Pesa Receipt Dialog for Bereavement Contribution */}
      <Dialog open={!!mpesaDialogEvent} onOpenChange={(open) => { if (!open) setMpesaDialogEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contribute to Bereavement</DialogTitle>
            <DialogDescription>
              {mpesaDialogEvent && `Contribute ${formatCurrency(mpesaDialogEvent.contributionAmount)} for ${mpesaDialogEvent.deceasedName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">M-Pesa Paybill: <span className="font-mono font-bold">123456</span></p>
              <p className="text-xs text-green-700 mt-1">Send {mpesaDialogEvent ? formatCurrency(mpesaDialogEvent.contributionAmount) : ''} via M-Pesa Paybill, then enter the receipt number below.</p>
            </div>
            <div>
              <Label>M-Pesa Receipt No. <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. QK3A7B2X9Z"
                value={mpesaReceipt}
                onChange={e => setMpesaReceipt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the M-Pesa transaction receipt number</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMpesaDialogEvent(null)}>Cancel</Button>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8e]" onClick={handleContribute} disabled={!mpesaReceipt}>
              <HandHeart className="w-4 h-4 mr-2" /> Confirm Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Member Profile
// ============================================
function MemberProfile({ member, onUpdate }: { member: Member; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    churchYears: String(member.churchYears),
  });

  const handleSave = async () => {
    try {
      await api.members.update(member.id, form);
      toast.success('Profile updated!');
      setEditing(false);
      onUpdate();
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const joiningFee = member.churchYears <= 2 ? 2600 : 5000;
  const isEligible = new Date(member.joinDate) <= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">My Profile</h2>
        <p className="text-muted-foreground">View and update your membership details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Button variant="outline" size="sm" onClick={() => editing ? handleSave() : setEditing(!editing)}>
              {editing ? <><CheckCircle className="w-4 h-4 mr-1" /> Save</> : <><Edit className="w-4 h-4 mr-1" /> Edit</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                {editing ? <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /> : <p className="font-medium mt-1">{member.firstName}</p>}
              </div>
              <div>
                <Label>Last Name</Label>
                {editing ? <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /> : <p className="font-medium mt-1">{member.lastName}</p>}
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="flex items-center gap-2 mt-1"><Mail className="w-4 h-4 text-muted-foreground" /><p className="font-medium">{member.email}</p></div>
            </div>
            <div>
              <Label>Phone</Label>
              {editing ? <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /> : <div className="flex items-center gap-2 mt-1"><Phone className="w-4 h-4 text-muted-foreground" /><p className="font-medium">{member.phone}</p></div>}
            </div>
            <div>
              <Label>Church Reg. No.</Label>
              <div className="flex items-center gap-2 mt-1"><Hash className="w-4 h-4 text-muted-foreground" /><p className="font-medium">{member.churchRegNumber}</p></div>
            </div>
            {editing && <div><Label>Church Years</Label><Input type="number" value={form.churchYears} onChange={e => setForm({ ...form, churchYears: e.target.value })} /></div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Membership Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Member No.</span><span className="font-mono font-semibold">{member.memberNumber}</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span>{getStatusBadge(member.status)}</div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Join Date</span><span className="font-medium">{formatDate(member.joinDate)}</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Benefits Eligible</span><Badge variant={isEligible ? 'default' : 'destructive'}>{isEligible ? 'Yes' : 'No (3-month wait)'}</Badge></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Arrears</span><Badge variant={member.arrearsCount > 0 ? 'destructive' : 'outline'}>{member.arrearsCount > 0 ? `${member.arrearsCount} missed` : 'Clear'}</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Fee Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Registration (Kshs. 200)</span><Badge variant={member.registrationPaid ? 'default' : 'destructive'}>{member.registrationPaid ? 'Paid' : 'Unpaid'}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Joining Fee ({formatCurrency(joiningFee)})</span><Badge variant={member.joiningFeePaid ? 'default' : 'destructive'}>{member.joiningFeePaid ? 'Paid' : 'Unpaid'}</Badge></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main App
// ============================================
export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize member from session storage using lazy state initializer
  const [member, setMember] = useState<Member | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('welfare_member');
    if (saved) {
      try { return JSON.parse(saved); } catch { sessionStorage.removeItem('welfare_member'); }
    }
    return null;
  });

  const handleLogin = (m: Member) => {
    setMember(m);
    setActiveView('dashboard');
    sessionStorage.setItem('welfare_member', JSON.stringify(m));
  };

  const handleLogout = () => {
    setMember(null);
    setActiveView('dashboard');
    sessionStorage.removeItem('welfare_member');
  };

  const refreshMember = async () => {
    if (member) {
      const data = await api.members.get(member.id);
      setMember(data);
      sessionStorage.setItem('welfare_member', JSON.stringify(data));
    }
  };

  if (!member) return <LoginView onLogin={handleLogin} />;

  const isAdmin = member.role === 'admin';

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
    { id: 'contributions', label: 'Contributions', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'bereavement', label: 'Bereavement', icon: <Heart className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  ];

  const memberNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'contributions', label: 'My Contributions', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'bereavement', label: 'Bereavement Support', icon: <Heart className="w-4 h-4" /> },
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
  ];

  const navItems = isAdmin ? adminNavItems : memberNavItems;

  const renderContent = () => {
    if (isAdmin) {
      switch (activeView) {
        case 'dashboard': return <AdminDashboard />;
        case 'members': return <AdminMembers />;
        case 'contributions': return <AdminContributions />;
        case 'bereavement': return <AdminBereavement />;
        case 'notifications': return <AdminNotifications />;
        case 'reports': return <AdminReports />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (activeView) {
        case 'dashboard': return <MemberDashboard member={member} />;
        case 'contributions': return <MemberContributions member={member} />;
        case 'bereavement': return <MemberBereavement member={member} />;
        case 'profile': return <MemberProfile member={member} onUpdate={refreshMember} />;
        default: return <MemberDashboard member={member} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        items={navItems}
        activeView={activeView}
        onViewChange={setActiveView}
        member={member}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="hidden sm:inline">St. Monica Welfare</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-foreground">{navItems.find(i => i.id === activeView)?.label || 'Dashboard'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.arrearsCount > 0 && (
                <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> {member.arrearsCount} Arrears</Badge>
              )}
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {member.firstName[0]}{member.lastName[0]}
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
