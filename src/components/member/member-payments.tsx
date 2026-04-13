'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberContributions } from './member-contributions';
import { MemberRenewals } from './member-renewals';
import { MemberCases } from './member-cases';

export function MemberPayments() {
  return (
    <Tabs defaultValue="contributions" className="space-y-4">
      <TabsList className="w-full justify-start bg-muted">
        <TabsTrigger value="contributions">Monthly Contributions</TabsTrigger>
        <TabsTrigger value="renewals">Annual Renewals</TabsTrigger>
        <TabsTrigger value="cases">Cases</TabsTrigger>
      </TabsList>
      <TabsContent value="contributions"><MemberContributions /></TabsContent>
      <TabsContent value="renewals"><MemberRenewals /></TabsContent>
      <TabsContent value="cases"><MemberCases /></TabsContent>
    </Tabs>
  );
}
