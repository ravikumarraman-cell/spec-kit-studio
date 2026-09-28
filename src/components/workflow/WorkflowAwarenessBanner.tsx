import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../types/speckit';
import { activeWorkflowContext } from '../../lib/workflowContext';

interface Props { project: SpecKitProject; activeTab: ViewTab; onOpenWorkflow: () => void; }

/** Shell-level context guard: prevents feature-only tools from silently masquerading as the active workflow. */
export function WorkflowAwarenessBanner({ project, activeTab, onOpenWorkflow }: Props) {
  const context = activeWorkflowContext(project);
  if (!context || activeTab === 'workflows' || activeTab === 'workspace') return null;
  return <section className="mx-auto mb-6 max-w-5xl rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 text-xs"><div className="flex gap-3"><div className="rounded-xl bg-violet-500/15 p-2 text-violet-200"><Compass className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">Active workflow · {context.label}</p><h2 className="mt-1 font-bold text-zinc-100">{context.caseTitle || 'No case selected yet'}</h2><p className="mt-1 text-zinc-400">This screen belongs to Feature Delivery. Your active workflow’s next step is <strong className="text-zinc-200">{context.nextStep}</strong>.</p><button type="button" onClick={onOpenWorkflow} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 font-bold text-violet-100 hover:bg-violet-500/20">Return to {context.label}<ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>;
}
