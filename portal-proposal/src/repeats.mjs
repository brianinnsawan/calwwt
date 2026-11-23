// Repeating tasks (Brian, 5 Nov 2026: "we prepare for the weekly meeting every week, remind us every Monday").
// Every morning at 06:00 Bangkok (cron 23:00 UTC, production/wrangler.jsonc) the task service makes today's copy of each
// task that repeats on today's weekday and puts a "due today" reminder on its people's bell (tasks/src/service.mjs
// runRepeats). No email or LINE: reminders stay on the site.
import { taskService } from '../../tasks/src/service.mjs';

export const REPEAT_CRON = '0 23 * * *';
export const bangkokDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);

export async function runScheduledRepeats(env, now = new Date()) {
  if (!env.TASKS_DB) return null;
  const out = await taskService(env.TASKS_DB).runRepeats(bangkokDate(now));
  console.log(JSON.stringify({ job: 'repeating-tasks', day: bangkokDate(now), made: out.made.length, reminded: out.reminded.length }));
  return out;
}
