'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { User, Save, Phone, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

export function MemberProfile() {
  const { session } = useAuth();
  const memberId = session?.user?.memberId;
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchProfile = async () => {
    if (!memberId) return;
    try {
      const res = await fetch(`/api/members/${memberId}`);
      const data = await res.json();
      setProfile(data.member);
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

   
  useEffect(() => { fetchProfile(); }, [memberId]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) { toast.success('Profile updated'); setEditing(false); fetchProfile(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch { toast.error('Failed to save'); }
  };

  if (loading || !profile) {
    return <Card className="animate-pulse"><CardContent className="p-6"><div className="h-64 bg-muted rounded" /></CardContent></Card>;
  }

  const update = (key: string, value: string | number | boolean | null) => {
    setProfile({ ...profile, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">My Profile</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); fetchProfile(); }}>Cancel</Button>
              <Button size="sm" className="bg-navy-900" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <User className="h-4 w-4 mr-1" />Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
                {editing ? <Input value={profile.firstName} onChange={(e) => update('firstName', e.target.value)} className="h-8" /> : <p className="text-sm mt-1">{profile.firstName}</p>}
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                {editing ? <Input value={profile.lastName} onChange={(e) => update('lastName', e.target.value)} className="h-8" /> : <p className="text-sm mt-1">{profile.lastName}</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs">Membership No</Label>
              <p className="text-sm font-mono mt-1">{profile.churchMembershipNo}</p>
            </div>
            <div>
              <Label className="text-xs">Welfare No</Label>
              <p className="text-sm mt-1">#{profile.welfareNo}</p>
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              {editing ? <Input value={profile.phone} onChange={(e) => update('phone', e.target.value)} className="h-8" /> : <p className="text-sm mt-1">{profile.phone}</p>}
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              {editing ? <Input value={profile.email || ''} onChange={(e) => update('email', e.target.value)} className="h-8" /> : <p className="text-sm mt-1">{profile.email || '—'}</p>}
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Badge className={`${profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-xs mt-1`}>
                {profile.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Family Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Family Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">District</Label>
              <p className="text-sm mt-1">{profile.district?.name}</p>
            </div>
            <div>
              <Label className="text-xs">Spouse Name</Label>
              {editing ? <Input value={profile.spouseName || ''} onChange={(e) => update('spouseName', e.target.value || null)} className="h-8" /> : <p className="text-sm mt-1">{profile.spouseName || '—'}</p>}
            </div>
            <div>
              <Label className="text-xs">Wallet Balance</Label>
              <p className="text-lg font-bold text-teal-700">Ksh {Number(profile.walletBalance).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Next of Kin */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Next of Kin</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              {editing ? <Input value={profile.nextOfKinName || ''} onChange={(e) => update('nextOfKinName', e.target.value || null)} className="h-8" /> : <p className="text-sm mt-1">{profile.nextOfKinName || '—'}</p>}
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              {editing ? <Input value={profile.nextOfKinPhone || ''} onChange={(e) => update('nextOfKinPhone', e.target.value || null)} className="h-8" /> : <p className="text-sm mt-1">{profile.nextOfKinPhone || '—'}</p>}
            </div>
            <div>
              <Label className="text-xs">Relationship</Label>
              {editing ? <Input value={profile.nextOfKinRelationship || ''} onChange={(e) => update('nextOfKinRelationship', e.target.value || null)} className="h-8" /> : <p className="text-sm mt-1">{profile.nextOfKinRelationship || '—'}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Children (Bereavement Coverage)</CardTitle></CardHeader>
          <CardContent>
            {profile.children?.length > 0 ? (
              <div className="space-y-2">
                {profile.children.map((child: Record<string, unknown>) => (
                  <div key={String(child.id)} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm">{String(child.fullName)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {child.dateOfBirth ? `DOB: ${new Date(String(child.dateOfBirth)).toLocaleDateString()}` : 'No DOB'}
                      </p>
                    </div>
                    <Badge variant={child.isAlive ? 'secondary' : 'destructive'} className="text-[10px]">
                      {child.isAlive ? 'Alive' : 'Deceased'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No children registered</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
