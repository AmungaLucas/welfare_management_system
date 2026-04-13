// Extend NextAuth types
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      phone?: string | null;
      memberId?: string | null;
      memberStatus?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    phone?: string | null;
    memberId?: string | null;
    memberStatus?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    memberId?: string | null;
    memberStatus?: string | null;
  }
}
