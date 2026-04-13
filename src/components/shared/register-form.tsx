'use client';

import { useState } from 'react';
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
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
   
  useState(() => {
    setDistricts([
      { id: 1, name: 'BETHLEHEM' },
      { id: 2, name: 'SAMARIA' },
      { id: 3, name: 'NAZARETH' },
      { id: 4, name: 'JERUSALEM' },
      { id: 5, name: 'GALILEE' },
      { id: 6, name: 'BETHANY' },
      { id: 7, name: 'JUDEA' },
      { id: 8, name: 'DIASPORA' },
      { id: 9, name: 'UNIVERSAL' },
    ]);
  });

  const [form, setForm] = useState({
    churchMembershipNo: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    districtId: '',
    password: '',
    confirmPassword: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
  });

  useState(() => {
    fetch('/api/members?limit=1')
      .then(() => {})
      .catch(() => {});
    // Static districts since no separate endpoint
    setDistricts([
      { id: 1, name: 'BETHLEHEM' },
      { id: 2, name: 'SAMARIA' },
      { id: 3, name: 'NAZARETH' },
      { id: 4, name: 'JERUSALEM' },
      { id: 5, name: 'GALILEE' },
      { id: 6, name: 'BETHANY' },
      { id: 7, name: 'JUDEA' },
      { id: 8, name: 'DIASPORA' },
      { id: 9, name: 'UNIVERSAL' },
    ]);
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.success(data.message || 'Registration successful!');
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Church Membership No *</Label>
              <Input placeholder="ACK/UTW/BTH/001" value={form.churchMembershipNo} onChange={(e) => update('churchMembershipNo', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">District *</Label>
              <Select value={form.districtId} onValueChange={(v) => update('districtId', v)} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
