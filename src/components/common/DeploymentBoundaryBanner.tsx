import { useEffect, useState } from 'react';
import { Landmark, ShieldAlert } from 'lucide-react';
import { currentDeploymentBoundary, DeploymentBoundary } from '../../lib/deploymentBoundary';

function boundaryCopy(boundary: DeploymentBoundary) {
  if (boundary.mode === 'govcloud') return {
    title: 'GovCloud deployment boundary',
    detail: 'Enterprise access is required. External AI egress is disabled unless an approved in-boundary adapter is configured.',
  };
  return {
    title: 'DoD deployment boundary',
    detail: 'Enterprise access is required. External AI egress is disabled unless an approved in-boundary adapter is configured.',
  };
}

/** Persistent chrome, not workflow content: every screen should make a
 * regulated operating boundary obvious without duplicating it in each view. */
export function DeploymentBoundaryBanner() {
  const [boundary, setBoundary] = useState<DeploymentBoundary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void currentDeploymentBoundary(controller.signal).then((next) => {
      if (!controller.signal.aborted) setBoundary(next?.regulated ? next : null);
    });
    return () => controller.abort();
  }, []);

  if (!boundary) return null;
  const copy = boundaryCopy(boundary);
  return <aside aria-label={`${copy.title}: regulated operating context`} className="shrink-0 border-b border-amber-400/45 bg-amber-500/15 px-3 py-2 text-amber-950 dark:text-amber-50">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 text-xs">
      <span className="inline-flex items-center gap-2 font-black uppercase tracking-[0.14em]"><Landmark className="h-4 w-4" />{copy.title}</span>
      <span className="inline-flex items-center gap-2 text-[11px] font-medium"><ShieldAlert className="h-3.5 w-3.5 shrink-0" />{copy.detail}</span>
      <span className="text-[10px] font-semibold opacity-80">Operating mode, not a certification claim</span>
    </div>
  </aside>;
}
