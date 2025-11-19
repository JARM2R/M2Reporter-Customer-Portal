// Input validation and sanitization utilities

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate username format
 * - Alphanumeric, underscore, hyphen only
 * - 3-30 characters
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[@$!%*?&#^()_+\-=\[\]{}|;:,.<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and escapes special characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate and sanitize company name
 */
export function sanitizeCompanyName(name: string): string {
  return sanitizeInput(name).substring(0, 255);
}

/**
 * Allowed file types for upload
 */
export const ALLOWED_FILE_TYPES = {
  // Executables & Installers
  'application/x-msdownload': '.exe',
  'application/x-msdos-program': '.exe',
  'application/x-msi': '.msi',
  'application/x-ms-installer': '.msi',
  
  // Database Files
  'application/x-msaccess': '.mdb',
  'application/vnd.ms-access': '.mdb',
  'application/msaccess': '.mdb',
  
  // PDF
  'application/pdf': '.pdf',
  
  // Word Documents
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  
  // Excel Files
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  
  // CSV & Text
  'text/csv': '.csv',
  'text/plain': '.txt',
  'text/tab-separated-values': '.tsv',
  
  // Report Files
  'application/x-rpt': '.rpt',
  
  // Archives
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  
  // Generic binary (for executables and other binary files)
  'application/octet-stream': '.exe', // Fallback for binary files
} as const;

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string, filename: string): {
  valid: boolean;
  error?: string;
} {
  // Get file extension
  const fileExtension = filename.toLowerCase().split('.').pop() || '';
  const fullExtension = '.' + fileExtension;

  // List of allowed extensions
  const allowedExtensions = [
    '.exe', '.msi',           // Executables
    '.mdb',                   // Database
    '.pdf',                   // PDF
    '.doc', '.docx',          // Word
    '.xls', '.xlsx',          // Excel
    '.csv', '.txt', '.tsv',   // Text
    '.rpt',                   // Reports
    '.zip', '.rar', '.7z',    // Archives
    '.jpg', '.jpeg', '.png', '.gif' // Images
  ];

  // For generic binary MIME type, validate by extension only
  if (mimeType === 'application/octet-stream') {
    if (allowedExtensions.includes(fullExtension)) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `File type .${fileExtension} not allowed.`,
    };
  }

  // Check MIME type
  if (!Object.keys(ALLOWED_FILE_TYPES).includes(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: EXE, MSI, MDB, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, RPT, ZIP, RAR, 7Z, JPG, PNG, GIF`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove double dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}