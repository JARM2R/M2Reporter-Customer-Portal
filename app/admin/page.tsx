'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Company {
  id: number;
  company_name: string;
  account_status: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_activated: boolean;
  company_id: number;
  company_name: string;
  account_status: string;
  created_at: string;
  last_login: string;
}

interface Folder {
  id: number;
  folder_name: string;
  folder_type: string;
  blob_prefix: string;
  company_id: number;
  company_name: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'folders'>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    companyId: '',
    role: 'customer'
  });
  const [newFolder, setNewFolder] = useState({
    folderName: '',
    folderType: 'company_specific',
    companyId: ''
  });

  useEffect(() => {
  if (status === 'unauthenticated') {
    router.replace('/login');
  } else if (status === 'authenticated') {
    if (session?.user?.role !== 'admin') {
      router.replace('/dashboard');
    } else {
      loadData();
    }
  }
}, [status, session, router]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCompanies(),
        loadUsers(),
        loadFolders()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    const response = await fetch('/api/admin/companies/list');
    const data = await response.json();
    if (data.success) {
      setCompanies(data.companies);
    }
  };

  const loadUsers = async () => {
    const response = await fetch('/api/admin/users/list');
    const data = await response.json();
    if (data.success) {
      setUsers(data.users);
    }
  };

  const loadFolders = async () => {
    const response = await fetch('/api/admin/folders/list');
    const data = await response.json();
    if (data.success) {
      setFolders(data.folders);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/admin/companies/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: newCompanyName })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Company created successfully!');
      setNewCompanyName('');
      loadCompanies();
    } else {
      alert(data.error || 'Failed to create company');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        companyId: parseInt(newUser.companyId),
        role: newUser.role
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('User created successfully!');
      setNewUser({ username: '', email: '', password: '', companyId: '', role: 'user' });
      loadUsers();
    } else {
      alert(data.error || 'Failed to create user');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/admin/folders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: newFolder.folderName,
        folderType: newFolder.folderType,
        companyId: newFolder.companyId ? parseInt(newFolder.companyId) : null
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Folder created successfully!');
      setNewFolder({ folderName: '', folderType: 'company_specific', companyId: '' });
      loadFolders();
    } else {
      alert(data.error || 'Failed to create folder');
    }
  };

 // Don't show anything until we verify admin access
if (status === 'loading' || loading || !session || session.user.role !== 'admin') {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      {status === 'loading' || loading ? <div>Loading...</div> : null}
    </div>
  );
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
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>
              Admin Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Manage companies, users, and folders
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
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
            ← Back to Portal
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('companies')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'companies' ? '#144478' : 'transparent',
              color: activeTab === 'companies' ? 'white' : '#144478',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Companies ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'users' ? '#144478' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#144478',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === 'folders' ? '#144478' : 'transparent',
              color: activeTab === 'folders' ? 'white' : '#144478',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Folders ({folders.length})
          </button>
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Create Company Form */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Create New Company</h2>
                <form onSubmit={handleCreateCompany}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#B3CC48',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Create Company
                  </button>
                </form>
              </div>

              {/* Companies List */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Existing Companies</h2>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      style={{
                        padding: '15px',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                          {company.company_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Status: {company.account_status} | ID: {company.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Create User Form */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Create New User</h2>
                <form onSubmit={handleCreateUser}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Company *
                    </label>
                    <select
                      value={newUser.companyId}
                      onChange={(e) => setNewUser({...newUser, companyId: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Role *
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#B3CC48',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Create Customer
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Existing Users</h2>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {users.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        padding: '15px',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        {user.username} ({user.role})
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {user.email} | {user.company_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                        Status: {user.is_activated ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Folders Tab */}
        {activeTab === 'folders' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Create Folder Form */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Create New Folder</h2>
                <form onSubmit={handleCreateFolder}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Folder Name *
                    </label>
                    <input
                      type="text"
                      value={newFolder.folderName}
                      onChange={(e) => setNewFolder({...newFolder, folderName: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                      Folder Type *
                    </label>
                    <select
                      value={newFolder.folderType}
                      onChange={(e) => setNewFolder({...newFolder, folderType: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="program_files">Program Files (All users)</option>
                      <option value="shared">Shared (All users)</option>
                      <option value="company_specific">Company Specific</option>
                    </select>
                  </div>
                  {newFolder.folderType === 'company_specific' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Company *
                      </label>
                      <select
                        value={newFolder.companyId}
                        onChange={(e) => setNewFolder({...newFolder, companyId: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#B3CC48',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Create Folder
                  </button>
                </form>
              </div>

              {/* Folders List */}
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478' }}>Existing Folders</h2>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      style={{
                        padding: '15px',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        📁 {folder.folder_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Type: {folder.folder_type.replace('_', ' ')}
                        {folder.company_name && ` | Company: ${folder.company_name}`}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                        Path: {folder.blob_prefix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}