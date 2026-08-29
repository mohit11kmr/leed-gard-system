const CRON_RE = /^(\S+\s+){4}\S+$/;

export function isValidCron(schedule: string): boolean {
  if (!CRON_RE.test(schedule.trim())) return false;
  return schedule
    .trim()
    .split(/\s+/)
    .every((f) => {
      if (f === "*") return true;
      if (/^\*\//.test(f)) return true;
      return f.split(",").every((part) => {
        const range = part.split("-");
        return range.every((r) => /^\d+$/.test(r));
      });
    });
}
