import { Link, useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, Database, FileText, Globe2, GraduationCap, KeyRound,
  LayoutDashboard, LogOut, Menu, MessageSquare, RefreshCw, Search, Settings, ShieldCheck,
  Sparkles, Target, Users, X, Zap, type LucideIcon,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { reportingPeriods } from '@/lib/dashboard';
import logoUrl from '@/assets/maatlaadu-logo.png';
import { supabase } from '@/integrations/supabase/client';
import {
  getAdminSession, getActivity, getContent, getHealth, getLearning, getOverview,
  getPractice, getTranslations, getUserDetail, getUsers,
  type ChartDTO, type MetricDTO, type SessionDTO, type TableDTO,
} from '@/lib/dashboard.functions';

const links = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, group: 'MAIN' },
  { label: 'Users', path: '/users', icon: Users, group: 'MAIN' },
  { label: 'Learning analytics', path: '/learning', icon: GraduationCap, group: 'MAIN' },
  { label: 'Practice analytics', path: '/practice', icon: Target, group: 'MAIN' },
  { label: 'Translation analytics', path: '/translations', icon: MessageSquare, group: 'MAIN' },
  { label: 'Content management', path: '/content', icon: BookOpen, group: 'MANAGEMENT' },
  { label: 'Recent activity', path: '/activity', icon: Activity, group: 'MANAGEMENT' },
  { label: 'System health', path: '/health', icon: ShieldCheck, group: 'SYSTEM' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'SYSTEM' },
] as const;

const palette = ['#2f6df6', '#22b8cf', '#7c72f5', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7'];
const color = (index: number) => palette[index % palette.length] ?? '#2f6df6';

type FilterState = {
  period: string;
  setPeriod: (value: string) => void;
  start: string;
  setStart: (value: string) => void;
  end: string;
  setEnd: (value: string) => void;
  refreshedAt: number;
  setRefreshedAt: (value: number) => void;
  refresh: () => void;
  refreshing: boolean;
};

const FilterContext = createContext<FilterState>({
  period: 'Last 30 days', setPeriod: () => {}, start: '', setStart: () => {}, end: '', setEnd: () => {},
  refreshedAt: 0, setRefreshedAt: () => {}, refresh: () => {}, refreshing: false,
});

type SessionState = {
  session: SessionDTO | undefined;
  loading: boolean;
  hydrated: boolean;
  signOut: () => void;
};

const SessionContext = createContext<SessionState>({ session: undefined, loading: true, hydrated: false, signOut: () => {} });

export function useFilters() { return useContext(FilterContext); }
export function useSession() { return useContext(SessionContext); }

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState('Last 30 days');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchSession = useServerFn(getAdminSession);

  useEffect(() => setHydrated(true), []);

  const sessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: () => fetchSession(),
    enabled: hydrated,
    retry: false,
    staleTime: 60_000,
  });

  function refresh() {
    setRefreshing(true);
    void queryClient.invalidateQueries().then(() => setTimeout(() => setRefreshing(false), 350));
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: '/auth', replace: true });
  }

  return (
    <FilterContext.Provider value={{ period, setPeriod, start, setStart, end, setEnd, refreshedAt, setRefreshedAt, refresh, refreshing }}>
      <SessionContext.Provider value={{ session: sessionQuery.data, loading: hydrated && sessionQuery.isPending, hydrated, signOut }}>
        {children}
      </SessionContext.Provider>
    </FilterContext.Provider>
  );
}

/* ---------- shell ---------- */

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark"><img src={logoUrl} alt="" width={27} height={27} /></span>{!compact && <div><span className="brand-name">maatlaadu<span className="brand-dot">.</span></span><span className="brand-caption">ADMIN WORKSPACE</span></div>}</div>;
}

export function DashboardLayout({ children, title = 'Overview' }: { children: ReactNode; title?: string }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const { session, signOut } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const initial = (session?.name || session?.email || 'A').trim().charAt(0).toUpperCase();
  return <div className={`workspace ${collapsed ? 'is-collapsed' : ''}`}>
    {mobile && <div className="sidebar-backdrop" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
      <Link to="/" aria-label="Maatlaadu overview"><Brand compact={collapsed} /></Link>
      <div className="workspace-select"><span className="workspace-initial"><img src={logoUrl} alt="" width={21} height={21} /></span>{!collapsed && <><div><strong>Maatlaadu</strong><span>Administration</span></div><ChevronDown size={14} /></>}</div>
      <nav>{['MAIN', 'MANAGEMENT', 'SYSTEM'].map(group => <div className="nav-group" key={group}>{!collapsed && <p>{group}</p>}{links.filter(link => link.group === group).map(link => <Link key={link.path} to={link.path} title={collapsed ? link.label : undefined} className={`nav-link ${path === link.path ? 'active' : ''}`} onClick={() => setMobile(false)}><link.icon size={18} />{!collapsed && <span>{link.label}</span>}{path === link.path && !collapsed && <span className="nav-active-dot" />}</Link>)}</div>)}</nav>
      <div className="sidebar-bottom">
        {!collapsed && <div className="connection-mini"><span className={`status-dot ${session?.isAdmin ? 'ok' : 'warning'}`} /><span>{session?.isAdmin ? 'Connected to live data' : 'Sign in to view data'}</span><Link to="/health" aria-label="View connection status"><ArrowRight size={14} /></Link></div>}
        <div className="admin-profile"><span className="admin-avatar">{initial}</span>{!collapsed && <div><strong>{session?.name || 'Administrator'}</strong><span>{session?.email || 'Not signed in'}</span></div>}
          {session?.signedIn
            ? <Button variant="ghost" size="icon" title="Sign out" onClick={signOut}><LogOut size={17} /></Button>
            : <Button asChild variant="ghost" size="icon" title="Administrator sign in"><Link to="/auth"><LogOut size={17} /></Link></Button>}
        </div>
      </div>
      <Button variant="outline" size="icon" className="collapse-button" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button>
    </aside>
    <div className="main-column"><header className="topbar"><div className="breadcrumb"><Button size="icon" variant="ghost" className="mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu /></Button><span className="breadcrumb-workspace">Workspace</span><ChevronRight size={13} /><span>{title}</span></div><div className="topbar-actions"><Button variant="ghost" className="global-search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search pages...</span></Button><span className="topbar-divider" /><div className="notification-anchor"><Button variant="ghost" size="icon" title="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell size={18} /></Button>{notificationOpen && <div className="notification-panel"><strong>Notifications</strong><p>Notifications aren’t connected yet.</p><span>Your learning records are live.</span></div>}</div><span className="topbar-avatar">{initial}</span></div></header>
      <main className="dashboard-main">{children}<footer className="page-footer"><span>© {new Date().getFullYear()} Maatlaadu</span><span><ShieldCheck size={13} /> Admin workspace <span className="footer-dot">·</span> Asia/Kolkata</span></footer></main>
    </div>
    {notice && <div className="notice" role="status"><CircleHelp size={18} />{notice}<Button variant="ghost" size="icon" aria-label="Dismiss notification" onClick={() => setNotice('')}><X /></Button></div>}
    {searchOpen && <div className="modal-backdrop" onClick={() => setSearchOpen(false)}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search workspace" onClick={e => e.stopPropagation()}><div className="search-dialog-input"><Search size={20} /><input autoFocus placeholder="Search pages..." value={search} onChange={e => setSearch(e.target.value)} /><Button variant="ghost" size="icon" aria-label="Close search" onClick={() => setSearchOpen(false)}><X /></Button></div><div className="search-results">{links.filter(link => link.label.toLowerCase().includes(search.toLowerCase())).map(link => <Button asChild variant="ghost" key={link.path}><Link to={link.path} onClick={() => setSearchOpen(false)}><link.icon size={18} />{link.label}<ArrowRight className="ml-auto" /></Link></Button>)}{!links.some(link => link.label.toLowerCase().includes(search.toLowerCase())) && <p>No matching pages.</p>}</div></section></div>}
  </div>;
}

/* ---------- access gate ---------- */

function LoadingPanel() {
  return <div className="gate-panel"><span className="gate-icon"><RefreshCw className="animate-spin" size={20} /></span><strong>Loading your records…</strong><p>Reading live data from your connected Supabase project.</p></div>;
}

function SignInPrompt() {
  return <div className="gate-panel"><span className="gate-icon"><ShieldCheck size={22} /></span><strong>Sign in to view this data</strong><p>Records are private to your Supabase project and only open to authorized administrators.</p><Button asChild><Link to="/auth">Administrator sign in<ArrowRight /></Link></Button></div>;
}

function NotAuthorized() {
  return <div className="gate-panel"><span className="gate-icon"><Database size={22} /></span><strong>This account isn’t an administrator</strong><p>Sign in with an account listed in <code>user_roles</code>, or ask an administrator to add it.</p><Button asChild variant="outline"><Link to="/auth">Switch account<ArrowRight /></Link></Button></div>;
}

function ProtectedPage({ title, children }: { title: string; children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <DashboardLayout title={title}><LoadingPanel /></DashboardLayout>;
  if (!session?.signedIn) return <DashboardLayout title={title}><SignInPrompt /></DashboardLayout>;
  if (!session.isAdmin) return <DashboardLayout title={title}><NotAuthorized /></DashboardLayout>;
  return <DashboardLayout title={title}>{children}</DashboardLayout>;
}

function QueryState({ query, children }: { query: { isPending: boolean; error: unknown; data: unknown }; children: ReactNode }) {
  if (query.isPending && !query.data) return <div className="data-loading"><RefreshCw className="animate-spin" size={16} />Loading records…</div>;
  if (query.error) return <div className="data-error"><X size={16} /><div><strong>Couldn’t load these records</strong><p>{query.error instanceof Error ? query.error.message : 'Unexpected error while reading your data.'}</p></div></div>;
  return <>{children}</>;
}

/* ---------- headings & filters ---------- */

export function PageHeading({ title, subtitle, overview = false }: { title: string; subtitle: string; overview?: boolean }) {
  const [date, setDate] = useState('');
  const { refresh, refreshing } = useFilters();
  useEffect(() => { setDate(new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date())); }, []);
  return <><div className="page-heading"><div>{overview && <p className="welcome-eyebrow"><span /> YOUR LEARNING PLATFORM, AT A GLANCE</p>}<h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div><div className="heading-actions">{overview && <span className="current-date"><CalendarDays size={14} />{date}</span>}<Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh'}</Button></div></div></>;
}

export function ReportingBar() {
  const { period, setPeriod, start, end, setStart, setEnd, refreshedAt } = useFilters();
  const [open, setOpen] = useState(false);
  const label = refreshedAt
    ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(refreshedAt))
    : 'Not yet';
  return <div className="reporting-bar"><div className="reporting-left"><span className="reporting-label">Reporting period</span><div className="period-control"><Button variant="outline" onClick={() => setOpen(!open)}><CalendarDays />{period}<ChevronDown /></Button>{open && <div className="period-menu">{reportingPeriods.map(p => <Button variant="ghost" key={p} onClick={() => { setPeriod(p); setOpen(false); }}>{p}{p === period && <Check size={14} />}</Button>)}</div>}</div>{period === 'Custom range' && <div className="custom-dates"><input type="date" aria-label="Start date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)} /><span>–</span><input type="date" aria-label="End date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} /></div>}</div><span className="refresh-time"><span className="status-dot ok" />Last refreshed: <strong>{label}</strong></span></div>;
}

export function DataNotice() { return null; }

/* ---------- data primitives ---------- */

function useDashboardQuery<T>(key: string, fetcher: () => Promise<T>) {
  const { session, hydrated } = useSession();
  const { period, start, end, setRefreshedAt } = useFilters();
  const query = useQuery({
    queryKey: ['dashboard', key, period, start, end],
    queryFn: fetcher,
    enabled: hydrated && Boolean(session?.isAdmin),
    retry: false,
    staleTime: 30_000,
  });
  useEffect(() => { if (query.dataUpdatedAt) setRefreshedAt(query.dataUpdatedAt); }, [query.dataUpdatedAt, setRefreshedAt]);
  return query;
}

export function Metric({ title, icon: Icon, tone = 'blue', description, value, comparison }: { title: string; icon: LucideIcon; tone?: string; description: string; value?: string; comparison?: string }) {
  return <article className="metric"><div className="metric-top"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><span className="metric-help" title={description}><CircleHelp size={14} /></span></div><p>{title}</p><div className="metric-value">{value ?? '—'}</div><span className="metric-comparison">{comparison ?? 'From your connected records'}</span></article>;
}

function MetricRow({ metrics }: { metrics: MetricDTO[] }) {
  return <div className="metrics-grid">{metrics.map(metric => <Metric key={metric.label} title={metric.label} icon={metricIcon(metric.label)} description={metric.hint} value={metric.value} />)}</div>;
}

function metricIcon(label: string): LucideIcon {
  const text = label.toLowerCase();
  if (text.includes('user') || text.includes('learner') || text.includes('translator')) return Users;
  if (text.includes('xp')) return Zap;
  if (text.includes('accuracy') || text.includes('correct')) return Check;
  if (text.includes('incorrect')) return X;
  if (text.includes('translation')) return MessageSquare;
  if (text.includes('practice') || text.includes('attempt')) return Target;
  if (text.includes('word')) return BookOpen;
  if (text.includes('sentence')) return FileText;
  if (text.includes('streak')) return Activity;
  if (text.includes('progress') || text.includes('level')) return GraduationCap;
  if (text.includes('registration') || text.includes('new')) return Sparkles;
  if (text.includes('today') || text.includes('daily')) return CalendarDays;
  if (text.includes('week')) return Activity;
  if (text.includes('month')) return Globe2;
  return Database;
}

export function EmptyState({ icon: Icon = Database, title = 'No data available yet', subtitle = 'Your connected data will appear here.', compact = false }: { icon?: LucideIcon; title?: string; subtitle?: string; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><div className="empty-icon"><Icon size={22} strokeWidth={1.5} /></div><strong>{title}</strong><p>{subtitle}</p></div>;
}

function ChartBody({ chart }: { chart: ChartDTO }) {
  const axis = { stroke: 'var(--chart-axis)', fontSize: 11 };
  const tooltip = {
    contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 },
    labelStyle: { color: 'var(--muted-foreground)' },
  };
  const hasSecond = chart.points.some(point => typeof point.extra === 'number');
  if (chart.kind === 'donut') {
    return <div className="chart-body"><ResponsiveContainer width="100%" height={252}>
      <PieChart><Pie data={chart.points} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
        {chart.points.map((point, index) => <Cell key={point.label} fill={color(index)} />)}
      </Pie><Tooltip {...tooltip} /></PieChart>
    </ResponsiveContainer><div className="chart-legend">{chart.points.map((point, index) => <span key={point.label}><i style={{ background: color(index) }} />{point.label} · {point.value}</span>)}</div></div>;
  }
  const common = { data: chart.points, margin: { top: 8, right: 8, bottom: 4, left: -18 } };
  return <div className="chart-body"><ResponsiveContainer width="100%" height={252}>
    {chart.kind === 'line'
      ? <LineChart {...common}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" /><YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip {...tooltip} />
        <Line type="monotone" dataKey="value" stroke={color(0)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={chart.legend?.[0] ?? 'Records'} />
        {hasSecond && <Line type="monotone" dataKey="extra" stroke={color(1)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={chart.legend?.[1] ?? 'Second series'} />}
      </LineChart>
      : <BarChart {...common}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={0} angle={chart.points.length > 6 ? -18 : 0} height={chart.points.length > 6 ? 46 : 26} /><YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip {...tooltip} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="value" fill={color(0)} radius={[5, 5, 0, 0]} maxBarSize={26} name={chart.legend?.[0] ?? 'Records'} />
        {hasSecond && <Bar dataKey="extra" fill={color(1)} radius={[5, 5, 0, 0]} maxBarSize={26} name={chart.legend?.[1] ?? 'Second series'} />}
      </BarChart>}
  </ResponsiveContainer>{chart.legend && <div className="chart-legend">{chart.legend.map((name, index) => <span key={name}><i style={{ background: color(index) }} />{name}</span>)}</div>}</div>;
}

export function ChartPanel({ chart, className = '' }: { chart: ChartDTO; className?: string }) {
  const { period } = useFilters();
  const hasData = chart.points.some(point => point.value > 0 || (point.extra ?? 0) > 0);
  return <section className={`analytics-panel ${className}`}><div className="panel-header"><div><h2>{chart.title}</h2><p>{chart.subtitle}</p></div><span className="panel-period">{period}</span></div>
    {hasData ? <ChartBody chart={chart} /> : <EmptyState icon={chart.kind === 'donut' ? Users : Activity} title="No records in this period" subtitle="Widen the reporting period or check back once learners are active." compact />}
    <div className="chart-foot"><span><span className="legend-dot" />{chart.legend?.[0] ?? (chart.kind === 'donut' ? 'Learning levels' : 'Records')}</span><span>{chart.note ?? (hasData ? `${chart.points.length} points shown` : 'Nothing to plot yet')}</span></div></section>;
}

function exportCsv(title: string, table: TableDTO) {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [table.columns, ...table.rows].map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function RecordsTable({ title, table, kind = 'records', filters = false, levelColumn, renderCell }: {
  title: string; table: TableDTO; kind?: string; filters?: boolean; levelColumn?: number; renderCell?: (row: string[]) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All levels');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ column: number; ascending: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const levels = levelColumn === undefined ? [] : [...new Set(table.rows.map(row => row[levelColumn]))].filter((value): value is string => Boolean(value));
  const searched = table.rows.filter(row => {
    if (query && !row.some(cell => cell.toLowerCase().includes(query.toLowerCase()))) return false;
    if (levelColumn !== undefined && level !== 'All levels' && row[levelColumn] !== level) return false;
    return true;
  });
  const rows = sort ? [...searched].sort((a, b) => {
    const left = a[sort.column] ?? '';
    const right = b[sort.column] ?? '';
    const leftNumber = Number(left.replace(/[^\d.-]/g, ''));
    const rightNumber = Number(right.replace(/[^\d.-]/g, ''));
    const compare = Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && /\d/.test(left) && /\d/.test(right)
      ? leftNumber - rightNumber
      : left.localeCompare(right, undefined, { numeric: true });
    return sort.ascending ? compare : -compare;
  }) : searched;
  const perPage = 10;
  const pages = Math.max(Math.ceil(rows.length / perPage), 1);
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * perPage, current * perPage + perPage);
  return <section className="analytics-panel records-panel"><div className="records-toolbar"><div><h2>{title}</h2><span>{rows.length} record{rows.length === 1 ? '' : 's'}</span></div><div className="table-controls"><div className="table-search"><Search size={15} /><input aria-label={`Search ${kind}`} placeholder={`Search ${kind}...`} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></div>{filters && levels.length > 0 && <div className="period-control"><Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>{level}<ChevronDown /></Button>{filterOpen && <div className="period-menu">{['All levels', ...levels].map(item => <Button variant="ghost" key={item} onClick={() => { setLevel(item); setFilterOpen(false); setPage(0); }}>{item}{level === item && <Check size={14} />}</Button>)}</div>}</div>}<Button variant="outline" disabled={rows.length === 0} onClick={() => exportCsv(title, { ...table, rows })}><ArrowDownToLine />Export CSV</Button></div></div>
    {visible.length === 0 ? <EmptyState icon={kind === 'users' ? Users : FileText} title={`No ${kind} found`} subtitle={query ? `Nothing matches “${query}”.` : (table.note ?? 'No records in this period.')} /> : <div className="table-scroll"><table><thead><tr>{table.columns.map((column, index) => <th key={column}><Button variant="ghost" size="sm" onClick={() => { setSort(sort?.column === index ? { column: index, ascending: !sort.ascending } : { column: index, ascending: true }); }}>{column}<ChevronDown className={sort?.column === index ? (sort.ascending ? 'rotate-180' : '') : 'is-hidden'} /></Button></th>)}</tr></thead><tbody>{visible.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === 1 && renderCell ? renderCell(row) : cell}</td>)}</tr>)}</tbody></table></div>}
    <div className="table-footer"><span>{rows.length} record{rows.length === 1 ? '' : 's'}{sort && ` · Sorted by ${table.columns[sort.column]}`}</span><div><span>Page {current + 1} of {pages}</span><Button variant="outline" size="icon" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ChevronRight /></Button></div></div></section>;
}

/* ---------- pages ---------- */

export function OverviewPage() {
  return <ProtectedPage title="Overview"><OverviewContent /></ProtectedPage>;
}

function OverviewContent() {
  const fetch = useServerFn(getOverview);
  const { period, start, end } = useFilters();
  const query = useDashboardQuery('overview', () => fetch({ data: { period, start, end } }));
  return <><PageHeading overview title="Welcome to Maatlaadu Admin." subtitle="A clear view of your learners, their progress, and your platform." /><ReportingBar />
    <QueryState query={query}>{query.data && <>
      <div className="section-heading"><h2>Platform overview</h2><span><span className="status-dot ok" />All metrics</span></div>
      <MetricRow metrics={query.data.metrics} />
      <div className="overview-charts"><ChartPanel chart={query.data.activityChart} /><ChartPanel chart={query.data.levelChart} /></div>
      <div className="overview-bottom">
        <section className="analytics-panel"><div className="panel-header"><div><h2>Recent activity</h2><p>The latest from your learning community</p></div><Button asChild variant="ghost" size="sm"><Link to="/activity">View all<ArrowRight /></Link></Button></div>
          {query.data.recent.rows.length === 0 ? <EmptyState icon={Activity} title="No activity in this period" subtitle="New learning activity will appear here." compact />
            : <><div className="mini-table-head"><span>ACTIVITY</span><span>USER</span><span>TIME</span></div><ul className="mini-table">{query.data.recent.rows.map((row, index) => <li key={index}><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span></li>)}</ul></>}
        </section>
        <section className="analytics-panel platform-status"><div className="panel-header"><div><h2>Platform status</h2><p>Your application services</p></div><ShieldCheck size={18} /></div>
          <div className="status-row"><span>Database connection</span><span className="status-tag ok"><span className="status-dot ok" />Connected · {query.data.status.latencyMs} ms</span></div>
          <div className="status-row"><span>Authentication</span><span className="status-tag ok"><span className="status-dot ok" />Verified</span></div>
          <div className="status-row"><span>Records read</span><span className="status-tag"><span className="status-dot" />{query.data.status.records}</span></div>
          <div className="status-row"><span>Topics · words · practice items</span><span className="status-tag"><span className="status-dot" />{query.data.status.topics} · {query.data.status.words} · {query.data.status.items}</span></div>
          <Link className="status-detail" to="/health">View system health<ArrowRight size={14} /></Link>
        </section>
      </div>
    </>}</QueryState></>;
}

export function UsersPage() {
  return <ProtectedPage title="Users"><UsersContent /></ProtectedPage>;
}

function UsersContent() {
  const fetch = useServerFn(getUsers);
  const { period, start, end } = useFilters();
  const query = useDashboardQuery('users', () => fetch({ data: { period, start, end } }));
  return <><PageHeading title="Users" subtitle="Your learning community, all in one place." /><ReportingBar />
    <QueryState query={query}>{query.data && <>
      <div className="metrics-grid single-row">{query.data.metrics.map(metric => <Metric key={metric.label} title={metric.label} icon={metricIcon(metric.label)} description={metric.hint} value={metric.value} />)}</div>
      <RecordsTable title="All users" kind="users" table={query.data.table} filters levelColumn={4} renderCell={row => <Link className="row-link" to="/user/$userId" params={{ userId: row[0] ?? "" }}>{row[1]}</Link>} />
    </>}</QueryState></>;
}

export function UserDetailPage() {
  const { userId } = useParams({ from: '/user/$userId' });
  return <ProtectedPage title="User profile"><UserDetailContent userId={userId} /></ProtectedPage>;
}

function UserDetailContent({ userId }: { userId: string }) {
  const fetch = useServerFn(getUserDetail);
  const query = useDashboardQuery(`user-${userId}`, () => fetch({ data: { userId } }));
  return <><Button asChild variant="ghost" className="back-link"><Link to="/users"><ChevronLeft />Back to users</Link></Button>
    <PageHeading title="User profile" subtitle="Learning progress, practice history, and translation activity." />
    <QueryState query={query}>{query.data && <>
      <section className="profile-summary"><span className="profile-avatar">{(query.data.profile.name || 'L').charAt(0).toUpperCase()}</span><div><h2>{query.data.profile.name}</h2><p>{query.data.profile.email}</p><div className="profile-meta"><span><GraduationCap size={14} />{query.data.profile.level}</span><span><CalendarDays size={14} />Joined {query.data.profile.joined}</span><span><Activity size={14} />Last active {query.data.profile.lastActive}</span>{query.data.streak && <span><Zap size={14} />Longest streak {query.data.streak.longest} days</span>}</div></div></section>
      <MetricRow metrics={query.data.metrics} />
      <div className="overview-bottom"><RecordsTable title="Recent activity" kind="activity events" table={query.data.recent} /><RecordsTable title="Saved translations" kind="translations" table={query.data.translations} /></div>
    </>}</QueryState></>;
}

function AnalyticsView({ title, subtitle, metrics, charts, table, tableTitle, kind }: {
  title: string; subtitle: string; metrics: MetricDTO[]; charts: ChartDTO[]; table?: TableDTO | null; tableTitle: string; kind: string;
}) {
  return <><PageHeading title={title} subtitle={subtitle} /><ReportingBar />
    <div className="metrics-grid single-row">{metrics.map(metric => <Metric key={metric.label} title={metric.label} icon={metricIcon(metric.label)} description={metric.hint} value={metric.value} />)}</div>
    <div className="analytics-grid">{charts.map(chart => <ChartPanel key={chart.title} chart={chart} />)}</div>
    {table && <RecordsTable title={tableTitle} kind={kind} table={table} />}</>;
}

function LearningContent() {
  const fetch = useServerFn(getLearning);
  const { period, start, end } = useFilters();
  const query = useDashboardQuery('learning', () => fetch({ data: { period, start, end } }));
  return <QueryState query={query}>{query.data && <AnalyticsView title="Learning analytics" subtitle="Follow your learners’ growth, one milestone at a time." metrics={query.data.metrics} charts={query.data.charts} tableTitle="Learning records" kind="learning records" />}</QueryState>;
}

function PracticeContent() {
  const fetch = useServerFn(getPractice);
  const { period, start, end } = useFilters();
  const query = useDashboardQuery('practice', () => fetch({ data: { period, start, end } }));
  return <QueryState query={query}>{query.data && <AnalyticsView title="Practice analytics" subtitle="Understand practice habits, accuracy, and learning performance." metrics={query.data.metrics} charts={query.data.charts} table={query.data.table} tableTitle="Practice activity" kind="practice attempts" />}</QueryState>;
}

function TranslationsContent() {
  const fetch = useServerFn(getTranslations);
  const { period, start, end } = useFilters();
  const query = useDashboardQuery('translations', () => fetch({ data: { period, start, end } }));
  return <QueryState query={query}>{query.data && <AnalyticsView title="Translation analytics" subtitle="Explore how your learners bridge Telugu and English." metrics={query.data.metrics} charts={query.data.charts} table={query.data.table} tableTitle="Translation history" kind="translations" />}</QueryState>;
}

export function LearningPage() { return <ProtectedPage title="Learning analytics"><LearningContent /></ProtectedPage>; }
export function PracticePage() { return <ProtectedPage title="Practice analytics"><PracticeContent /></ProtectedPage>; }
export function TranslationsPage() { return <ProtectedPage title="Translation analytics"><TranslationsContent /></ProtectedPage>; }

export function ContentPage() {
  return <ProtectedPage title="Content management"><ContentContent /></ProtectedPage>;
}

function ContentContent() {
  const fetch = useServerFn(getContent);
  const [tab, setTab] = useState('Learning topics');
  const query = useDashboardQuery('content', () => fetch());
  const table = query.data ? (tab === 'Learning topics' ? query.data.topics : tab === 'Practice items' ? query.data.items : query.data.words) : null;
  return <><PageHeading title="Content management" subtitle="Explore the content behind every learning moment." />
    <div className="content-tabs">{['Learning topics', 'Practice items', 'Vocabulary words'].map(item => <Button key={item} variant="ghost" className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</Button>)}</div>
    <QueryState query={query}>{table && <RecordsTable key={tab} title={tab} kind={tab.toLowerCase()} table={table} />}</QueryState>
    <p className="privacy-note"><ShieldCheck size={14} />Content is read-only. Existing application records remain unchanged.</p></>;
}

export function ActivityPage() {
  return <ProtectedPage title="Recent activity"><ActivityContent /></ProtectedPage>;
}

function ActivityContent() {
  const fetch = useServerFn(getActivity);
  const { period, start, end } = useFilters();
  const [type, setType] = useState('All activity');
  const query = useDashboardQuery('activity', () => fetch({ data: { period, start, end } }));
  const table = query.data ? query.data.table : null;
  const filtered = table && type !== 'All activity' ? { ...table, rows: table.rows.filter(row => row[0] === type.replace('s', '')), total: table.rows.filter(row => row[0] === type.replace('s', '')).length } : table;
  return <><PageHeading title="Recent activity" subtitle="A timeline of your community’s learning journey." /><ReportingBar />
    <div className="activity-filters">{['All activity', 'Registrations', 'Practice', 'Translations', 'Progress'].map(item => <Button key={item} variant={item === type ? 'default' : 'outline'} size="sm" onClick={() => setType(item)}>{item}</Button>)}</div>
    <QueryState query={query}>{filtered && <RecordsTable key={type} title={type} kind="activity events" table={filtered} />}</QueryState></>;
}

export function HealthPage() {
  return <ProtectedPage title="System health"><HealthContent /></ProtectedPage>;
}

function HealthContent() {
  const fetch = useServerFn(getHealth);
  const query = useDashboardQuery('health', () => fetch());
  return <><PageHeading title="System health" subtitle="Connection status and the health of your workspace." />
    <QueryState query={query}>{query.data && <>
      <div className="health-summary"><span className="health-icon"><Database size={25} /></span><div><h2>{query.data.connected ? 'Connected to your Supabase project' : 'Connection problem'}</h2><p>{query.data.connected ? `Reading live records from ${query.data.project}.` : 'Some services could not be reached.'}</p></div><span className={`status-tag ${query.data.connected ? 'ok' : 'warning'}`}><span className={`status-dot ${query.data.connected ? 'ok' : 'warning'}`} />{query.data.connected ? 'Operational' : 'Needs attention'}</span></div>
      <section className="analytics-panel health-services"><div className="panel-header"><div><h2>Service status</h2><p>Only verified service results are shown</p></div></div>
        {query.data.checks.map(check => <div className="health-service" key={check.label}><span className="service-icon"><ShieldCheck size={17} /></span><div><strong>{check.label}</strong><p>{check.detail}</p></div><span className={`status-tag ${check.status === 'unknown' ? '' : check.status}`}><span className={`status-dot ${check.status === 'unknown' ? '' : check.status}`} />{check.status === 'ok' ? 'Passing' : check.status === 'error' ? 'Failing' : 'Not logged'}</span></div>)}
      </section>
      <section className="analytics-panel health-services"><div className="panel-header"><div><h2>Table record counts</h2><p>Exact counts read from your database</p></div></div>
        {query.data.counts.map(entry => <div className="health-service" key={entry.table}><span className="service-icon"><Database size={17} /></span><div><strong>{entry.table}</strong><p>{entry.count === null ? 'Could not be counted' : `${entry.count} record${entry.count === 1 ? '' : 's'}`}</p></div><span className="status-tag"><span className="status-dot" />{entry.count === null ? 'Unknown' : entry.count}</span></div>)}
      </section>
    </>}</QueryState></>;
}

export function SettingsPage() {
  return <ProtectedPage title="Settings"><SettingsContent /></ProtectedPage>;
}

function SettingsContent() {
  const { session, signOut } = useSession();
  const fetch = useServerFn(getHealth);
  const query = useDashboardQuery('settings', () => fetch());
  return <><PageHeading title="Workspace settings" subtitle="Your application, reporting preferences, and admin access." />
    <div className="settings-section"><div><h2>Workspace</h2><p>Application identity and reporting</p></div><div className="settings-fields"><label>Application name<input value="Maatlaadu" readOnly /></label><label>Reporting timezone<input value="Asia/Kolkata (IST)" readOnly /></label><label>Default reporting period<input value="Last 30 days" readOnly /></label></div></div>
    <div className="settings-section"><div><h2>Data connection</h2><p>Your existing Android application data</p></div><div><div className="setting-status"><Database size={20} /><div><strong>{query.data ? `Connected to ${query.data.project}` : 'Checking connection…'}</strong><p>Your existing data, tables, and access rules are unchanged.</p></div><Button asChild variant="outline"><Link to="/health">View status<ArrowRight /></Link></Button></div></div></div>
    <div className="settings-section"><div><h2>Administrator access</h2><p>Signed in as {session?.email}</p></div><div className="setting-status"><ShieldCheck size={20} /><div><strong>{session?.isAdmin ? 'Administrator permissions granted' : 'No administrator permissions'}</strong><p>Permissions come from the user_roles table and are verified on the server for every request.</p></div><Button variant="outline" onClick={signOut}>Sign out<ArrowRight /></Button></div></div>
    <ChangePassword />
    </>;
}

function ChangePassword() {
  const { session } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next.length < 8) { setStatus({ tone: 'error', text: 'Use at least 8 characters.' }); return; }
    if (next !== confirm) { setStatus({ tone: 'error', text: 'The two new passwords don’t match.' }); return; }
    const email = session?.email ?? '';
    if (!email) { setStatus({ tone: 'error', text: 'Sign in again before changing your password.' }); return; }
    setBusy(true);
    const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (checkError) {
      setBusy(false);
      setStatus({ tone: 'error', text: 'Your current password is not correct.' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) { setStatus({ tone: 'error', text: error.message }); return; }
    setStatus({ tone: 'ok', text: 'Password updated. You can sign in with the new one.' });
    setCurrent(''); setNext(''); setConfirm('');
  }
  return <div className="settings-section"><div><h2>Change password</h2><p>Updates the password for your account</p></div>
    <form className="password-form" onSubmit={submit}>
      <label>Current password<input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></label>
      <label>New password<input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>
      <div className="password-actions"><Button type="submit" disabled={busy}><KeyRound size={16} />{busy ? 'Updating…' : 'Update password'}</Button>{status && <span className={`password-status ${status.tone}`}>{status.text}</span>}</div>
    </form>
  </div>;
}

export function AuthPage() {
  const navigate = useNavigate();
  const { session, hydrated } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState('');
  useEffect(() => { if (hydrated && session?.signedIn) navigate({ to: '/', replace: true }); }, [hydrated, session, navigate]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) { setError(signInError.message); return; }
    navigate({ to: '/', replace: true });
  }
  async function reset() {
    setError(''); setResetSent('');
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (resetError) { setError(resetError.message); return; }
    setResetSent('Check your inbox for a password reset link.');
  }
  return <div className="auth-page"><div className="auth-header"><Link to="/"><Brand /></Link><Button asChild variant="ghost"><Link to="/">Back to workspace<ArrowRight /></Link></Button></div><div className="auth-content"><span className="auth-symbol"><img src={logoUrl} alt="" width={40} height={40} /></span><p className="welcome-eyebrow">MAATLAADU ADMIN</p><h1>Welcome back.</h1><p className="page-subtitle">Sign in to your administrator workspace.</p>
    <form onSubmit={submit}>
      <label>Email address<input type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <div className="auth-error">{error}</div>}
      {resetSent && <div className="auth-success">{resetSent}</div>}
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight /></Button>
      <Button type="button" variant="ghost" className="auth-forgot" onClick={reset}>Forgot password?</Button>
    </form>
    <div className="auth-pending"><ShieldCheck size={18} /><p>Only accounts marked as administrators in your Supabase project can open the dashboard.</p></div>
    <span className="auth-restricted"><ShieldCheck size={14} />Authorized administrators only</span></div><footer className="auth-footer">Maatlaadu · Learn. Practice. Speak.</footer></div>;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const recover = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const isRecovery = window.location.hash.includes('type=recovery');
        if (isRecovery) setReady(true);
        setChecking(false);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (window.location.hash.includes('type=recovery') && data.session) setReady(true);
    });
    return () => recover.data.subscription.unsubscribe();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next.length < 8) { setError('Use at least 8 characters.'); return; }
    if (next !== confirm) { setError('The two new passwords don’t match.'); return; }
    setBusy(true); setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
  }
  return <div className="auth-page"><div className="auth-header"><Link to="/"><Brand /></Link><Button asChild variant="ghost"><Link to="/">Back to workspace<ArrowRight /></Link></Button></div><div className="auth-content"><span className="auth-symbol"><img src={logoUrl} alt="" width={40} height={40} /></span><p className="welcome-eyebrow">MAATLAADU ADMIN</p><h1>Set a new password.</h1><p className="page-subtitle">Choose a password you haven’t used before.</p>
    {checking && <div className="auth-pending"><RefreshCw className="animate-spin" size={18} /><p>Checking your reset link…</p></div>}
    {!checking && !ready && !done && <div className="auth-pending"><ShieldCheck size={18} /><p>Open this page from the reset link in your email, then refresh. Reset links expire after one use.</p></div>}
    {ready && !done && <form onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>
      {error && <div className="auth-error">{error}</div>}
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}<ArrowRight /></Button>
    </form>}
    {done && <div className="auth-success">Your password is updated. Sign in with it to open the dashboard.</div>}
    {done && <Button asChild variant="outline"><Link to="/auth">Go to sign in<ArrowRight /></Link></Button>}
    <span className="auth-restricted"><ShieldCheck size={14} />Authorized administrators only</span></div><footer className="auth-footer">Maatlaadu · Learn. Practice. Speak.</footer></div>;
}
