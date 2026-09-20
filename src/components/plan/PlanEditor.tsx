import React, { useState, useCallback } from 'react';
import {
  Workflow,
  Eye,
  GitBranch,
  Table as TableIcon,
  Code
} from 'lucide-react';
import { ImplementationPlan, TechStackItem, ApiContract, ADR, FeatureInboxItem } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { ViewToggle, ViewOption } from '../common/ViewToggle';
import { MarkdownSourceView } from '../common/MarkdownSourceView';
import { MermaidViewer } from '../common/MermaidViewer';
import { TechStackSection } from './TechStackSection';
import { ApiContractsSection } from './ApiContractsSection';
import { DataSchemasSection } from './DataSchemasSection';
import { AdrSection } from './AdrSection';
import { PlanTanStackMatrix } from './PlanTanStackMatrix';
import { FeatureArtifactViewer } from '../common/FeatureArtifactViewer';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';

interface PlanEditorProps {
  plan: ImplementationPlan;
  onSavePlan: (updatedPlan: ImplementationPlan) => void;
  onTriggerAiGenerate: () => void;
  isDarkMode?: boolean;
  focusFeature?: FeatureInboxItem;
}

type PlanViewMode = 'visual' | 'tanstack' | 'diagram' | 'markdown';

const VIEW_OPTIONS: ViewOption<PlanViewMode>[] = [
  { id: 'visual', label: 'Visual Architecture', icon: Eye },
  { id: 'tanstack', label: 'TanStack Matrix', icon: TableIcon, badge: 'High Density' },
  { id: 'diagram', label: 'Mermaid Diagram', icon: GitBranch },
  { id: 'markdown', label: 'plan.md Source', icon: Code },
];

export const PlanEditor: React.FC<PlanEditorProps> = ({
  plan,
  onSavePlan,
  onTriggerAiGenerate,
  isDarkMode = true,
  focusFeature,
}) => {
  const [activeView, setActiveView] = useState<PlanViewMode>('visual');
  const [currentPlan, setCurrentPlan] = useState<ImplementationPlan>(plan);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const handleUpdateField = useCallback((field: keyof ImplementationPlan, value: any) => {
    setCurrentPlan((prev) => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    }));
    setHasUnsaved(true);
  }, []);

  const handleSave = useCallback(() => {
    onSavePlan(currentPlan);
    setHasUnsaved(false);
  }, [currentPlan, onSavePlan]);

  const handleAddTech = useCallback((item: TechStackItem) => {
    setCurrentPlan((prev) => {
      const updated = {
        ...prev,
        techStack: [...prev.techStack, item],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleRemoveTech = useCallback((idx: number) => {
    setCurrentPlan((prev) => {
      const updated = {
        ...prev,
        techStack: prev.techStack.filter((_, i) => i !== idx),
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleAddApi = useCallback((contract: Omit<ApiContract, 'id'>) => {
    setCurrentPlan((prev) => {
      const newApi: ApiContract = {
        ...contract,
        id: `API-${prev.apiContracts.length + 1}`,
      };
      const updated = {
        ...prev,
        apiContracts: [...prev.apiContracts, newApi],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleRemoveApi = useCallback((id: string) => {
    setCurrentPlan((prev) => {
      const updated = {
        ...prev,
        apiContracts: prev.apiContracts.filter((a) => a.id !== id),
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleAddAdr = useCallback((adr: Omit<ADR, 'id'>) => {
    setCurrentPlan((prev) => {
      const newAdr: ADR = {
        ...adr,
        id: `ADR-${(prev.adrs || []).length + 1}`,
      };
      const updated = {
        ...prev,
        adrs: [...(prev.adrs || []), newAdr],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {focusFeature && <section className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Current feature architecture plan</p>
        <h1 className="mt-1 text-lg font-bold text-zinc-100">{focusFeature.title}</h1>
        {focusFeature.architecturePlan?.acceptedAt && focusFeature.architecturePlan.path && isFeatureArtifactScoped(focusFeature.architecturePlan.content, focusFeature) ? <>
          <p className="mt-1 text-xs text-zinc-300">This is the accepted, feature-scoped architecture plan. The shared architecture editor below is repository context, not this feature’s proposed design.</p>
          <FeatureArtifactViewer content={focusFeature.architecturePlan.content} artifactLabel="plan.md" sourcePath={focusFeature.architecturePlan.path} acceptedAt={focusFeature.architecturePlan.acceptedAt} />
        </> : <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100"><strong>No usable feature architecture plan yet.</strong> The saved artifact does not demonstrate that it belongs to this feature, so Studio will not present it as evidence. Return to Design safely to find or generate a feature-scoped <code>plan.md</code>.</div>}
        <p className="mt-3 text-[11px] text-zinc-500">{focusFeature.userStoryIds.length} stories · {focusFeature.requirementIds.length} requirements define the scope of this plan.</p>
      </section>}
      <details className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-3" open={!focusFeature}>
        <summary className="cursor-pointer rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800/60">
          {focusFeature ? 'Open shared repository architecture' : 'Shared repository architecture'}
          <span className="ml-2 text-xs font-normal text-zinc-500">{focusFeature ? 'Optional context and shared-editor controls' : 'Technology choices, APIs, schemas, and ADRs'}</span>
        </summary>
        <div className="mt-4 space-y-6">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={Workflow}
        iconColor="text-emerald-400"
        title="Implementation Plan (plan.md)"
        subtitle="Architecture blueprint, tech stack selections, API contracts, and data schemas."
        badgeLabel="System Architecture"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        hasUnsaved={hasUnsaved}
        onSave={handleSave}
        onTriggerAi={onTriggerAiGenerate}
        aiButtonLabel="AI Auto-Generate Plan"
        viewToggle={
          <ViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
            options={VIEW_OPTIONS}
          />
        }
      />

      {/* Visual Editor */}
      {activeView === 'visual' && (
        <div className="space-y-6">
          <TechStackSection
            techStack={currentPlan.techStack}
            onAddTech={handleAddTech}
            onRemoveTech={handleRemoveTech}
          />

          <ApiContractsSection
            apiContracts={currentPlan.apiContracts}
            onAddApi={handleAddApi}
            onRemoveApi={handleRemoveApi}
          />

          <DataSchemasSection dataSchemas={currentPlan.dataSchemas} />

          <AdrSection
            adrs={currentPlan.adrs || []}
            onAddAdr={handleAddAdr}
          />
        </div>
      )}

      {/* TanStack Matrix View */}
      {activeView === 'tanstack' && (
        <PlanTanStackMatrix
          apiContracts={currentPlan.apiContracts}
          techStack={currentPlan.techStack}
          onRemoveApi={handleRemoveApi}
          onRemoveTech={handleRemoveTech}
        />
      )}

      {/* Mermaid Diagram View */}
      {activeView === 'diagram' && (
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>Interactive Architecture Diagram (Mermaid.js)</span>
            </h3>
          </div>
          <MermaidViewer chart={currentPlan.mermaidDiagram} isDarkMode={isDarkMode} />
        </div>
      )}

      {/* Markdown Source View */}
      {activeView === 'markdown' && (
        <MarkdownSourceView
          value={currentPlan.markdown}
          onChange={(val) => handleUpdateField('markdown', val)}
          fileName="plan.md"
          title="Raw plan.md Document Output"
          subtitle="Architecture formatted for spec-kit CLI"
        />
      )}
        </div>
      </details>
    </div>
  );
};
