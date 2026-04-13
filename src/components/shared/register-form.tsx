'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Church, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

interface District {
  id: number;
  name: string;
  code: string;
}

const DISTRICTS: District[] = [
  { id: 1, name: 'BETHLEHEM', code: 'BTH' },
  { id: 2, name: 'SAMARIA', code: 'SAM' },
  { id: 3, name: 'NAZARETH', code: 'NAZ' },
  { id: 4, name: 'JERUSALEM', code: 'JER' },
  { id: 5, name: 'GALILEE', code: 'GAL' },
  { id: 6, name: 'BETHANY', code: 'BTN' },
  { id: 7, name: 'JUDEA', code: 'JUD' },
  { id: 8, name: 'DIASPORA', code: 'DSP' },
  { id: 9, name: 'UNIVERSAL', code: 'UNI' },
];

const MEMBERSHIP_PREFIX = 'ACK/UTW';

function getDistrictCode(districtId: string): string {
  const d = DISTRICTS.find((dist) => String(dist.id) === districtId);
  return d?.code || '---';
}

function buildMembershipNo(districtId: string, memberNum: string): string {
  const code = getDistrictCode(districtId);
  const num = memberNum.trim().padStart(3, '0');
  return `${MEMBERSHIP_PREFIX}/${code}/${num}`;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    memberNumber: '',
    churchMembershipNo: '',
    districtId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Auto-build full membership code when district or number changes
  const fullCode = form.memberNumber.trim() && form.districtId
    ? buildMembershipNo(form.districtId, form.memberNumber)
    : '';

  useEffect(() => {
    if (form.memberNumber.trim() && form.districtId) {
      setForm((f) => ({
        ...f,
        churchMembershipNo: buildMembershipNo(f.districtId, f.memberNumber),
      }));
    } else {
      setForm((f) => ({ ...f, churchMembershipNo: '' }));
    }
  }, [form.districtId, form.memberNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.memberNumber.trim() || !form.districtId) {
      toast.error('Please select your district and enter your membership number');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchMembershipNo: form.churchMembershipNo,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email || undefined,
          districtId: parseInt(form.districtId),
          password: form.password,
          nextOfKinName: form.nextOfKinName || undefined,
          nextOfKinPhone: form.nextOfKinPhone || undefined,
          nextOfKinRelationship: form.nextOfKinRelationship || undefined,
        }),
      });
      const data: { message?: string; error?: string } = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Registration successful! Awaiting admin approval.');
        onSwitchToLogin();
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-navy-200 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-navy-900">
          <Church className="h-8 w-8 text-church-gold" />
        </div>
        <CardTitle className="text-2xl font-bold text-navy-900">Member Registration</CardTitle>
        <CardDescription className="text-navy-600">
          Register for the ACK St. Monica Welfare Program
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Membership Number — smart auto-fill */}
          <div className="space-y-1">
            <Label className="text-xs">Church Membership No *</Label>
            <div className="flex gap-0 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-navy-500 focus-within:ring-offset-1">
              <div className="flex items-center px-2.5 bg-muted/60 text-[11px] font-mono font-medium text-navy-800 whitespace-nowrap select-all border-r border-input">
                {MEMBERSHIP_PREFIX}/
              </div>
              <Select value={form.districtId} onValueChange={(v) => update('districtId', v)}>
                <SelectTrigger className="border-0 ring-0 focus-visible:ring-0 shadow-none h-9 text-[11px] font-mono font-medium text-navy-800 bg-muted/40 rounded-none min-w-[70px]">
                  <SelectValue placeholder="---" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center px-1 bg-muted/60 text-[11px] font-mono font-medium text-navy-800 border-x border-input">
                /
              </div>
              <Input
                placeholder="001"
                value={form.memberNumber}
                onChange={(e) => update('memberNumber', e.target.value)}
                className="border-0 ring-0 focus-visible:ring-0 shadow-none font-mono text-sm tracking-wider"
                maxLength={4}
                required
              />
            </div>
            {fullCode && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Full: <span className="font-mono font-medium text-navy-700">{fullCode}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First Name *</Label>
              <Input placeholder="John" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name *</Label>
              <Input placeholder="Mwangi" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input type="tel" placeholder="0711000001" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email (optional)</Label>
              <Input type="email" placeholder="john@email.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Password *</Label>
              <Input type="password" placeholder="Min 6 chars" value={form.password} onChange={(e) => update('password', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm Password *</Label>
              <Input type="password" placeholder="Re-enter" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Next of Kin Name</Label>
              <Input placeholder="Peter" value={form.nextOfKinName} onChange={(e) => update('nextOfKinName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kin Phone</Label>
              <Input placeholder="0711..." value={form.nextOfKinPhone} onChange={(e) => update('nextOfKinPhone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Relationship</Label>
              <Input placeholder="Brother" value={form.nextOfKinRelationship} onChange={(e) => update('nextOfKinRelationship', e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full bg-navy-900 hover:bg-navy-800" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering...</> : 'Register'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onSwitchToLogin} className="text-navy-600">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
