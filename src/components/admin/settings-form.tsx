'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';

interface SystemSettings {
  id: string;
  monthlyContributionAmount: number;
  registrationFee: number;
  annualRenewalFee: number;
  joiningFeeNewMember: number;
  joiningFeeOldMember: number;
  nuclearBenefitAmount: number;
  parentBenefitAmount: number;
  nuclearContributionPerMember: number;
  parentContributionPerMember: number;
  childCoverageMaxAge: number;
  waitingPeriodMonths: number;
  redAlertThreshold: number;
  suspensionThreshold: number;
  suspensionDurationMonths: number;
  removalThreshold: number;
  maxBurialAttendees: number;
  newChurchMemberYears: number;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) { toast.success('Settings saved'); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const update = (key: keyof SystemSettings, value: number) => {
    if (settings) setSettings({ ...settings, [key]: value });
  };

  if (loading || !settings) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => (
      <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>
    ))}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">System Configuration</h3>
          <p className="text-sm text-muted-foreground">Configure contribution amounts, thresholds, and policies</p>
        </div>
        <Button className="bg-navy-900 hover:bg-navy-800" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contribution Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Monthly Contribution (Ksh)" value={settings.monthlyContributionAmount}
              onChange={(v) => update('monthlyContributionAmount', v)} />
            <Field label="Registration Fee (Ksh)" value={settings.registrationFee}
              onChange={(v) => update('registrationFee', v)} />
            <Field label="Annual Renewal Fee (Ksh)" value={settings.annualRenewalFee}
              onChange={(v) => update('annualRenewalFee', v)} />
            <Field label="Joining Fee - New Member (Ksh)" value={settings.joiningFeeNewMember}
              onChange={(v) => update('joiningFeeNewMember', v)} />
            <Field label="Joining Fee - Old Member (Ksh)" value={settings.joiningFeeOldMember}
              onChange={(v) => update('joiningFeeOldMember', v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Bereavement Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Nuclear Benefit Amount (Ksh)" value={settings.nuclearBenefitAmount}
              onChange={(v) => update('nuclearBenefitAmount', v)} />
            <Field label="Parent Benefit Amount (Ksh)" value={settings.parentBenefitAmount}
              onChange={(v) => update('parentBenefitAmount', v)} />
            <Field label="Nuclear Contribution/Member (Ksh)" value={settings.nuclearContributionPerMember}
              onChange={(v) => update('nuclearContributionPerMember', v)} />
            <Field label="Parent Contribution/Member (Ksh)" value={settings.parentContributionPerMember}
              onChange={(v) => update('parentContributionPerMember', v)} />
            <Field label="Child Coverage Max Age" value={settings.childCoverageMaxAge}
              onChange={(v) => update('childCoverageMaxAge', v)} />
            <Field label="Max Burial Attendees" value={settings.maxBurialAttendees}
              onChange={(v) => update('maxBurialAttendees', v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Arrears & Enforcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Waiting Period (months)" value={settings.waitingPeriodMonths}
              onChange={(v) => update('waitingPeriodMonths', v)} />
            <Field label="Red Alert Threshold (arrears)" value={settings.redAlertThreshold}
              onChange={(v) => update('redAlertThreshold', v)} />
            <Field label="Suspension Threshold (defaults)" value={settings.suspensionThreshold}
              onChange={(v) => update('suspensionThreshold', v)} />
            <Field label="Suspension Duration (months)" value={settings.suspensionDurationMonths}
              onChange={(v) => update('suspensionDurationMonths', v)} />
            <Field label="Removal Threshold (defaults)" value={settings.removalThreshold}
              onChange={(v) => update('removalThreshold', v)} />
            <Field label="New Church Member (years)" value={settings.newChurchMemberYears}
              onChange={(v) => update('newChurchMemberYears', v)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="h-8" />
    </div>
  );
}
