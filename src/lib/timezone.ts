import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

export type OrgHours = {
  default_timezone: string;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
};

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 9, m: m || 0 };
}

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 1,
  };
}

export function resolveTimezone(
  contactTimezone: string | null | undefined,
  org: OrgHours
): string {
  return contactTimezone || org.default_timezone || "UTC";
}

export function nextBusinessMoment(
  from: Date,
  org: OrgHours,
  contactTimezone?: string | null
): Date {
  const tz = resolveTimezone(contactTimezone, org);
  const start = parseTime(org.business_hours_start);
  const end = parseTime(org.business_hours_end);
  const days = org.business_days?.length ? org.business_days : [1, 2, 3, 4, 5];

  let cursor = from;
  for (let i = 0; i < 14; i++) {
    const p = zonedParts(cursor, tz);
    const minutes = p.hour * 60 + p.minute;
    const startM = start.h * 60 + start.m;
    const endM = end.h * 60 + end.m;
    const isBizDay = days.includes(p.weekday);

    if (isBizDay && minutes >= startM && minutes < endM) {
      return cursor;
    }

    if (isBizDay && minutes < startM) {
      const localGuess = new Date(
        Date.UTC(p.year, p.month - 1, p.day, start.h, start.m, 0)
      );
      return localGuess;
    }

    cursor = addDays(
      setMilliseconds(
        setSeconds(setMinutes(setHours(cursor, start.h), start.m), 0),
        0
      ),
      1
    );
  }
  return from;
}

export function addWait(
  from: Date,
  config: { duration_hours?: number; until?: string },
  org: OrgHours,
  contactTimezone?: string | null
): Date {
  let target = from;
  if (config.until) {
    target = new Date(config.until);
  } else if (config.duration_hours) {
    target = new Date(from.getTime() + config.duration_hours * 3600_000);
  }
  return nextBusinessMoment(target, org, contactTimezone);
}
