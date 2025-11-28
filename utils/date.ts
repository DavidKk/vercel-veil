/**
 * 检查日期对象是否无效
 * @param date - 要检查的日期对象
 * @returns 如果日期无效返回 true，否则返回 false
 */
export function isInvalidDate(date: Date): boolean {
  return isNaN(date.getTime())
}
