import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText,
  Eye,
  Table as TableIcon,
  Code,
  Layers,
  Sparkles
} from 'lucide-react';
import { FeatureInboxItem, FeatureSpec, RequirementCategory, UserStory, FunctionalRequirement } from '../../types/speckit';
import { groupRequirementsByFeature, groupStoriesByFeature } from '../../lib/featureStoryGroups';
import { EditorHeader } from '../common/EditorHeader';
import { ViewToggle, ViewOption } from '../common/ViewToggle';
import { MarkdownSourceView } from '../common/MarkdownSourceView';
import { SpecGeneralInfo } from './SpecGeneralInfo';
import { UserStoryCard } from './UserStoryCard';
import { AddUserStoryForm } from './AddUserStoryForm';
import { RequirementCard } from './RequirementCard';
import { AddRequirementForm } from './AddRequirementForm';
import { SpecEdgeCases } from './SpecEdgeCases';
import { SpecTanStackMatrix } from './SpecTanStackMatrix';

interface SpecEditorProps {
  projectId: string;
  spec: FeatureSpec;
  onSaveSpec: (updatedSpec: FeatureSpec) => void;
  onTriggerAiGenerate: () => void;
  onOpenFeatureImport?: () => void;
  featureInbox?: FeatureInboxItem[];
}

type SpecViewMode = 'visual' | 'tanstack' | 'markdown';

const VIEW_OPTIONS: ViewOption<SpecViewMode>[] = [
  { id: 'visual', label: 'Visual Editor', icon: Eye },
  { id: 'tanstack', label: 'TanStack Matrix', icon: TableIcon, badge: 'High Density' },
  { id: 'markdown', label: 'spec.md Source', icon: Code },
];

const CATEGORIES: RequirementCategory[] = ['Core', 'UI/UX', 'API', 'Database', 'Security', 'Performance', 'Integration'];

export const SpecEditor: React.FC<SpecEditorProps> = ({
  projectId,
  spec,
  onSaveSpec,
  onTriggerAiGenerate,
  onOpenFeatureImport,
  featureInbox,
}) => {
  const [activeView, setActiveView] = useState<SpecViewMode>('visual');
  const [currentSpec, setCurrentSpec] = useState<FeatureSpec>(spec);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // The shell keeps an editor mounted while a user switches workspaces. Never
  // carry a previous project's draft into the newly selected project.
  useEffect(() => {
    setCurrentSpec(spec);
    setHasUnsaved(false);
    setActiveCategoryFilter('all');
  }, [projectId, spec]);

  const handleUpdateField = useCallback((field: keyof FeatureSpec, value: any) => {
    setCurrentSpec((prev) => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    }));
    setHasUnsaved(true);
  }, []);

  const handleSave = useCallback(() => {
    onSaveSpec(currentSpec);
    setHasUnsaved(false);
  }, [currentSpec, onSaveSpec]);

  const handleAddUserStory = useCallback((storyData: Omit<UserStory, 'id'>) => {
    setCurrentSpec((prev) => {
      const newStory: UserStory = {
        ...storyData,
        id: `US-${100 + prev.userStories.length + 1}`,
      };
      const updated = {
        ...prev,
        userStories: [...prev.userStories, newStory],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleRemoveUserStory = useCallback((id: string) => {
    setCurrentSpec((prev) => {
      const updated = {
        ...prev,
        userStories: prev.userStories.filter((s) => s.id !== id),
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleAddFR = useCallback((frData: Omit<FunctionalRequirement, 'id'>) => {
    setCurrentSpec((prev) => {
      const newFr: FunctionalRequirement = {
        ...frData,
        id: `FR-${100 + prev.functionalRequirements.length + 1}`,
      };
      const updated = {
        ...prev,
        functionalRequirements: [...prev.functionalRequirements, newFr],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleRemoveFR = useCallback((id: string) => {
    setCurrentSpec((prev) => {
      const updated = {
        ...prev,
        functionalRequirements: prev.functionalRequirements.filter((f) => f.id !== id),
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const filteredFRs = useMemo(() => {
    return activeCategoryFilter === 'all'
      ? currentSpec.functionalRequirements
      : currentSpec.functionalRequirements.filter((f) => f.category === activeCategoryFilter);
  }, [currentSpec.functionalRequirements, activeCategoryFilter]);
  const storyGroups = useMemo(() => groupStoriesByFeature(currentSpec.userStories, featureInbox), [currentSpec.userStories, featureInbox]);
  const requirementGroups = useMemo(() => groupRequirementsByFeature(filteredFRs, featureInbox), [filteredFRs, featureInbox]);

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={FileText}
        iconColor="text-indigo-400"
        title="Feature Specification (spec.md)"
        subtitle="Define requirements, user stories, acceptance criteria, and edge cases."
        badgeLabel="Deterministic SDD"
        badgeColor="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        hasUnsaved={hasUnsaved}
        onSave={handleSave}
        onTriggerAi={onTriggerAiGenerate}
        aiButtonLabel="AI Auto-Generate Spec"
        viewToggle={
          <ViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
            options={VIEW_OPTIONS}
          />
        }
        extraActions={
          onOpenFeatureImport ? (
            <button
              type="button"
              onClick={onOpenFeatureImport}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Import Feature from PRD or raw notes"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Import Feature</span>
            </button>
          ) : undefined
        }
      />

      {/* Visual Editor View */}
      {activeView === 'visual' && (
        <div className="space-y-6">
          <SpecGeneralInfo spec={currentSpec} onChangeField={handleUpdateField} />

          {/* User Stories Section */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>User Stories ({currentSpec.userStories.length})</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Agile user stories with role, capability, and Given/When/Then acceptance criteria.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {storyGroups.map((group) => (
                <section key={group.id} className={`rounded-xl border p-3 ${group.imported ? 'border-violet-400/25 bg-violet-500/5' : 'border-zinc-800 bg-zinc-950/35'}`}>
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h4 className="text-xs font-bold text-zinc-100">{group.label}</h4>{group.imported && <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-200">Imported feature</span>}</div><p className="mt-1 text-[11px] text-zinc-400">{group.description}</p></div><span className="shrink-0 rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300">{group.stories.length} {group.stories.length === 1 ? 'story' : 'stories'}</span></div>
                  <div className="space-y-3">{group.stories.map((story) => <UserStoryCard key={story.id} story={story} onRemove={handleRemoveUserStory} />)}</div>
                </section>
              ))}
            </div>

            <AddUserStoryForm onAddStory={handleAddUserStory} />
          </div>

          {/* Functional Requirements Section */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Functional Requirements ({currentSpec.functionalRequirements.length})</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Discrete, verifiable engineering requirements linked to tasks.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    activeCategoryFilter === 'all'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  All ({currentSpec.functionalRequirements.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = currentSpec.functionalRequirements.filter((f) => f.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                        activeCategoryFilter === cat
                          ? 'bg-cyan-600 text-white font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              {requirementGroups.map((group) => (
                <section key={group.id} className={`rounded-xl border p-3 ${group.imported ? 'border-cyan-400/25 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-950/35'}`}>
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h4 className="text-xs font-bold text-zinc-100">{group.label}</h4>{group.imported && <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">Imported feature</span>}</div><p className="mt-1 text-[11px] text-zinc-400">{group.description}</p></div><span className="shrink-0 rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300">{group.requirements.length} requirements</span></div>
                  <div className="space-y-2">{group.requirements.map((req) => <RequirementCard key={req.id} req={req} onRemove={handleRemoveFR} />)}</div>
                </section>
              ))}
            </div>

            <AddRequirementForm onAddFR={handleAddFR} />
          </div>

          {/* Success Metrics & Edge Cases */}
          <SpecEdgeCases
            successMetrics={currentSpec.successMetrics}
            edgeCases={currentSpec.edgeCases}
          />
        </div>
      )}

      {/* TanStack Matrix View */}
      {activeView === 'tanstack' && (
        <SpecTanStackMatrix
          userStories={currentSpec.userStories}
          functionalRequirements={currentSpec.functionalRequirements}
          onRemoveStory={handleRemoveUserStory}
          onRemoveFR={handleRemoveFR}
        />
      )}

      {/* Markdown Source View */}
      {activeView === 'markdown' && (
        <MarkdownSourceView
          value={currentSpec.markdown}
          onChange={(val) => handleUpdateField('markdown', val)}
          fileName="spec.md"
          title="Raw spec.md Document Output"
          subtitle="Formatted for GitHub spec-kit CLI"
        />
      )}
    </div>
  );
};
