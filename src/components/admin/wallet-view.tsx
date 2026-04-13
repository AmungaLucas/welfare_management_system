'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PiggyBank, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface MemberWallet {
  id: string;
  firstName: string;
  lastName: string;
  churchMembershipNo: string;
  district: { name: string };
  walletBalance: number;
  status: string;
}

export function WalletView() {
  const [wallets, setWallets] = useState<MemberWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'balance' | 'name'>('balance');

  useEffect(() => {
    fetch('/api/members?limit=200&status=ACTIVE')
      .then((r) => r.json())
      .then((data) => {
        const members: MemberWallet[] = (data.members || []).map((m: Record<string, unknown>) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          churchMembershipNo: m.churchMembershipNo,
          district: m.district,
          walletBalance: Number(m.walletBalance || 0),
          status: m.status,
        }));
        setWallets(members);
      })
      .catch(() => toast.error('Failed to load wallets'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...wallets].sort((a, b) => {
    if (sortBy === 'balance') return b.walletBalance - a.walletBalance;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });

  const totalBalance = wallets.reduce((s, w) => s + w.walletBalance, 0);
  const withBalance = wallets.filter((w) => w.walletBalance > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Wallet Balance</p>
              <p className="text-lg font-bold">Ksh {totalBalance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members with Balance</p>
              <p className="text-lg font-bold">{withBalance}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-navy-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-navy-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Balance</p>
              <p className="text-lg font-bold">
                Ksh {withBalance > 0 ? Math.round(totalBalance / withBalance).toLocaleString() : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={sortBy === 'balance' ? 'default' : 'outline'}
          onClick={() => setSortBy('balance')} className="text-xs">
          <ArrowUpDown className="h-3 w-3 mr-1" />By Balance
        </Button>
        <Button size="sm" variant={sortBy === 'name' ? 'default' : 'outline'}
          onClick={() => setSortBy('name')} className="text-xs">
          <ArrowUpDown className="h-3 w-3 mr-1" />By Name
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Membership No</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">District</TableHead>
                  <TableHead className="text-xs text-right">Wallet Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(4)].map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No wallets found</TableCell>
                  </TableRow>
                ) : (
                  sorted.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{w.firstName} {w.lastName}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono">{w.churchMembershipNo}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{w.district?.name}</TableCell>
                      <TableCell className="text-right">
                        <span className={w.walletBalance > 0 ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}>
                          Ksh {w.walletBalance.toLocaleString()}
                        </span>
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
