import { createServerFn } from '@tanstack/react-start';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';

/* ---------- shared types ---------- */

export type PeriodInput = { period: string; start?: string | undefined; end?: string | undefined };
export type MetricDTO = { label: string; value: string; hint: string };
export type PointDTO = { label: string; value: number; extra?: number };
export type ChartDTO = {
  title: string;
  subtitle: string;
  kind: 'line' | 'bars' | 'donut';
  points: PointDTO[];
  legend?: string[];
  note?: string | undefined;
};
export type TableDTO = { columns: string[]; rows: string[][]; total: number; note?: string };
export type SessionDTO = { signedIn: boolean; email: string; name: string; isAdmin: boolean };

type Admin = SupabaseClient<Database>;
type FnContext = { supabase: SupabaseClient<Database>; userId: string; claims: Record<string, unknown> };

const MAX_ROWS = 1000;
const MAX_SCANNED = 5000;
/* Tables whose newest record is not tracked in a created_at column. */
const DEFAULT_ORDER: Partial<Record<keyof Database['public']['Tables'], string>> = {
  practice_history: 'attempted_at',
};
export function orderColumnFor(table: keyof Database['public']['Tables']) {
  return DEFAULT_ORDER[table] ?? 'created_at';
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const PERIOD_DAYS: Record<string, number> = {
  Today: 1,
  'Last 7 days': 7,
  'Last 30 days': 30,
  'Last 90 days': 90,
};

/* ---------- time helpers (Asia/Kolkata, no DST) ---------- */

function istParts(value: Date) {
  const shift = new Date(value.getTime() + IST_OFFSET_MS);
  return {
    date: shift.toISOString().slice(0, 10),
    hour: Number(shift.toISOString().slice(11, 13)),
    label: new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
    }).format(value),
  };
}

function istMidnightUTC(dateText: string, addEnd = false) {
  const ms = Date.parse(`${dateText}T00:00:00+05:30`) + (addEnd ? 86399999 : 0);
  return new Date(ms).toISOString();
}

function cutoffOf(input: PeriodInput): string | null {
  if (input.period === 'Custom range') {
    return input.start ? istMidnightUTC(input.start) : null;
  }
  if (input.period === 'All time') return null;
  const days = PERIOD_DAYS[input.period] ?? 30;
  const today = istParts(new Date()).date;
  const first = new Date(Date.parse(`${today}T00:00:00Z`));
  first.setUTCDate(first.getUTCDate() - (days - 1));
  return istMidnightUTC(first.toISOString().slice(0, 10));
}

function endOf(input: PeriodInput): string | null {
  if (input.period === 'Custom range') return input.end ? istMidnightUTC(input.end, true) : null;
  return null;
}

function bucketAxis(input: PeriodInput) {
  const cutoff = cutoffOf(input);
  const hourly = input.period === 'Today';
  const keys: string[] = [];
  const labels: string[] = [];
  if (hourly) {
    for (let h = 0; h < 24; h += 1) {
      keys.push(String(h));
      labels.push(`${String(h).padStart(2, '0')}:00`);
    }
  } else {
    const last = input.period === 'Custom range' && input.end ? input.end : istParts(new Date()).date;
    const first = cutoff ? istParts(new Date(cutoff)).date : last;
    let cursor = Date.parse(`${first}T00:00:00Z`);
    const stop = Date.parse(`${last}T00:00:00Z`);
    let guard = 0;
    while (cursor <= stop && guard < 400) {
      const date = new Date(cursor);
      keys.push(date.toISOString().slice(0, 10));
      labels.push(
        new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(date),
      );
      cursor += 86400000;
      guard += 1;
    }
  }
  const keyOf = (iso: string) => {
    const parts = istParts(new Date(iso));
    return hourly ? String(parts.hour) : parts.date;
  };
  return { keys, labels, keyOf };
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/* ---------- data helpers ---------- */

async function fetchAll<Row>(
  db: Admin,
  options: {
    table: keyof Database['public']['Tables'];
    select: string;
    filter?: (query: any) => any;
    order?: string;
    ascending?: boolean;
  },
): Promise<{ rows: Row[]; capped: boolean }> {
  const rows: Row[] = [];
  let capped = false;
  for (let from = 0; ; from += MAX_ROWS) {
    let query: any = db.from(options.table).select(options.select);
    if (options.filter) query = options.filter(query);
    query = query
      .order(options.order ?? orderColumnFor(options.table), { ascending: options.ascending ?? false })
      .range(from, from + MAX_ROWS - 1);
    const { data, error } = await query;
    if (error) throw new Error(`Could not read ${options.table}: ${error.message}`);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < MAX_ROWS) break;
    if (from + MAX_ROWS >= MAX_SCANNED) {
      capped = true;
      break;
    }
  }
  return { rows, capped };
}

async function countRows(
  db: Admin,
  table: keyof Database['public']['Tables'],
  filter?: (query: any) => any,
): Promise<number> {
  let query: any = db.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

function within(input: PeriodInput, column: string) {
  const cutoff = cutoffOf(input);
  const end = endOf(input);
  return (query: any) => {
    let next = query;
    if (cutoff) next = next.gte(column, cutoff);
    if (end) next = next.lte(column, end);
    return next;
  };
}

function sumBy<Row>(rows: Row[], key: keyof Row) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function percentage(part: number, whole: number) {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

const number = new Intl.NumberFormat('en-IN');
const show = (value: number) => number.format(value);

async function adminClient(context: FnContext): Promise<Admin> {
  const { data, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  });
  if (error) throw new Error(`Could not verify administrator access: ${error.message}`);
  if (!data) throw new Error('Administrator access required');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

const periodValidator = (input: PeriodInput) => ({
  period: typeof input?.period === 'string' ? input.period : 'Last 30 days',
  start: typeof input?.start === 'string' ? input.start : undefined,
  end: typeof input?.end === 'string' ? input.end : undefined,
});

const emptyTable = (columns: string[], note = 'No records in this period.'): TableDTO => ({
  columns,
  rows: [],
  total: 0,
  note,
});

/* ---------- session ---------- */

export const getAdminSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionDTO> => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    const { data: profile } = await context.supabase
      .from('profiles')
      .select('full_name, name, email')
      .eq('id', context.userId)
      .maybeSingle();
    return {
      signedIn: true,
      email: (profile?.email as string | undefined) ?? '',
      name: (profile?.full_name as string | undefined) || (profile?.name as string | undefined) || '',
      isAdmin: Boolean(isAdmin),
    };
  });

/* ---------- overview ---------- */

export const getOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const started = Date.now();
    const [profiles, progress, translations, history, items, words, topics] = await Promise.all([
      fetchAll<any>(db, { table: 'profiles', select: 'id, full_name, name, email, current_level, level, last_active_at, created_at' }),
      fetchAll<any>(db, { table: 'user_progress', select: 'user_id, xp, completed_words, completed_sentences, progress_percentage' }),
      fetchAll<any>(db, { table: 'user_translations', select: 'user_id, telugu_text, english_text, created_at', filter: within(data, 'created_at') }),
      fetchAll<any>(db, { table: 'practice_history', select: 'user_id, practice_item_id, correct, attempted_at', filter: within(data, 'attempted_at') }),
      fetchAll<any>(db, { table: 'practice_items', select: 'id, level, difficulty, content_type' }),
      fetchAll<any>(db, { table: 'vocabulary_words', select: 'id' }),
      fetchAll<any>(db, { table: 'learning_topics', select: 'id' }),
    ]);
    const latencyMs = Date.now() - started;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const activeSince = (iso: string | null) => (iso ? iso >= dayAgo : false);
    const activeToday = profiles.rows.filter((row) => activeSince(row.last_active_at)).length;
    const activeWeek = profiles.rows.filter((row) => row.last_active_at && row.last_active_at >= weekAgo).length;
    const activeMonth = profiles.rows.filter((row) => row.last_active_at && row.last_active_at >= monthAgo).length;
    const correct = history.rows.filter((row) => row.correct).length;
    const totalXp = sumBy(progress.rows, 'xp');
    const capped = [profiles, progress, translations, history].some((result) => result.capped);

    const axis = bucketAxis(data);
    const practiceByBucket = new Map<string, number>();
    const translationsByBucket = new Map<string, number>();
    for (const row of history.rows) {
      const key = axis.keyOf(row.attempted_at);
      practiceByBucket.set(key, (practiceByBucket.get(key) ?? 0) + 1);
    }
    for (const row of translations.rows) {
      const key = axis.keyOf(row.created_at);
      translationsByBucket.set(key, (translationsByBucket.get(key) ?? 0) + 1);
    }
    const activityPoints: PointDTO[] = axis.keys.map((key, index) => ({
      label: axis.labels[index] ?? key,
      value: practiceByBucket.get(key) ?? 0,
      extra: translationsByBucket.get(key) ?? 0,
    }));

    const levels = new Map<string, number>();
    for (const row of profiles.rows) {
      const level = String(row.current_level || row.level || 'Unset');
      levels.set(level, (levels.get(level) ?? 0) + 1);
    }
    const levelPoints: PointDTO[] = [...levels.entries()].map(([label, value]) => ({ label, value }));

    const nameOf = (userId: string) => {
      const profile = profiles.rows.find((row) => row.id === userId);
      return profile?.full_name || profile?.name || profile?.email || 'Learner';
    };
    const itemName = new Map(items.rows.map((row) => [row.id as string, row]));
    const recent: { at: string; activity: string; user: string }[] = [];
    for (const row of translations.rows.slice(0, 25)) {
      recent.push({ at: row.created_at, activity: `Translated “${row.telugu_text}”`, user: nameOf(row.user_id) });
    }
    for (const row of history.rows.slice(0, 25)) {
      const item = itemName.get(row.practice_item_id);
      recent.push({
        at: row.attempted_at,
        activity: `Practiced ${item?.content_type ?? 'item'}${row.correct ? ' correctly' : ' incorrectly'}`,
        user: nameOf(row.user_id),
      });
    }
    for (const row of profiles.rows) {
      if (row.created_at) recent.push({ at: row.created_at, activity: 'New learner registered', user: nameOf(row.id) });
    }
    recent.sort((a, b) => (a.at < b.at ? 1 : -1));

    return {
      metrics: [
        { label: 'Total registered users', value: show(profiles.rows.length), hint: 'All registered user profiles.' },
        { label: 'Daily active users', value: show(activeToday), hint: 'Learners last active within the past 24 hours.' },
        { label: 'Weekly active users', value: show(activeWeek), hint: 'Learners last active within the past 7 days.' },
        { label: 'Monthly active users', value: show(activeMonth), hint: 'Learners last active within the past 30 days.' },
        { label: 'Total practice attempts', value: show(history.rows.length), hint: 'Attempts recorded in practice history.' },
        { label: 'Total translations', value: show(translations.rows.length), hint: 'Translations saved in the reporting period.' },
        { label: 'Average practice accuracy', value: percentage(correct, history.rows.length), hint: 'Correct attempts divided by total attempts.' },
        { label: 'Total XP earned', value: show(totalXp), hint: 'XP recorded in user progress.' },
      ] satisfies MetricDTO[],
      activityChart: {
        title: 'Learning activity',
        subtitle: 'Practice and translation records over time',
        kind: 'line',
        points: activityPoints,
        legend: ['Practice', 'Translations'],
        note: capped ? 'Based on the most recent 5,000 records.' : undefined,
      } satisfies ChartDTO,
      levelChart: {
        title: 'Learning level distribution',
        subtitle: 'Where your learners are on their journey',
        kind: 'donut',
        points: levelPoints,
      } satisfies ChartDTO,
      recent: {
        columns: ['Activity', 'User', 'Time'],
        rows: recent.slice(0, 8).map((row) => [row.activity, row.user, timeLabel(row.at)]),
        total: recent.length,
      } satisfies TableDTO,
      status: {
        latencyMs,
        database: 'ok' as const,
        auth: 'ok' as const,
        records: profiles.rows.length + translations.rows.length + history.rows.length,
        topics: topics.rows.length,
        words: words.rows.length,
        items: items.rows.length,
      },
      capped,
    };
  });

/* ---------- users ---------- */

export const getUsers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const [profiles, progress, translations, history] = await Promise.all([
      fetchAll<any>(db, { table: 'profiles', select: 'id, full_name, name, email, current_level, level, total_xp, total_practice_count, learning_streak, last_active_at, created_at' }),
      fetchAll<any>(db, { table: 'user_progress', select: 'user_id, xp, completed_words, completed_sentences' }),
      fetchAll<any>(db, { table: 'user_translations', select: 'user_id', filter: within(data, 'created_at') }),
      fetchAll<any>(db, { table: 'practice_history', select: 'user_id', filter: within(data, 'attempted_at') }),
    ]);
    const progressOf = new Map(progress.rows.map((row) => [row.user_id as string, row]));
    const activityCount = new Map<string, number>();
    for (const row of [...translations.rows, ...history.rows]) {
      activityCount.set(row.user_id, (activityCount.get(row.user_id) ?? 0) + 1);
    }
    const cutoff = cutoffOf(data);
    const newUsers = cutoff ? profiles.rows.filter((row) => row.created_at && row.created_at >= cutoff).length : profiles.rows.length;
    const activeUsers = profiles.rows.filter((row) => activityCount.has(row.id)).length;

    const rows = profiles.rows.map((row) => {
      const record = progressOf.get(row.id);
      return [
        row.id,
        row.full_name || row.name || '—',
        row.email || '—',
        row.created_at ? timeLabel(row.created_at) : '—',
        String(row.current_level || row.level || '—'),
        show(Number(row.total_xp ?? record?.xp ?? 0)),
        show(Number(record?.completed_words ?? 0)),
        show(Number(record?.completed_sentences ?? 0)),
        show(Number(row.total_practice_count ?? 0)),
        row.last_active_at ? timeLabel(row.last_active_at) : 'Never',
        activityCount.get(row.id) ? 'Active' : 'Idle',
      ];
    });

    return {
      metrics: [
        { label: 'Registered users', value: show(profiles.rows.length), hint: 'All registered user profiles.' },
        { label: 'Active learners', value: show(activeUsers), hint: 'Learners with practice or translation records in the reporting period.' },
        { label: 'New registrations', value: show(newUsers), hint: 'Profiles created in the reporting period.' },
        { label: 'Total learner XP', value: show(sumBy(progress.rows, 'xp')), hint: 'XP recorded in user progress.' },
      ] satisfies MetricDTO[],
      table: {
        columns: ['User ID', 'Name', 'Email', 'Registration date', 'Learning level', 'XP', 'Completed words', 'Completed sentences', 'Practice attempts', 'Last active', 'Account status'],
        rows,
        total: rows.length,
      } satisfies TableDTO,
    };
  });

/* ---------- user detail ---------- */

export const getUserDetail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input?.userId ?? '') }))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    if (!data.userId) throw new Error('A user id is required');
    const [profileResult, progressResult, translations, history, streak] = await Promise.all([
      db.from('profiles').select('id, full_name, name, email, current_level, level, total_xp, total_practice_count, learning_streak, last_active_at, created_at').eq('id', data.userId).maybeSingle(),
      db.from('user_progress').select('xp, completed_words, completed_sentences, progress_percentage, level, current_lesson').eq('user_id', data.userId).maybeSingle(),
      fetchAll<any>(db, { table: 'user_translations', select: 'telugu_text, english_text, created_at', filter: (q: any) => q.eq('user_id', data.userId) }),
      fetchAll<any>(db, { table: 'practice_history', select: 'practice_item_id, correct, attempted_at', filter: (q: any) => q.eq('user_id', data.userId) }),
      db.rpc('calculate_user_streak', { p_user_id: data.userId, p_timezone: 'Asia/Kolkata' }),
    ]);
    if (!profileResult.data) throw new Error('No learner profile matches this address');
    const profile = profileResult.data as any;
    const progress = progressResult.data as any | null;
    const streakRow = (streak.data as any[] | null)?.[0] ?? null;
    const correct = history.rows.filter((row) => row.correct).length;
    const recent = [
      ...translations.rows.map((row) => ({ at: row.created_at, activity: `Translated “${row.telugu_text}”` })),
      ...history.rows.map((row) => ({ at: row.attempted_at, activity: `Practice attempt — ${row.correct ? 'correct' : 'incorrect'}` })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20);

    return {
      profile: {
        id: profile.id as string,
        name: profile.full_name || profile.name || 'Learner',
        email: profile.email || '—',
        level: String(profile.current_level || profile.level || '—'),
        joined: profile.created_at ? timeLabel(profile.created_at) : '—',
        lastActive: profile.last_active_at ? timeLabel(profile.last_active_at) : 'Never',
      },
      metrics: [
        { label: 'Total XP', value: show(Number(profile.total_xp ?? progress?.xp ?? 0)), hint: 'XP recorded for this learner.' },
        { label: 'Practice attempts', value: show(history.rows.length), hint: 'Attempts in practice history.' },
        { label: 'Practice accuracy', value: percentage(correct, history.rows.length), hint: 'Correct attempts divided by total attempts.' },
        { label: 'Translations saved', value: show(translations.rows.length), hint: 'Translations recorded for this learner.' },
        { label: 'Completed words', value: show(Number(progress?.completed_words ?? 0)), hint: 'Words recorded in user progress.' },
        { label: 'Completed sentences', value: show(Number(progress?.completed_sentences ?? 0)), hint: 'Sentences recorded in user progress.' },
        { label: 'Learning streak', value: show(Number(profile.learning_streak ?? streakRow?.current_streak ?? 0)), hint: 'Consecutive learning days, calculated in Asia/Kolkata.' },
        { label: 'Progress', value: progress ? `${Math.round(Number(progress.progress_percentage ?? 0))}%` : '—', hint: 'Progress recorded in user progress.' },
      ] satisfies MetricDTO[],
      streak: streakRow
        ? { current: Number(streakRow.current_streak ?? 0), longest: Number(streakRow.longest_streak ?? 0), practicedToday: Boolean(streakRow.has_practiced_today) }
        : null,
      recent: {
        columns: ['Activity', 'Time'],
        rows: recent.map((row) => [row.activity, timeLabel(row.at)]),
        total: recent.length,
      } satisfies TableDTO,
      translations: {
        columns: ['Telugu source', 'English translation', 'Created at'],
        rows: translations.rows.slice(0, 50).map((row) => [String(row.telugu_text), String(row.english_text), timeLabel(row.created_at)]),
        total: translations.rows.length,
      } satisfies TableDTO,
    };
  });

/* ---------- learning analytics ---------- */

export const getLearning = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const [progress, profiles, topics, words] = await Promise.all([
      fetchAll<any>(db, { table: 'user_progress', select: 'user_id, xp, completed_words, completed_sentences, progress_percentage' }),
      fetchAll<any>(db, { table: 'profiles', select: 'id, current_level, level, last_active_at, created_at' }),
      fetchAll<any>(db, { table: 'learning_topics', select: 'id, title_english, title_telugu, word_count, is_coming_soon' }),
      fetchAll<any>(db, { table: 'vocabulary_words', select: 'id, topic_id' }),
    ]);
    const axis = bucketAxis(data);
    const activeByBucket = new Map<string, number>();
    for (const row of profiles.rows) {
      if (!row.last_active_at) continue;
      const key = axis.keyOf(row.last_active_at);
      activeByBucket.set(key, (activeByBucket.get(key) ?? 0) + 1);
    }
    const levels = new Map<string, number>();
    for (const row of profiles.rows) {
      const level = String(row.current_level || row.level || 'Unset');
      levels.set(level, (levels.get(level) ?? 0) + 1);
    }
    const wordsByTopic = new Map<string, number>();
    for (const row of words.rows) {
      const topic = String(row.topic_id ?? 'Unassigned');
      wordsByTopic.set(topic, (wordsByTopic.get(topic) ?? 0) + 1);
    }
    const topicPoints: PointDTO[] = topics.rows
      .slice()
      .sort((a, b) => Number(b.word_count ?? 0) - Number(a.word_count ?? 0))
      .map((row) => ({ label: String(row.title_english), value: wordsByTopic.get(String(row.id)) ?? 0 }));

    return {
      metrics: [
        { label: 'Total XP earned', value: show(sumBy(progress.rows, 'xp')), hint: 'XP recorded in user progress.' },
        { label: 'Vocabulary completed', value: show(sumBy(progress.rows, 'completed_words')), hint: 'Completed words recorded in user progress.' },
        { label: 'Sentences completed', value: show(sumBy(progress.rows, 'completed_sentences')), hint: 'Completed sentences recorded in user progress.' },
        { label: 'Average learning progress', value: percentage(sumBy(progress.rows, 'progress_percentage'), progress.rows.length * 100), hint: 'Average progress across learners with a progress record.' },
      ] satisfies MetricDTO[],
      charts: [
        {
          title: 'Learners by last active day',
          subtitle: 'One point per learner, on the day they were last active',
          kind: 'line',
          points: axis.keys.map((key, index) => ({ label: axis.labels[index] ?? key, value: activeByBucket.get(key) ?? 0 })),
        },
        { title: 'Learning level distribution', subtitle: 'Learners at every stage of their journey', kind: 'donut', points: [...levels.entries()].map(([label, value]) => ({ label, value })) },
        { title: 'Vocabulary words by topic', subtitle: 'Words available in each learning topic', kind: 'bars', points: topicPoints },
        {
          title: 'Learning engagement',
          subtitle: 'Learners with a recorded progress update',
          kind: 'bars',
          points: [{ label: 'With progress record', value: progress.rows.length }, { label: 'Without progress record', value: Math.max(profiles.rows.length - progress.rows.length, 0) }],
        },
      ] satisfies ChartDTO[],
    };
  });

/* ---------- practice analytics ---------- */

export const getPractice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const [history, items, profiles] = await Promise.all([
      fetchAll<any>(db, { table: 'practice_history', select: 'user_id, practice_item_id, correct, attempted_at', filter: within(data, 'attempted_at') }),
      fetchAll<any>(db, { table: 'practice_items', select: 'id, level, difficulty, content_type, telugu_text, english_text' }),
      fetchAll<any>(db, { table: 'profiles', select: 'id, full_name, name, email' }),
    ]);
    const axis = bucketAxis(data);
    const byBucket = new Map<string, number>();
    const byDifficulty = new Map<string, { attempts: number; correct: number }>();
    const byItem = new Map<string, { attempts: number; correct: number }>();
    for (const row of history.rows) {
      const key = axis.keyOf(row.attempted_at);
      byBucket.set(key, (byBucket.get(key) ?? 0) + 1);
      const item = items.rows.find((entry) => entry.id === row.practice_item_id);
      const difficulty = String(item?.difficulty ?? 'Unknown');
      const bucket = byDifficulty.get(difficulty) ?? { attempts: 0, correct: 0 };
      bucket.attempts += 1;
      bucket.correct += row.correct ? 1 : 0;
      byDifficulty.set(difficulty, bucket);
      const itemBucket = byItem.get(String(row.practice_item_id)) ?? { attempts: 0, correct: 0 };
      itemBucket.attempts += 1;
      itemBucket.correct += row.correct ? 1 : 0;
      byItem.set(String(row.practice_item_id), itemBucket);
    }
    const nameOf = (userId: string) => {
      const profile = profiles.rows.find((row) => row.id === userId);
      return profile?.full_name || profile?.name || profile?.email || 'Learner';
    };
    const correct = history.rows.filter((row) => row.correct).length;
    const itemText = new Map(items.rows.map((row) => [row.id as string, row]));

    return {
      metrics: [
        { label: 'Total practice attempts', value: show(history.rows.length), hint: 'Attempts recorded in practice history.' },
        { label: 'Correct answers', value: show(correct), hint: 'Attempts marked correct.' },
        { label: 'Incorrect answers', value: show(history.rows.length - correct), hint: 'Attempts marked incorrect.' },
        { label: 'Overall accuracy', value: percentage(correct, history.rows.length), hint: 'Correct attempts divided by total attempts.' },
      ] satisfies MetricDTO[],
      charts: [
        { title: 'Daily practice trends', subtitle: 'Practice attempts throughout the reporting period', kind: 'line', points: axis.keys.map((key, index) => ({ label: axis.labels[index] ?? key, value: byBucket.get(key) ?? 0 })) },
        { title: 'Performance by difficulty', subtitle: 'Attempts and correct answers per difficulty level', kind: 'bars', points: [...byDifficulty.entries()].map(([label, value]) => ({ label, value: value.attempts, extra: value.correct })) },
        { title: 'Most attempted questions', subtitle: 'Questions with the highest practice activity', kind: 'bars', points: [...byItem.entries()].sort((a, b) => b[1].attempts - a[1].attempts).slice(0, 8).map(([id, value]) => ({ label: String(itemText.get(id)?.english_text ?? id).slice(0, 40), value: value.attempts })) },
        { title: 'Most difficult questions', subtitle: 'Questions with the lowest answer accuracy', kind: 'bars', points: [...byItem.entries()].filter(([, value]) => value.attempts > 0).sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts).slice(0, 8).map(([id, value]) => ({ label: String(itemText.get(id)?.english_text ?? id).slice(0, 40), value: Math.round((value.correct / value.attempts) * 100) })) },
      ] satisfies ChartDTO[],
      table: history.rows.length
        ? {
            columns: ['User', 'Practice item', 'Level', 'Difficulty', 'Result', 'Attempted at'],
            rows: history.rows.slice(0, 100).map((row) => {
              const item = itemText.get(row.practice_item_id);
              return [
                nameOf(row.user_id),
                String(item?.english_text ?? row.practice_item_id),
                String(item?.level ?? '—'),
                String(item?.difficulty ?? '—'),
                row.correct ? 'Correct' : 'Incorrect',
                timeLabel(row.attempted_at),
              ];
            }),
            total: history.rows.length,
          }
        : emptyTable(['User', 'Practice item', 'Level', 'Difficulty', 'Result', 'Attempted at'], 'No practice attempts recorded in this period.'),
    };
  });

/* ---------- translation analytics ---------- */

export const getTranslations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const [translations, profiles] = await Promise.all([
      fetchAll<any>(db, { table: 'user_translations', select: 'user_id, telugu_text, english_text, created_at', filter: within(data, 'created_at') }),
      fetchAll<any>(db, { table: 'profiles', select: 'id, full_name, name, email' }),
    ]);
    const axis = bucketAxis(data);
    const byBucket = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const row of translations.rows) {
      const key = axis.keyOf(row.created_at);
      byBucket.set(key, (byBucket.get(key) ?? 0) + 1);
      byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + 1);
    }
    const nameOf = (userId: string) => {
      const profile = profiles.rows.find((row) => row.id === userId);
      return profile?.full_name || profile?.name || profile?.email || 'Learner';
    };
    const today = istParts(new Date()).date;
    const inToday = translations.rows.filter((row) => istParts(new Date(row.created_at)).date === today).length;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const inWeek = translations.rows.filter((row) => row.created_at >= weekAgo).length;
    const inMonth = translations.rows.filter((row) => row.created_at >= monthAgo).length;

    return {
      metrics: [
        { label: 'Total translations', value: show(translations.rows.length), hint: 'Translations saved in the reporting period.' },
        { label: 'Today', value: show(inToday), hint: 'Translations saved today in Asia/Kolkata.' },
        { label: 'Last 7 days', value: show(inWeek), hint: 'Translations saved in the past 7 days.' },
        { label: 'Last 30 days', value: show(inMonth), hint: 'Translations saved in the past 30 days.' },
      ] satisfies MetricDTO[],
      charts: [
        { title: 'Translation usage', subtitle: 'Translations recorded across the reporting period', kind: 'line', points: axis.keys.map((key, index) => ({ label: axis.labels[index] ?? key, value: byBucket.get(key) ?? 0 })) },
        { title: 'Most active translators', subtitle: 'Learners with the most saved translations', kind: 'bars', points: [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([userId, value]) => ({ label: nameOf(userId), value })) },
      ] satisfies ChartDTO[],
      table: translations.rows.length
        ? {
            columns: ['User', 'Telugu source', 'English translation', 'Created at'],
            rows: translations.rows.slice(0, 100).map((row) => [nameOf(row.user_id), String(row.telugu_text), String(row.english_text), timeLabel(row.created_at)]),
            total: translations.rows.length,
          }
        : emptyTable(['User', 'Telugu source', 'English translation', 'Created at'], 'No translations saved in this period.'),
    };
  });

/* ---------- content management ---------- */

export const getContent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const [topics, items, words] = await Promise.all([
      fetchAll<any>(db, { table: 'learning_topics', select: 'id, title_english, title_telugu, description_english, word_count, is_coming_soon, sort_order' }),
      fetchAll<any>(db, { table: 'practice_items', select: 'id, level, difficulty, content_type, telugu_text, english_text, explanation' }),
      fetchAll<any>(db, { table: 'vocabulary_words', select: 'id, telugu_word, english_word, part_of_speech, pronunciation_guide, topic_id, is_word_of_the_day' }),
    ]);
    const topicTitle = new Map(topics.rows.map((row) => [row.id as string, String(row.title_english)]));
    return {
      topics: {
        columns: ['ID', 'Telugu content', 'English content', 'Words', 'Status'],
        rows: topics.rows.map((row) => [
          String(row.id),
          String(row.title_telugu),
          String(row.title_english),
          show(Number(row.word_count ?? 0)),
          row.is_coming_soon ? 'Coming soon' : 'Available',
        ]),
        total: topics.rows.length,
      } satisfies TableDTO,
      items: {
        columns: ['ID', 'Level', 'Difficulty', 'Content type', 'Telugu text', 'English text', 'Explanation'],
        rows: items.rows.map((row) => [
          String(row.id),
          String(row.level),
          String(row.difficulty),
          String(row.content_type),
          String(row.telugu_text),
          String(row.english_text),
          String(row.explanation ?? '—'),
        ]),
        total: items.rows.length,
      } satisfies TableDTO,
      words: {
        columns: ['ID', 'Telugu content', 'English content', 'Level', 'Part of speech', 'Topic'],
        rows: words.rows.map((row) => [
          String(row.id),
          String(row.telugu_word),
          String(row.english_word),
          String(row.part_of_speech ?? '—'),
          String(row.pronunciation_guide ?? '—'),
          topicTitle.get(String(row.topic_id)) ?? 'Unassigned',
        ]),
        total: words.rows.length,
      } satisfies TableDTO,
    };
  });

/* ---------- recent activity ---------- */

export const getActivity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(periodValidator)
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const [profiles, progress, translations, history] = await Promise.all([
      fetchAll<any>(db, { table: 'profiles', select: 'id, full_name, name, email, created_at', filter: within(data, 'created_at') }),
      fetchAll<any>(db, { table: 'user_progress', select: 'user_id, xp, updated_at', filter: within(data, 'updated_at') }),
      fetchAll<any>(db, { table: 'user_translations', select: 'user_id, telugu_text, created_at', filter: within(data, 'created_at') }),
      fetchAll<any>(db, { table: 'practice_history', select: 'user_id, correct, attempted_at', filter: within(data, 'attempted_at') }),
    ]);
    const nameOf = (userId: string) => {
      const profile = profiles.rows.find((row) => row.id === userId);
      return profile?.full_name || profile?.name || profile?.email || 'Learner';
    };
    const events: { type: string; user: string; detail: string; at: string }[] = [];
    for (const row of profiles.rows) events.push({ type: 'Registration', user: nameOf(row.id), detail: 'New learner registered', at: row.created_at });
    for (const row of translations.rows) events.push({ type: 'Translation', user: nameOf(row.user_id), detail: `Translated “${row.telugu_text}”`, at: row.created_at });
    for (const row of history.rows) events.push({ type: 'Practice', user: nameOf(row.user_id), detail: row.correct ? 'Practice attempt — correct' : 'Practice attempt — incorrect', at: row.attempted_at });
    for (const row of progress.rows) events.push({ type: 'Progress', user: nameOf(row.user_id), detail: `Progress updated — ${show(Number(row.xp ?? 0))} XP`, at: row.updated_at });
    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    return {
      table: {
        columns: ['Activity type', 'User', 'Details', 'Timestamp (Asia/Kolkata)'],
        rows: events.map((event) => [event.type, event.user, event.detail, timeLabel(event.at)]),
        total: events.length,
      } satisfies TableDTO,
    };
  });

/* ---------- system health ---------- */

export const getHealth = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const started = Date.now();
    let latencyMs: number | null = null;
    let databaseOk = false;
    try {
      const count = await countRows(db, 'profiles');
      latencyMs = Date.now() - started;
      databaseOk = count >= 0;
    } catch {
      databaseOk = false;
    }
    let authOk = false;
    try {
      const { error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
      authOk = !error;
    } catch {
      authOk = false;
    }
    const checks = [
      { label: 'Database connectivity', detail: databaseOk ? `Connected · ${latencyMs ?? 0} ms` : 'Could not reach the database', status: databaseOk ? ('ok' as const) : ('error' as const) },
      { label: 'Authentication service', detail: authOk ? 'Session verified with your Supabase project' : 'Session check failed', status: authOk ? ('ok' as const) : ('error' as const) },
      { label: 'Administrator permission', detail: 'user_roles · has_role', status: 'ok' as const },
      { label: 'Last successful refresh', detail: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date()), status: 'ok' as const },
      { label: 'Database query errors', detail: 'Not logged in this workspace', status: 'unknown' as const },
      { label: 'Failed requests', detail: 'Not logged in this workspace', status: 'unknown' as const },
    ];
    const tables = ['profiles', 'user_translations', 'practice_history', 'practice_items', 'learning_topics', 'vocabulary_words', 'user_progress', 'user_roles'] as const;
    const counts = await Promise.all(
      tables.map(async (table) => ({ table, count: await countRows(db, table).catch(() => null) })),
    );
    return {
      checks,
      counts,
      connected: databaseOk && authOk,
      project: (process.env['VITE_SUPABASE_PROJECT_ID'] ?? process.env['SUPABASE_PROJECT_ID'] ?? 'Connected project') as string,
    };
  });
