const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a timeline date at whatever precision it has:
 * '2007' -> '2007', '2007-05' -> 'May 2007', '2007-05-15' -> '15 May 2007'.
 */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  const name = MONTHS[Number(month) - 1];
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}
