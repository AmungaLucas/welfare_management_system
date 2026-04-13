'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, Download, AlertTriangle, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface ArrearMember {
  id: string;
  name: string;
  churchMembershipNo: string;
  district: string;
  phone: string;
  consecutiveArrears: number;
  totalDefaultEvents: number;
  lastPayment: string | null;
  status: string;
}

export function ReportsView() {
  const [arrears, setArrears] = useState<ArrearMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/arrears')
      .then((r) => r.json())
      .then((data) => {
        setArrears(data.members || []);
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ['Name', 'Membership No', 'District', 'Phone', 'Consecutive Arrears', 'Total Defaults', 'Status'];
    const rows = arrears.map((m) => [m.name, m.churchMembershipNo, m.district, m.phone, m.consecutiveArrears, m.totalDefaultEvents, m.status]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arrears_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members with Arrears</p>
              <p className="text-lg font-bold">{arrears.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Red Alert</p>
              <p className="text-lg font-bold">{arrears.filter((a) => a.status === 'RED_ALERT').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Warning</p>
              <p className="text-lg font-bold">{arrears.filter((a) => a.status === 'WARNING').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Arrears Report</CardTitle>
            <CardDescription className="text-xs">Members with outstanding monthly contributions</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Membership No</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">District</TableHead>
                  <TableHead className="text-xs">Arrears</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Defaults</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : arrears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No arrears reported
                    </TableCell>
                  </TableRow>
                ) : (
                  arrears.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.phone}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono">{m.churchMembershipNo}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{m.district}</TableCell>
                      <TableCell className="font-semibold">{m.consecutiveArrears}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{m.totalDefaultEvents}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'RED_ALERT' ? 'destructive' : 'secondary'}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
