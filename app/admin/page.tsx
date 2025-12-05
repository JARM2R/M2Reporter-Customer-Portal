'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { generateStrongPassword, getPasswordStrength } from '@/lib/passwordUtils';

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
  parent_folder_id: number | null;
  parent_folder_name: string | null;
}

interface FileItem {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface PreviewFile {
  url: string;
  filename: string;
  type: 'image' | 'pdf' | 'text' | 'unsupported';
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
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [expandedFilesView, setExpandedFilesView] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    companyId: '',
    role: 'customer'
  });
  const [suggestedPassword, setSuggestedPassword] = useState('');
   const [showPasswordSuggestion, setShowPasswordSuggestion] = useState(false);
   const [copiedPassword, setCopiedPassword] = useState(false);
  const [newFolder, setNewFolder] = useState({
    folderName: '',
    folderType: 'company_specific',
    companyId: '',
    parentFolderId: null as number | null
  });
  const [showSubfolderForm, setShowSubfolderForm] = useState(false);
  const [subfolderParent, setSubfolderParent] = useState<Folder | null>(null);

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
    setFiles([]); // Clear files immediately when switching folders
    try {
      console.log('Loading files for folder:', folder.id, folder.folder_name, 'blob_prefix:', folder.blob_prefix);
      const response = await fetch(`/api/files/list?folderId=${folder.id}`);
      const data = await response.json();
      console.log('API response:', data);
      if (data.success) {
        setFiles(data.files);
      } else {
        console.error('API error:', data.error, 'Debug:', data.debug);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

// ⬇️ ADD THESE FUNCTIONS HERE ⬇️
  // Password generator functions
  const handleGeneratePassword = () => {
    const password = generateStrongPassword(16);
    setSuggestedPassword(password);
    setShowPasswordSuggestion(true);
    setCopiedPassword(false);
  };

  const handleUseSuggestedPassword = () => {
    setNewUser({...newUser, password: suggestedPassword});
    setShowPasswordSuggestion(false);
    alert('Password applied! Remember to save it before creating the user.');
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(suggestedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      alert('Failed to copy password');
    }
  };

  const passwordStrength = getPasswordStrength(newUser.password);
  // ⬆️ ADD ABOVE FUNCTIONS HERE ⬆️

  // Then continues with your existing functions...

  // Get root folders (no parent)
  const getRootFolders = () => {
    return folders.filter(f => !f.parent_folder_id);
  };

  // Get subfolders of a parent
  const getSubfolders = (parentId: number) => {
    return folders.filter(f => f.parent_folder_id === parentId);
  };

  // Toggle folder expansion in Folders tab
  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Toggle folder expansion in Files tab
  const toggleFilesView = (folderId: number) => {
    const newExpanded = new Set(expandedFilesView);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFilesView(newExpanded);
  };

  // Get folder path for breadcrumb
  const getFolderPath = (folder: Folder): Folder[] => {
    const path: Folder[] = [folder];
    let current = folder;
    
    while (current.parent_folder_id) {
      const parent = folders.find(f => f.id === current.parent_folder_id);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return path;
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
        companyId: newFolder.companyId ? parseInt(newFolder.companyId) : null,
        parentFolderId: newFolder.parentFolderId
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Folder created successfully!');
      setNewFolder({ folderName: '', folderType: 'company_specific', companyId: '', parentFolderId: null });
      setShowSubfolderForm(false);
      setSubfolderParent(null);
      loadFolders();
    } else {
      alert(data.error || 'Failed to create folder');
    }
  };

  const handleCreateSubfolder = (parentFolder: Folder) => {
    setSubfolderParent(parentFolder);
    setNewFolder({
      folderName: '',
      folderType: parentFolder.folder_type,
      companyId: parentFolder.company_id?.toString() || '',
      parentFolderId: parentFolder.id
    });
    setShowSubfolderForm(true);
  };

  const cancelSubfolderForm = () => {
    setShowSubfolderForm(false);
    setSubfolderParent(null);
    setNewFolder({ folderName: '', folderType: 'company_specific', companyId: '', parentFolderId: null });
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (!confirm(`Are you sure you want to delete folder "${folderName}"?\n\nThis will permanently delete all files and subfolders. This action cannot be undone.`)) {
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

  // Determine file type for preview
  const getFileType = (filename: string): 'image' | 'pdf' | 'text' | 'unsupported' => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const textExts = ['txt', 'csv', 'log', 'json', 'xml', 'md', 'html', 'css', 'js', 'ts', 'tsx', 'jsx'];

    if (imageExts.includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (textExts.includes(ext)) return 'text';
    return 'unsupported';
  };

  const handleFileView = async (fileUrl: string, filename: string) => {
    const fileType = getFileType(filename);

    setPreviewFile({ url: fileUrl, filename, type: fileType });
    setPreviewContent('');
    setPreviewLoading(true);

    if (fileType === 'text') {
      try {
        const response = await fetch(`/api/files/download?url=${encodeURIComponent(fileUrl)}`);
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
        } else {
          setPreviewContent('Failed to load file content');
        }
      } catch (error) {
        console.error('Preview error:', error);
        setPreviewContent('Failed to load file content');
      }
    }

    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent('');
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

  // Render folder tree for Folders tab
  const renderFolderTree = (parentId: number | null = null, depth: number = 0): JSX.Element[] => {
    const foldersAtLevel = parentId === null ? getRootFolders() : getSubfolders(parentId);
    
    return foldersAtLevel.map((folder) => {
      const hasSubfolders = getSubfolders(folder.id).length > 0;
      const isExpanded = expandedFolders.has(folder.id);
      
      return (
        <div key={folder.id}>
          <div
            style={{
              padding: '12px 15px',
              paddingLeft: `${15 + (depth * 30)}px`,
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: depth % 2 === 0 ? 'white' : '#f8f9fa'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {hasSubfolders ? (
                <button
                  onClick={() => toggleFolder(folder.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px',
                    width: '20px',
                    color: '#144478',
                    fontWeight: 'bold'
                  }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              ) : (
                <span style={{ width: '20px' }}></span>
              )}
              
              <span style={{ fontSize: '18px' }}>📁</span>
              
              <div>
                <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '14px' }}>
                  {folder.folder_name}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {folder.folder_type.replace('_', ' ')}
                  {folder.company_name && ` | ${folder.company_name}`}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleCreateSubfolder(folder)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#B3CC48',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                + Subfolder
              </button>
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
          </div>
          
          {isExpanded && hasSubfolders && (
            <div>
              {renderFolderTree(folder.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Render folder tree for Files tab (collapsible navigation)
  const renderFilesTreeView = (parentId: number | null = null, depth: number = 0): JSX.Element[] => {
    const foldersAtLevel = parentId === null ? getRootFolders() : getSubfolders(parentId);
    
    return foldersAtLevel.map((folder) => {
      const hasSubfolders = getSubfolders(folder.id).length > 0;
      const isExpanded = expandedFilesView.has(folder.id);
      const isSelected = selectedFolder?.id === folder.id;
      
      return (
        <div key={folder.id}>
          <div
            style={{
              padding: '10px 12px',
              paddingLeft: `${12 + (depth * 25)}px`,
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isSelected ? '#e7f3ff' : (depth % 2 === 0 ? 'white' : '#f8f9fa'),
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onClick={() => loadFiles(folder)}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = depth % 2 === 0 ? 'white' : '#f8f9fa';
              }
            }}
          >
            {hasSubfolders ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilesView(folder.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '2px',
                  width: '18px',
                  color: '#144478',
                  fontWeight: 'bold'
                }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span style={{ width: '18px' }}></span>
            )}
            
            <span style={{ fontSize: '16px' }}>📁</span>
            
            <span style={{ fontWeight: isSelected ? '600' : '500', fontSize: '13px' }}>
              {folder.folder_name}
            </span>
          </div>
          
          {isExpanded && hasSubfolders && (
            <div>
              {renderFilesTreeView(folder.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
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
				
                {/* PASSWORD SECTION WITH GENERATOR */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontWeight: '600' }}>Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      🔑 Generate Password
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                  
                  {/* Password Strength Indicator */}
                  {newUser.password && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${(passwordStrength.score / 7) * 100}%`, 
                          height: '100%', 
                          backgroundColor: passwordStrength.color,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Password Suggestion Box */}
                {showPasswordSuggestion && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #17a2b8',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', color: '#144478', fontSize: '14px' }}>
                      💡 Suggested Strong Password:
                    </div>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '10px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      marginBottom: '10px',
                      border: '1px solid #ddd'
                    }}>
                      {suggestedPassword}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleUseSuggestedPassword}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Use This Password
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: copiedPassword ? '#6c757d' : '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        {copiedPassword ? '✓ Copied!' : '📋 Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordSuggestion(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
               
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

        {/* Folders Tab with Nested Tree View */}
        {activeTab === 'folders' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#144478' }}>
                {showSubfolderForm ? `Create Subfolder in "${subfolderParent?.folder_name}"` : 'Create New Root Folder'}
              </h2>
              
              {showSubfolderForm && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '13px'
                }}>
                  <strong>Parent:</strong> {subfolderParent?.folder_name}
                  <br />
                  <strong>Type:</strong> {subfolderParent?.folder_type.replace('_', ' ')}
                  {subfolderParent?.company_name && (
                    <>
                      <br />
                      <strong>Company:</strong> {subfolderParent.company_name}
                    </>
                  )}
                </div>
              )}

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
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>

                {!showSubfolderForm && (
                  <>
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
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
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
                    {showSubfolderForm ? 'Create Subfolder' : 'Create Folder'}
                  </button>
                  
                  {showSubfolderForm && (
                    <button
                      type="button"
                      onClick={cancelSubfolderForm}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#144478', marginBottom: '15px' }}>
                Folder Hierarchy ({folders.length} total)
              </h2>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                Click ▶ to expand folders and reveal subfolders
              </div>
              <div style={{ 
                maxHeight: '600px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}>
                {folders.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                    No folders yet. Create one to get started.
                  </div>
                ) : (
                  renderFolderTree()
                )}
              </div>
            </div>
          </div>
        )}

        {/* Files Tab with Tree Navigation */}
        {activeTab === 'files' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
            {/* Left: Folder Tree Navigation */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              maxHeight: '700px',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#144478', fontSize: '18px' }}>
                Folders
              </h3>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                Click ▶ to expand • Click folder to view files
              </div>
              <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
                {folders.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                    No folders available
                  </div>
                ) : (
                  renderFilesTreeView()
                )}
              </div>
            </div>

            {/* Right: File Content Area */}
            <div>
              {!selectedFolder ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: '60px 40px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📁</div>
                  <h2 style={{ color: '#144478', marginBottom: '10px' }}>Select a Folder</h2>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Click a folder from the left sidebar to view and manage its files
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                  }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px' }}>
                      {getFolderPath(selectedFolder).map((folder, index, array) => (
                        <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ 
                            color: index === array.length - 1 ? '#144478' : '#666',
                            fontWeight: index === array.length - 1 ? '600' : '400',
                            fontSize: '14px'
                          }}>
                            {folder.folder_name}
                          </span>
                          {index < array.length - 1 && <span style={{ color: '#999' }}>→</span>}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ color: '#144478', margin: '0 0 5px 0', fontSize: '20px' }}>
                          📁 {selectedFolder.folder_name}
                        </h2>
                        <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
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
                                    onClick={() => handleFileView(file.url, file.filename)}
                                    style={{
                                      padding: '6px 16px',
                                      backgroundColor: '#17a2b8',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '13px'
                                    }}
                                  >
                                    View
                                  </button>
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
          </div>
        )}
      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={closePreview}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: previewFile.type === 'pdf' ? '900px' : previewFile.type === 'image' ? 'auto' : '800px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#144478',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>
                  {previewFile.type === 'image' ? '🖼️' : previewFile.type === 'pdf' ? '📕' : previewFile.type === 'text' ? '📄' : '📁'}
                </span>
                <span style={{ fontWeight: '600', fontSize: '16px' }}>{previewFile.filename}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleFileDownload(previewFile.url, previewFile.filename)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#B3CC48',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Download
                </button>
                <button
                  onClick={closePreview}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: previewFile.type === 'unsupported' ? '40px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: previewFile.type === 'text' ? '#1e1e1e' : '#f5f5f5'
              }}
            >
              {previewLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
                </div>
              ) : previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(90vh - 80px)',
                    objectFit: 'contain'
                  }}
                />
              ) : previewFile.type === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  style={{
                    width: '100%',
                    height: 'calc(90vh - 80px)',
                    border: 'none'
                  }}
                  title={previewFile.filename}
                />
              ) : previewFile.type === 'text' ? (
                <pre
                  style={{
                    width: '100%',
                    height: 'calc(90vh - 80px)',
                    margin: 0,
                    padding: '20px',
                    overflow: 'auto',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}
                >
                  {previewContent}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📁</div>
                  <h3 style={{ color: '#333', marginBottom: '10px' }}>Preview Not Available</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    This file type cannot be previewed in the browser.
                  </p>
                  <button
                    onClick={() => handleFileDownload(previewFile.url, previewFile.filename)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#144478',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}