'use client';

import { useState } from 'react';
import { useSignIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Church, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('admin@welfare.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useSignIn();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error('Login failed', { description: result.error });
    } else {
      toast.success('Welcome back!');
    }
  };

  const [churchNo, setChurchNo] = useState('');
  const [phone, setPhone] = useState('');

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchNo || !phone) {
      toast.error('Please enter both membership number and phone');
      return;
    }
    setLoading(true);
    const result = await signIn('credentials', {
      churchMembershipNo: churchNo,
      phone,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error('Login failed', { description: 'Invalid membership number or phone' });
    } else {
      toast.success('Welcome back!');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-navy-200 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-navy-900">
          <Church className="h-8 w-8 text-church-gold" />
        </div>
        <CardTitle className="text-2xl font-bold text-navy-900">
          ACK St. Monica Parish
        </CardTitle>
        <CardDescription className="text-navy-600">
          Welfare Management System — Utawala
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
            <TabsTrigger value="member">Member Login</TabsTrigger>
          </TabsList>

          <TabsContent value="admin">
            <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@welfare.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-navy-900 hover:bg-navy-800" disabled={loading}>
                {loading ? 'Signing in...' : <><LogIn className="h-4 w-4 mr-2" />Sign In</>}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="member">
            <form onSubmit={handleMemberLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="churchNo">Church Membership No.</Label>
                <Input
                  id="churchNo"
                  placeholder="e.g. ACK/UTW/BTH/001"
                  value={churchNo}
                  onChange={(e) => setChurchNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberPhone">Phone Number</Label>
                <Input
                  id="memberPhone"
                  type="tel"
                  placeholder="0711000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full bg-navy-900 hover:bg-navy-800" disabled={loading}>
                {loading ? 'Signing in...' : <><LogIn className="h-4 w-4 mr-2" />Sign In</>}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={onSwitchToRegister} className="text-navy-600">
            <UserPlus className="h-4 w-4 mr-2" />New Member? Register Here
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
