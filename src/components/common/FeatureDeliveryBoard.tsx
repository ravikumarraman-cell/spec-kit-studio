import React, { useMemo, useState } from 'react';
import { CheckCircle2, CheckSquare, Clock3, Code, Columns3, Table2 } from 'lucide-react';

interface DeliveryTask { id: string; requirement?: string; title: string; done: boolean; detail?: string; }
interface Props { content: string; sourcePath?: string; completedTaskIds?: string[]; }

function parseTasks(content: string): DeliveryTask[] {
  return content.split('\n').flatMap((line) => {
    const modern = line.match(/^-\s+\[([ xX])\]\s+(T\d+)\s+(?:\[([^\]]+)\]\s+)?(.+)$/);
    const legacy = line.match(/^-\s+\[([ xX])\]\s+\*\*(TASK-[^*]+)\*\*\s*(?:\(([^)]+)\))?\s*:\s*(.+)$/);
    const match = modern || legacy;
    if (!match) return [];
    const [, checked, id, requirement, title] = match;
    return [{ id: id.trim(), requirement: requirement?.trim(), title: title.trim(), done: checked.toLowerCase() === 'x' }];
  });
}

/** Turns an official tasks.md into the same deliberate review surfaces as Studio's shared board. */
export function FeatureDeliveryBoard({ content, sourcePath, completedTaskIds = [] }: Props) {
  const [view, setView] = useState<'kanban' | 'matrix' | 'source'>('kanban');
  const tasks = useMemo(() => parseTasks(content).map((task) => ({ ...task, done: task.done || completedTaskIds.includes(task.id) })), [content, completedTaskIds]);
  const columns = [
    { label: 'To do', tasks: tasks.filter((task) => !task.done), tone: 'border-zinc-700', labelTone: 'text-zinc-300', icon: <span className="h-2 w-2 rounded-full bg-zinc-500" /> },
    { label: 'In progress', tasks: [] as DeliveryTask[], tone: 'border-amber-400/25', labelTone: 'text-amber-300', icon: <span className="h-2 w-2 rounded-full bg-amber-400" /> },
    { label: 'Completed', tasks: tasks.filter((task) => task.done), tone: 'border-emerald-400/35', labelTone: 'text-emerald-300', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ];
  return <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/20 bg-zinc-950/50">
    <div className="flex flex-col gap-3 border-b border-zinc-800 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-bold text-zinc-100"><CheckSquare className="h-4 w-4 text-cyan-300" />Feature delivery board</div><p className="mt-1 text-[11px] text-zinc-400">{tasks.length} feature tasks · {tasks.filter((task) => task.done).length} complete · {sourcePath || 'tasks.md'}</p></div><div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-950 p-1 text-[11px]">{([['kanban', Columns3, 'Kanban'], ['matrix', Table2, 'Trace matrix'], ['source', Code, 'Source']] as const).map(([id, Icon, label]) => <button key={id} type="button" onClick={() => setView(id)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-bold ${view === id ? 'bg-cyan-500/15 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div></div>
    {view === 'kanban' && <div className="grid gap-3 p-4 xl:grid-cols-3">{columns.map((column) => <section key={column.label} className={`min-h-80 rounded-2xl border ${column.tone} bg-zinc-900/45 p-4`}><div className={`mb-4 flex items-center justify-between text-xs font-bold ${column.labelTone}`}><span className="flex items-center gap-1.5">{column.icon}{column.label}</span><span className="rounded bg-zinc-950 px-2 py-0.5 text-zinc-400">{column.tasks.length}</span></div><div className="space-y-3">{column.tasks.map((task) => <article key={task.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-cyan-500/5"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] font-bold text-cyan-300">{task.id}</span>{task.requirement && <span className="rounded border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">{task.requirement}</span>}</div><h4 className="mt-3 text-xs font-bold leading-relaxed text-zinc-100">{task.title}</h4>{task.detail && <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-zinc-400">{task.detail}</p>}<div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-[10px]"><span className="inline-flex items-center gap-1 text-zinc-500"><Clock3 className="h-3 w-3" />Feature task</span><span className={task.done ? 'rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300' : 'rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400'}>{task.done ? 'Complete' : 'Planned'}</span></div></article>)}{column.tasks.length === 0 && <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 p-6 text-center text-xs text-zinc-500">{column.label === 'In progress' ? 'Move a feature task here when implementation starts.' : 'No tasks yet.'}</div>}</div></section>)}</div>}
    {view === 'matrix' && <div className="overflow-auto p-4"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Task</th><th className="p-3">Requirement</th><th className="p-3">Status</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-zinc-800"><td className="p-3"><span className="font-mono text-cyan-300">{task.id}</span><span className="ml-2 text-zinc-200">{task.title}</span></td><td className="p-3 text-violet-200">{task.requirement || '—'}</td><td className="p-3"><span className={task.done ? 'text-emerald-300' : 'text-amber-200'}>{task.done ? 'Complete' : 'To do'}</span></td></tr>)}</tbody></table></div>}
    {view === 'source' && <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 text-[10px] leading-relaxed text-zinc-400">{content}</pre>}
  </div>;
}
