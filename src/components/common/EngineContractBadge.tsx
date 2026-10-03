import { CheckCircle2, CircleAlert } from 'lucide-react';
import { SpecKitProject } from '../../types/speckit';
import { selectedEngineContract } from '../../lib/sddEngineWorkflow';

interface Props {
  project: SpecKitProject;
  status?: 'validated' | 'pending';
  className?: string;
}

/** Reusable disclosure for any persona, Journey stage, or export surface. */
export function EngineContractBadge({ project, status = 'pending', className = '' }: Props) {
  const contract = selectedEngineContract(project);
  const valid = contract.available && status === 'validated';
  const Icon = valid ? CheckCircle2 : CircleAlert;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${valid ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/35 bg-amber-500/10 text-amber-100'} ${className}`} title={valid ? 'All required engine artifacts passed validation.' : 'The engine contract is selected; required artifacts still need validation.'}>
    <Icon className="h-3.5 w-3.5" />{contract.label} {contract.version} · {valid ? 'validated' : contract.available ? 'validation required' : 'unavailable'}
  </span>;
}
