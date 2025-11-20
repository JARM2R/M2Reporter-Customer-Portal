/**
 * Generate a strong random password
 * @param length - Length of password (default: 16)
 * @returns A strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // Removed l, o
  const numbers = '23456789'; // Removed 0, 1 for clarity
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Calculate password strength
 * @param password - Password to check
 * @returns Object with strength score and label
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  
  if (!password) {
    return { score: 0, label: 'No password', color: '#ccc' };
  }
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Determine label and color
  if (score <= 2) {
    return { score, label: 'Weak', color: '#dc3545' };
  } else if (score <= 4) {
    return { score, label: 'Fair', color: '#ffc107' };
  } else if (score <= 6) {
    return { score, label: 'Good', color: '#28a745' };
  } else {
    return { score, label: 'Strong', color: '#20c997' };
  }
}