import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { DashboardNextAction } from './dashboardTypes';

interface Props { action: DashboardNextAction; onNavigate: () => void; }
export function NextActionCard({ action, onNavigate }: Props) {
  return <section aria-labelledby="next-action-title" className="workspace-hub-next-action rounded-2xl border p-5 shadow-xs sm:p-6"><p className="workspace-hub-eyebrow text-[10px] font-black tracking-[0.16em]">{action.eyebrow}</p><h2 id="next-action-title" className="workspace-hub-title mt-2 text-xl font-bold tracking-tight">{action.title}</h2><p className="workspace-hub-muted mt-2 max-w-2xl text-sm leading-6">{action.description}</p><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={onNavigate} className="workspace-hub-button workspace-hub-button--primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{action.actionLabel}<ArrowRight className="h-4 w-4" /></button><span className="workspace-hub-muted inline-flex items-center gap-1.5 text-xs"><CheckCircle2 className="workspace-hub-success h-4 w-4" />One focused next step</span></div></section>;
}
