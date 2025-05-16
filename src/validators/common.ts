/**
 * Validates if a string is a valid date in YYYY-MM-DD format
 * @param dateStr - The date string to validate
 * @returns True if valid date format, false otherwise
 */
export function validateDateParam(dateStr: string): boolean {
  // Check if the string matches YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateStr);
  const timestamp = date.getTime();

  if (isNaN(timestamp)) {
    return false;
  }

  // Convert back to string and check if it matches original
  // This handles cases like 2023-02-31 which would be converted to another date
  return date.toISOString().split('T')[0] === dateStr;
}
