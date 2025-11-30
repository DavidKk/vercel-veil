/**
 * Check if a date object is invalid
 * @param date - Date object to check
 * @returns Returns true if the date is invalid, otherwise returns false
 */
export function isInvalidDate(date: Date): boolean {
  return isNaN(date.getTime())
}
