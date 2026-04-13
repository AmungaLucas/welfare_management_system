'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Save, Phone, MapPin, Users, Wallet, Heart, Edit2, X } from 'lucide-react';
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
    } catch {
      toast.error('Failed to load profile');
    }
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
      if (res.ok) {
        toast.success('Profile updated successfully');
        setEditing(false);
        fetchProfile();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const update = (key: string, value: string | number | boolean | null) => {
    setProfile({ ...profile, [key]: value });
  };

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const fullName = `${profile.firstName}${profile.otherNames ? ` ${profile.otherNames}` : ''} ${profile.lastName}`;
  const initials = `${String(profile.firstName || '')[0] || ''}${String(profile.lastName || '')[0] || ''}`;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{fullName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">{String(profile.churchMembershipNo)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-xs`}>
                {String(profile.status).replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); fetchProfile(); }}>
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5 mr-1" />Save Changes
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">First Name</Label>
              {editing
                ? <Input value={String(profile.firstName)} onChange={(e) => update('firstName', e.target.value)} className="mt-1 h-9" />
                : <p className="text-sm mt-1 font-medium">{String(profile.firstName)}</p>
              }
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              {editing
                ? <Input value={String(profile.lastName)} onChange={(e) => update('lastName', e.target.value)} className="mt-1 h-9" />
                : <p className="text-sm mt-1 font-medium">{String(profile.lastName)}</p>
              }
            </div>
          </div>
          {profile.otherNames && (
            <div>
              <Label className="text-xs text-muted-foreground">Other Names</Label>
              {editing
                ? <Input value={String(profile.otherNames)} onChange={(e) => update('otherNames', e.target.value)} className="mt-1 h-9" />
                : <p className="text-sm mt-1 font-medium">{String(profile.otherNames)}</p>
              }
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Phone Number</Label>
            {editing
              ? <Input value={String(profile.phone)} onChange={(e) => update('phone', e.target.value)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.phone)}</p>
            }
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email Address</Label>
            {editing
              ? <Input value={String(profile.email || '')} onChange={(e) => update('email', e.target.value)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.email || '\u2014')}</p>
            }
          </div>
        </CardContent>
      </Card>

      {/* Church & Welfare Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Church & Welfare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Membership No.</span>
            <span className="text-xs font-mono font-medium">{String(profile.churchMembershipNo)}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">District</span>
            <span className="text-xs font-medium">{profile.district ? String((profile.district as Record<string, unknown>).name) : '\u2014'}</span>
          </div>
          {profile.dateJoinedWelfare && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Joined Welfare</span>
              <span className="text-xs font-medium">{new Date(String(profile.dateJoinedWelfare)).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold text-teal-700">
                Ksh {Number(profile.walletBalance).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Family Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Spouse Name</Label>
            {editing
              ? <Input value={String(profile.spouseName || '')} onChange={(e) => update('spouseName', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.spouseName || '\u2014')}</p>
            }
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Father's Name</Label>
            {editing
              ? <Input value={String(profile.fatherName || '')} onChange={(e) => update('fatherName', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.fatherName || '\u2014')}</p>
            }
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Mother's Name</Label>
            {editing
              ? <Input value={String(profile.motherName || '')} onChange={(e) => update('motherName', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.motherName || '\u2014')}</p>
            }
          </div>
        </CardContent>
      </Card>

      {/* Next of Kin */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Next of Kin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            {editing
              ? <Input value={String(profile.nextOfKinName || '')} onChange={(e) => update('nextOfKinName', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.nextOfKinName || '\u2014')}</p>
            }
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone Number</Label>
            {editing
              ? <Input value={String(profile.nextOfKinPhone || '')} onChange={(e) => update('nextOfKinPhone', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.nextOfKinPhone || '\u2014')}</p>
            }
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Relationship</Label>
            {editing
              ? <Input value={String(profile.nextOfKinRelationship || '')} onChange={(e) => update('nextOfKinRelationship', e.target.value || null)} className="mt-1 h-9" />
              : <p className="text-sm mt-1 font-medium">{String(profile.nextOfKinRelationship || '\u2014')}</p>
            }
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Children (Bereavement Coverage)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.children && Array.isArray(profile.children) && (profile.children as Record<string, unknown>[]).length > 0 ? (
            <div className="space-y-2">
              {(profile.children as Record<string, unknown>[]).map((child) => (
                <div key={String(child.id)} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{String(child.fullName)}</p>
                    <p className="text-xs text-muted-foreground">
                      {child.dateOfBirth
                        ? `DOB: ${new Date(String(child.dateOfBirth)).toLocaleDateString()}`
                        : 'No DOB provided'}
                    </p>
                  </div>
                  <Badge
                    variant={child.isAlive ? 'secondary' : 'destructive'}
                    className="text-xs shrink-0"
                  >
                    {child.isAlive ? 'Alive' : 'Deceased'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No children registered</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
