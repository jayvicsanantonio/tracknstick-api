/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove potentially dangerous characters from strings
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove null bytes and control characters (except common whitespace)
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize user input for habit names and notes
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  return sanitizeString(escapeHtml(input));
}

/**
 * Validate and sanitize SQL-like strings to prevent injection
 * This is a basic implementation - proper parameterized queries are still the primary defense
 */
export function sanitizeSqlString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove or escape potentially dangerous SQL characters
  return input
    .replace(/[;'"\\]/g, '') // Remove common SQL injection characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeUserInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' ? sanitizeUserInput(item) : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Validate email format (basic validation)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize and validate timezone string
 */
export function sanitizeTimezone(timezone: string): string {
  if (typeof timezone !== 'string') {
    return 'UTC';
  }

  // Basic timezone validation - should be a valid IANA timezone
  const sanitized = sanitizeString(timezone);
  
  // Simple validation - real validation would check against IANA timezone database
  if (sanitized.length > 50 || !/^[A-Za-z_\/\-]+$/.test(sanitized)) {
    return 'UTC';
  }

  return sanitized;
}