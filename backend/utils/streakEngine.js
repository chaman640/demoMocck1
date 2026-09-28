const GRACE_DAYS = 2;

export const getISTDateString = (d = new Date()) => {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(d.getTime() + istOffsetMs);
  return ist.toISOString().slice(0, 10);
};

const toDateOnly = (str) => new Date(str + "T00:00:00Z");

export const diffDays = (a, b) => Math.round((toDateOnly(b) - toDateOnly(a)) / 86400000);

export const addDays = (dateStr, n) => {
  const d = toDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const computeStreakRun = (sortedDates) => {
  if (sortedDates.length === 0) return 0;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = diffDays(sortedDates[i - 1], sortedDates[i]);
    run = gap <= GRACE_DAYS + 1 ? run + 1 : 1;
  }
  return run;
};

export const getStreakStatus = (activityDates, referenceDateStr) => {
  if (!activityDates || activityDates.length === 0) {
    return { currentStreak: 0, lastActive: null };
  }
  const sorted = [...activityDates].sort();
  const lastActive = sorted[sorted.length - 1];
  const todayStr = referenceDateStr || getISTDateString();
  const gapFromToday = diffDays(lastActive, todayStr);
  const runEndingAtLast = computeStreakRun(sorted);
  const currentStreak = gapFromToday <= GRACE_DAYS + 1 ? runEndingAtLast : 0;
  return { currentStreak, lastActive };
};

export const buildStreakCalendar = (activityDates, year, month) => {
  const activitySet = new Set(activityDates || []);
  const sorted = [...(activityDates || [])].sort();
  const todayStr = getISTDateString();

  const freezeSet = new Set();
  for (let i = 1; i < sorted.length; i++) {
    const gap = diffDays(sorted[i - 1], sorted[i]);
    if (gap > 1 && gap <= GRACE_DAYS + 1) {
      let cursor = addDays(sorted[i - 1], 1);
      for (let k = 0; k < gap - 1; k++) {
        freezeSet.add(cursor);
        cursor = addDays(cursor, 1);
      }
    }
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let status;
    if (dateStr > todayStr) status = "future";
    else if (activitySet.has(dateStr)) status = "completed";
    else if (freezeSet.has(dateStr)) status = "freeze";
    else status = "none";
    days.push({ date: dateStr, status });
  }
  return days;
};

export const GRACE_DAYS_CONST = GRACE_DAYS;
