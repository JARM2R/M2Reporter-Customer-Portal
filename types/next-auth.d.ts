import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    companyId: number;
    companyName: string;
    role: string;
    accountStatus: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      companyId: number;
      companyName: string;
      role: string;
      accountStatus: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    companyId: number;
    companyName: string;
    role: string;
    accountStatus: string;
  }
}
