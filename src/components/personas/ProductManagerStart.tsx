import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ProductManagerStartProps {
  onCreate: (title: string, summary: string) => boolean;
  onImport: () => void;
}

/**
 * Product-only intake content. The shared persona workspace owns route
 * selection, progress, handoffs, and imports; this component owns only the
 * fields needed to create an outcome. Keeping that boundary explicit lets a
 * future persona supply its own intake without copying the workspace shell.
 */
export function ProductManagerStart({ onCreate, onImport }: ProductManagerStartProps) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!title.trim() || !problem.trim()) {
      setError('Name the outcome and describe the problem before continuing.');
      return;
    }
    if (!onCreate(title.trim(), problem.trim())) setError('Studio could not create this Product Manager feature. Nothing was saved; try again.');
  };

  return <section className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-900 p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Step 1 of 3 · Product Manager</p>
    <h1 className="mt-1 text-2xl font-bold text-zinc-100">Define the outcome</h1>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">Start with the customer problem and the desired outcome. No repository connection is needed. Studio will create a feature-owned product brief for review next.</p>
    <div className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-zinc-200">What outcome are you trying to create?<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Give tenant leaders one clear health summary" className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-300 focus:outline-none" /></label>
      <label className="grid gap-2 text-sm font-semibold text-zinc-200">What problem needs solving?<textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Describe who is affected, what is difficult today, and why it matters." rows={5} className="resize-y rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-300 focus:outline-none" /></label>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-violet-300"><Sparkles className="h-4 w-4" />Create product brief</button><button type="button" onClick={onImport} className="rounded-xl border border-violet-300/40 px-4 py-3 text-sm font-bold text-violet-100 hover:bg-violet-500/10">Import an existing feature</button></div>
    <p className="mt-3 text-xs text-zinc-400">Creating a brief is the fastest path from a short outcome to a reviewable product handoff. Import when you already have a feature, ticket, file, GitHub issue, milestone, or reference image.</p>
  </section>;
}
