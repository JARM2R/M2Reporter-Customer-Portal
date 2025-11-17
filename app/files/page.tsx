'use client';

export const dynamic = 'force-dynamic';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

interface FileItem {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface Folder {
  id: number;
  name: string;
  type: string;
  companyName?: string;
}

export default function FilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');

  const [folder, setFolder] = useState<Folder | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && folderId) {
      loadFiles();
    }
  }, [status, folderId, router]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/files/list?folderId=${folderId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setFolder(data.folder);
        setFiles(data.files);
      } else {
        alert(data.error || 'Failed to load files');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      alert('Failed to load files');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setUploadError('');

  try {
    // Upload directly to Vercel Blob (bypasses 4.5MB API limit)
  const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: '/api/files/upload',
  addRandomSuffix: true,
});

    // Save file metadata to database
    const metadataResponse = await fetch('/api/files/save-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId: folderId,
        folderType: folder!.type,
        filename: file.name,
        url: blob.url,
        size: file.size,
      }),
    });

    const data = await metadataResponse.json();

    if (metadataResponse.ok && data.success) {
      await loadFiles(); // Reload file list
      alert('File uploaded successfully!');
    } else {
      setUploadError(data.error || 'Failed to save file metadata');
    }
  } catch (error) {
    console.error('Upload error:', error);
    setUploadError('Upload failed. Please try again.');
  } finally {
    setUploading(false);
    // Reset file input
    e.target.value = '';
  }
};

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/download?url=${encodeURIComponent(fileUrl)}`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Download failed');
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
      alert('Download failed. Please try again.');
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

  if (!session || !folder) {
    return null;
  }
  const canUpload = session.user.accountStatus === 'active' &&
    (session.user.role === 'admin' || folder.type !== 'program_files');

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
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              color: '#144478',
              margin: '0 0 5px 0'
            }}>
              {folder.name}
            </h2>
            <p style={{ color: '#666', margin: 0 }}>
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </p>
          </div>

          {canUpload && (
            <div>
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="file-upload"
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
          )}
        </div>

        {uploadError && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {uploadError}
          </div>
        )}

        {/* Files Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {files.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666'
            }}>
              <p>No files in this folder yet.</p>
              {canUpload && (
                <p style={{ fontSize: '14px' }}>
                  Click "Upload File" to add files.
                </p>
              )}
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Filename
                  </th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#333',
                    width: '120px'
                  }}>
                    Size
                  </th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#333',
                    width: '200px'
                  }}>
                    Uploaded
                  </th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#333',
                    width: '120px'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr
                    key={file.url}
                    style={{
                      borderBottom: '1px solid #dee2e6'
                    }}
                  >
                    <td style={{
                      padding: '15px',
                      color: '#333'
                    }}>
                      📄 {file.filename}
                    </td>
                    <td style={{
                      padding: '15px',
                      color: '#666'
                    }}>
                      {formatFileSize(file.size)}
                    </td>
                    <td style={{
                      padding: '15px',
                      color: '#666',
                      fontSize: '13px'
                    }}>
                      {formatDate(file.uploadedAt)}
                    </td>
                    <td style={{
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <button
                        onClick={() => handleDownload(file.url, file.filename)}
                        disabled={session.user.accountStatus !== 'active'}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: session.user.accountStatus === 'active' ? '#144478' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: session.user.accountStatus === 'active' ? 'pointer' : 'not-allowed',
                          fontSize: '13px'
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
