'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

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

interface FileItem {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'folders' | 'files'>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  const loadFiles = async (folder: Folder) => {
    setSelectedFolder(folder);
    const response = await fetch(`/api/files/list?folderId=${folder.id}`);
    const data = await response.json();
    if (data.success) {
      setFiles(data.files);
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

  const handleDeleteCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"?\n\nThis will also delete all associated folders. Users must be deleted first.`)) {
      return;
    }

    const response = await fetch('/api/admin/companies/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Company deleted successfully!');
      loadCompanies();
      loadFolders();
    } else {
      alert(data.error || 'Failed to delete company');
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
      setNewUser({ username: '', email: '', password: '', companyId: '', role: 'customer' });
      loadUsers();
    } else {
      alert(data.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    const response = await fetch('/api/admin/users/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('User deleted successfully!');
      loadUsers();
    } else {
      alert(data.error || 'Failed to delete user');
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

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (!confirm(`Are you sure you want to delete folder "${folderName}"?\n\nThis will permanently delete all files in this folder. This action cannot be undone.`)) {
      return;
    }

    const response = await fetch('/api/admin/folders/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Folder deleted successfully!');
      loadFolders();
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setFiles([]);
      }
    } else {
      alert(data.error || 'Failed to delete folder');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    setUploading(true);

    try {
      const blob = await upload(`${selectedFolder.blob_prefix}${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/files/upload',
      });

      await loadFiles(selectedFolder);
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFileDownload = async (fileUrl: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/download?url=${encodeURIComponent(fileUrl)}`);
      if (!response.ok) {
        alert('Download failed');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  const handleFileDelete = async (fileUrl: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    const response = await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fileUrl })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('File deleted successfully!');
      if (selectedFolder) {
        loadFiles(selectedFolder);
      }
    } else {
      alert(data.error || 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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
              Manage companies, users, folders, and files
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
          {['companies', 'users', 'folders', 'files'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === tab ? '#144478' : 'transparent',
                color: activeTab === tab ? 'white' : '#144478',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}
            >
              {tab} ({tab === 'companies' ? companies.length : tab === 'users' ? users.length : tab === 'folders' ? folders.length : selectedFolder ? files.length : 0})
            </button>
          ))}
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
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
                    <button
                      onClick={() => handleDeleteCompany(company.id, company.company_name)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#144478' }}>Create New User</h2>
              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Username *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Password *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Company *</label>
                  <select
                    value={newUser.companyId}
                    onChange={(e) => setNewUser({...newUser, companyId: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.company_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
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
                  Create User
                </button>
              </form>
            </div>

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
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
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
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Folders Tab */}
        {activeTab === 'folders' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#144478' }}>Create New Folder</h2>
              <form onSubmit={handleCreateFolder}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Folder Name *</label>
                  <input
                    type="text"
                    value={newFolder.folderName}
                    onChange={(e) => setNewFolder({...newFolder, folderName: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Folder Type *</label>
                  <select
                    value={newFolder.folderType}
                    onChange={(e) => setNewFolder({...newFolder, folderType: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="program_files">Program Files (All users)</option>
                    <option value="shared">Shared (All users)</option>
                    <option value="company_specific">Company Specific</option>
                  </select>
                </div>
                {newFolder.folderType === 'company_specific' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Company *</label>
                    <select
                      value={newFolder.companyId}
                      onChange={(e) => setNewFolder({...newFolder, companyId: e.target.value})}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.company_name}</option>
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
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
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
                    <button
                      onClick={() => handleDeleteFolder(folder.id, folder.folder_name)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div>
            {!selectedFolder ? (
              <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginTop: 0, color: '#144478', marginBottom: '20px' }}>Select a Folder</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => loadFiles(folder)}
                      style={{
                        padding: '20px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#B3CC48';
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#ddd';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>{folder.folder_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {folder.folder_type.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <button
                      onClick={() => { setSelectedFolder(null); setFiles([]); }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        color: '#144478',
                        border: '1px solid #144478',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}
                    >
                      ← Back to Folders
                    </button>
                    <h2 style={{ color: '#144478', margin: '10px 0 5px 0' }}>
                      📁 {selectedFolder.folder_name}
                    </h2>
                    <p style={{ color: '#666', margin: 0 }}>
                      {files.length} {files.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="admin-file-upload"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="admin-file-upload"
                      style={{
                        padding: '12px 24px',
                        backgroundColor: uploading ? '#ccc' : '#B3CC48',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}
                    >
                      {uploading ? 'Uploading...' : '+ Upload File'}
                    </label>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {files.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      <p>No files in this folder yet.</p>
                      <p style={{ fontSize: '14px' }}>Click "Upload File" to add files.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Filename</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333', width: '120px' }}>Size</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333', width: '200px' }}>Uploaded</th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#333', width: '200px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file) => (
                          <tr key={file.url} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '15px', color: '#333' }}>📄 {file.filename}</td>
                            <td style={{ padding: '15px', color: '#666' }}>{formatFileSize(file.size)}</td>
                            <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>{formatDate(file.uploadedAt)}</td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleFileDownload(file.url, file.filename)}
                                  style={{
                                    padding: '6px 16px',
                                    backgroundColor: '#144478',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => handleFileDelete(file.url, file.filename)}
                                  style={{
                                    padding: '6px 16px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
