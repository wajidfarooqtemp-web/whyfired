// src/lib/time.ts
// Shared "posted X ago" formatting, LinkedIn-style: a single unit
// (minutes, hours, days, weeks, months, years), rounded down. Pair it
// with a `title` attribute holding the exact date and time, so anyone
// who wants precision can hover for it.

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 30) return `${Math.floor(s / (86400 * 7))}w`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

export function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
