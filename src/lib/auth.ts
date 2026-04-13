import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        churchMembershipNo: { label: 'Church Membership No', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Admin login via email/password
        if (credentials.email && credentials.password) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { member: true },
          });

          if (!user) return null;
          if (!user.isActive) return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            phone: user.phone,
            memberId: user.member?.id || null,
            memberStatus: user.member?.status || null,
          };
        }

        // Member login via church membership number + phone
        if (credentials.churchMembershipNo && credentials.phone) {
          const member = await prisma.member.findUnique({
            where: { churchMembershipNo: credentials.churchMembershipNo },
            include: { user: true },
          });

          if (!member) return null;
          if (member.phone !== credentials.phone) return null;
          if (!member.userId) return null;
          if (!member.user?.isActive) return null;

          return {
            id: member.user.id,
            email: member.user.email,
            role: member.user.role,
            phone: member.user.phone || member.phone,
            memberId: member.id,
            memberStatus: member.status,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.memberId = user.memberId;
        token.memberStatus = user.memberStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.memberId = token.memberId as string | null;
        session.user.memberStatus = token.memberStatus as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
