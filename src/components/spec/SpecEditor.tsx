import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Eye,
  Code,
  AlertCircle,
  Zap,
  Save,
  Layers,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { FeatureSpec, Priority, RequirementCategory, UserStory, FunctionalRequirement } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';

interface SpecEditorProps {
  spec: FeatureSpec;
  onSaveSpec: (updatedSpec: FeatureSpec) => void;
  onTriggerAiGenerate: () => void;
  onOpenFeatureImport?: () => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({
  spec,
  onSaveSpec,
  onTriggerAiGenerate,
  onOpenFeatureImport,
}) => {
  const [activeView, setActiveView] = useState<'visual' | 'tanstack' | 'markdown'>('visual');
  const [currentSpec, setCurrentSpec] = useState<FeatureSpec>(spec);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // New Story Form State
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryPriority, setNewStoryPriority] = useState<Priority>('High');
  const [newStoryAsA, setNewStoryAsA] = useState('User');
  const [newStoryIWantTo, setNewStoryIWantTo] = useState('');
  const [newStorySoThat, setNewStorySoThat] = useState('');
  const [newStoryCriteria, setNewStoryCriteria] = useState('');

  // New FR Form State
  const [newFrTitle, setNewFrTitle] = useState('');
  const [newFrDescription, setNewFrDescription] = useState('');
  const [newFrCategory, setNewFrCategory] = useState<RequirementCategory>('Core');
  const [newFrPriority, setNewFrPriority] = useState<Priority>('High');

  const handleUpdateField = (field: keyof FeatureSpec, value: any) => {
    setCurrentSpec((prev) => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    }));
    setHasUnsaved(true);
  };

  const handleAddUserStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim() || !newStoryIWantTo.trim()) return;

    const newStory: UserStory = {
      id: `US-${100 + currentSpec.userStories.length + 1}`,
      title: newStoryTitle,
      priority: newStoryPriority,
      asA: newStoryAsA,
      iWantTo: newStoryIWantTo,
      soThat: newStorySoThat,
      acceptanceCriteria: newStoryCriteria
        ? newStoryCriteria.split('\n').filter((c) => c.trim())
        : ['Criteria 1'],
    };

    const updatedStories = [...currentSpec.userStories, newStory];
    handleUpdateField('userStories', updatedStories);

    setNewStoryTitle('');
    setNewStoryIWantTo('');
    setNewStorySoThat('');
    setNewStoryCriteria('');
  };

  const handleRemoveUserStory = (id: string) => {
    const updated = currentSpec.userStories.filter((s) => s.id !== id);
    handleUpdateField('userStories', updated);
  };

  const handleAddFR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrTitle.trim() || !newFrDescription.trim()) return;

    const newFr: FunctionalRequirement = {
      id: `FR-${100 + currentSpec.functionalRequirements.length + 1}`,
      title: newFrTitle,
      description: newFrDescription,
      category: newFrCategory,
      priority: newFrPriority,
    };

    const updatedFrs = [...currentSpec.functionalRequirements, newFr];
    handleUpdateField('functionalRequirements', updatedFrs);

    setNewFrTitle('');
    setNewFrDescription('');
  };

  const handleRemoveFR = (id: string) => {
    const updated = currentSpec.functionalRequirements.filter((f) => f.id !== id);
    handleUpdateField('functionalRequirements', updated);
  };

  const handleSave = () => {
    onSaveSpec(currentSpec);
    setHasUnsaved(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-zinc-100">Feature Specification (spec.md)</h2>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              GitHub Spec-Kit
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Define requirements, user stories, acceptance criteria, and edge cases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center text-xs">
            <button
              onClick={() => setActiveView('visual')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors ${
                activeView === 'visual' ? 'bg-zinc-800 text-cyan-300 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Editor</span>
            </button>
            <button
              onClick={() => setActiveView('tanstack')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors ${
                activeView === 'tanstack' ? 'bg-zinc-800 text-cyan-300 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>TanStack Matrix</span>
            </button>
            <button
              onClick={() => setActiveView('markdown')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors ${
                activeView === 'markdown' ? 'bg-zinc-800 text-cyan-300 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>spec.md Source</span>
            </button>
          </div>

          {onOpenFeatureImport && (
            <button
              onClick={onOpenFeatureImport}
              className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Feature / PRD</span>
            </button>
          )}

          <button
            onClick={onTriggerAiGenerate}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Refine Spec</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasUnsaved}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasUnsaved
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{hasUnsaved ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {activeView === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Spec Form (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Summary */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100">Specification Overview</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Spec Title</label>
                  <input
                    type="text"
                    value={currentSpec.title}
                    onChange={(e) => handleUpdateField('title', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Executive Summary</label>
                  <textarea
                    rows={3}
                    value={currentSpec.summary}
                    onChange={(e) => handleUpdateField('summary', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            {/* User Stories List & Builder */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>User Stories ({currentSpec.userStories.length})</span>
                </h3>
              </div>

              {/* Story Cards */}
              <div className="space-y-3">
                {currentSpec.userStories.map((story) => (
                  <div
                    key={story.id}
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 relative group hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{story.id}</span>
                        <span className="text-xs font-semibold text-zinc-200">{story.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            story.priority === 'High'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {story.priority}
                        </span>
                        <button
                          onClick={() => handleRemoveUserStory(story.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300">
                      <span className="text-zinc-500">As a </span>
                      <strong className="text-zinc-200">{story.asA}</strong>
                      <span className="text-zinc-500">, I want to </span>
                      <strong className="text-zinc-200">{story.iWantTo}</strong>
                      {story.soThat && (
                        <>
                          <span className="text-zinc-500">, so that </span>
                          <strong className="text-zinc-200">{story.soThat}</strong>
                        </>
                      )}
                      .
                    </p>

                    {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                      <div className="pt-2 border-t border-zinc-900 space-y-1">
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Acceptance Criteria:
                        </div>
                        <ul className="space-y-1">
                          {story.acceptanceCriteria.map((criterion, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-zinc-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add User Story Form */}
              <form onSubmit={handleAddUserStory} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-200">Add New User Story</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Story Title (e.g. Offline Spec Editing)"
                      value={newStoryTitle}
                      onChange={(e) => setNewStoryTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <select
                      value={newStoryPriority}
                      onChange={(e) => setNewStoryPriority(e.target.value as Priority)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                    >
                      <option value="High">Priority: High</option>
                      <option value="Medium">Priority: Medium</option>
                      <option value="Low">Priority: Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="As a [Role] (e.g. Architect)"
                    value={newStoryAsA}
                    onChange={(e) => setNewStoryAsA(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="I want to [Goal]"
                    value={newStoryIWantTo}
                    onChange={(e) => setNewStoryIWantTo(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="So that [Benefit]"
                    value={newStorySoThat}
                    onChange={(e) => setNewStorySoThat(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Acceptance criteria (one per line)..."
                    value={newStoryCriteria}
                    onChange={(e) => setNewStoryCriteria(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add User Story</span>
                </button>
              </form>
            </div>

            {/* Functional Requirements */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Functional Requirements ({currentSpec.functionalRequirements.length})</span>
              </h3>

              <div className="space-y-2">
                {currentSpec.functionalRequirements.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400">{fr.id}</span>
                        <span className="font-semibold text-zinc-200">{fr.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          {fr.category}
                        </span>
                      </div>
                      <p className="text-zinc-400">{fr.description}</p>
                    </div>

                    <button
                      onClick={() => handleRemoveFR(fr.id)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add FR Form */}
              <form onSubmit={handleAddFR} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-200">Add Functional Requirement</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Requirement Title"
                    value={newFrTitle}
                    onChange={(e) => setNewFrTitle(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                  />
                  <select
                    value={newFrCategory}
                    onChange={(e) => setNewFrCategory(e.target.value as RequirementCategory)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none"
                  >
                    <option value="Core">Category: Core</option>
                    <option value="UI/UX">Category: UI/UX</option>
                    <option value="API">Category: API</option>
                    <option value="Database">Category: Database</option>
                    <option value="Security">Category: Security</option>
                    <option value="Performance">Category: Performance</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Detailed functional description..."
                  value={newFrDescription}
                  onChange={(e) => setNewFrDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none"
                />

                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Functional Requirement</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar (1/3): User Flows & Edge Cases */}
          <div className="space-y-6">
            {/* User Flows */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 text-xs">
              <h3 className="font-bold text-zinc-100">User Flow Steps</h3>
              <div className="space-y-2">
                {currentSpec.userFlows.map((flow, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <span className="font-mono text-cyan-400 font-bold shrink-0">{i + 1}.</span>
                    <span className="text-zinc-300">{flow}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge Cases */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 text-xs">
              <h3 className="font-bold text-zinc-100 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Edge Cases & Risk Mitigation</span>
              </h3>
              <div className="space-y-2">
                {currentSpec.edgeCases.map((ec, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-200">
                    {ec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeView === 'tanstack' ? (
        /* TanStack Table Matrix View */
        <div className="space-y-6">
          {/* User Stories TanStack Table */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-purple-400" />
                <span>User Stories Matrix (@tanstack/react-table)</span>
              </h3>
            </div>

            <TanStackTable
              data={currentSpec.userStories}
              placeholderText="Filter user stories by ID, role, or title..."
              columns={[
                {
                  accessorKey: 'id',
                  header: 'ID',
                  cell: (info) => <span className="font-mono font-bold text-indigo-400">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'priority',
                  header: 'Priority',
                  cell: (info) => {
                    const val = info.getValue();
                    return (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          val === 'High'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {val}
                      </span>
                    );
                  },
                },
                {
                  accessorKey: 'title',
                  header: 'Story Title',
                  cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'asA',
                  header: 'User Role',
                  cell: (info) => <span className="text-zinc-300 font-mono text-[11px]">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'iWantTo',
                  header: 'Goal / Capability',
                  cell: (info) => <span className="text-zinc-300">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'soThat',
                  header: 'Business Benefit',
                  cell: (info) => <span className="text-zinc-400">{info.getValue() || '-'}</span>,
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: (info) => (
                    <button
                      onClick={() => handleRemoveUserStory(info.row.original.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                      title="Remove Story"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ),
                },
              ]}
            />
          </div>

          {/* Functional Requirements TanStack Table */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-cyan-400" />
              <span>Functional Requirements Matrix (@tanstack/react-table)</span>
            </h3>

            <TanStackTable
              data={currentSpec.functionalRequirements}
              placeholderText="Filter requirements by title, category, or ID..."
              columns={[
                {
                  accessorKey: 'id',
                  header: 'ID',
                  cell: (info) => <span className="font-mono font-bold text-cyan-400">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'category',
                  header: 'Category',
                  cell: (info) => (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                      {info.getValue()}
                    </span>
                  ),
                },
                {
                  accessorKey: 'title',
                  header: 'Requirement Title',
                  cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
                },
                {
                  accessorKey: 'description',
                  header: 'Detailed Specification',
                  cell: (info) => <span className="text-zinc-400">{info.getValue()}</span>,
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: (info) => (
                    <button
                      onClick={() => handleRemoveFR(info.row.original.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                      title="Remove Requirement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      ) : (
        /* Markdown Raw Source View */
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Raw spec.md Document Output</span>
            <span>Formatted for GitHub Spec-Kit CLI</span>
          </div>
          <textarea
            rows={22}
            value={currentSpec.markdown}
            onChange={(e) => handleUpdateField('markdown', e.target.value)}
            className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
