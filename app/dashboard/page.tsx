'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Folder {
  id: number;
  folder_name: string;
  folder_type: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadFolders();
    }
  }, [status, router]);

  const loadFolders = async () => {
    try {
      const response = await fetch('/api/folders/list');
      const data = await response.json();
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#144478',
        color: 'white',
        padding: '20px 40px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>
              M2 Reporter
            </h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              {session.user.companyName}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '14px' }}>
              {session.user.name}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <h2 style={{
          fontSize: '28px',
          color: '#144478',
          marginBottom: '30px'
        }}>
          Your Files
        </h2>

        {session.user.accountStatus === 'past_due' && (
          <div style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '30px',
            border: '1px solid #ffeeba'
          }}>
            ⚠️ Your account has a past due balance. Please contact support to restore full access.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => router.push(`/files?folderId=${folder.id}`)}
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#B3CC48';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{
                fontSize: '36px',
                marginBottom: '15px'
              }}>
                📁
              </div>
              <h3 style={{
                fontSize: '18px',
                color: '#144478',
                margin: '0 0 8px 0'
              }}>
                {folder.folder_name}
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#666',
                margin: 0
              }}>
                {folder.folder_type === 'shared' && 'Shared Files'}
                {folder.folder_type === 'program_files' && 'Program Files'}
                {folder.folder_type === 'company_specific' && 'Company Data'}
              </p>
            </div>
          ))}
        </div>

        {folders.length === 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p>No folders available yet.</p>
            <p style={{ fontSize: '14px' }}>
              Contact support if you need access to files.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
