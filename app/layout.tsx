import SessionProvider from '@/components/SessionProvider';
import './globals.css';

export const metadata = {
  title: 'M2 Reporter - Customer Portal',
  description: 'Secure customer portal for M2 Reporter',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
