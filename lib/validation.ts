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
  // Documents
  'application/pdf': '.pdf',
  'text/csv': '.csv',
  'text/plain': '.txt',
  'application/xml': '.xml',
  'text/xml': '.xml',

  // Spreadsheets
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',

  // Word Documents
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',

  // Database Files
  'application/x-msaccess': '.mdb',
  'application/vnd.ms-access': '.mdb',

  // Executables & Installers
  'application/x-msdownload': '.exe',
  'application/x-msi': '.msi',
  'application/x-ms-installer': '.msi',

  // Images (for documentation)
  'image/jpeg': '.jpg',
  'image/png': '.png',

  // Archives
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
} as const;

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string, filename: string): {
  valid: boolean;
  error?: string;
} {
  // Check MIME type
  if (!Object.keys(ALLOWED_FILE_TYPES).includes(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`,
    };
  }

  // Check file extension matches MIME type
  const expectedExtension = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
  if (!filename.toLowerCase().endsWith(expectedExtension)) {
    return {
      valid: false,
      error: `File extension does not match file type`,
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
