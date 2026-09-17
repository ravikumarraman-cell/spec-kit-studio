import React, { useState, useCallback } from 'react';
import {
  ShieldCheck,
  Eye,
  Table as TableIcon,
  Code
} from 'lucide-react';
import { ProjectConstitution, ConstitutionRule } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { ViewToggle, ViewOption } from '../common/ViewToggle';
import { MarkdownSourceView } from '../common/MarkdownSourceView';
import { RuleCard } from './RuleCard';
import { AddRuleForm } from './AddRuleForm';
import { ConstitutionPresets } from './ConstitutionPresets';
import { ConstitutionTanStackMatrix } from './ConstitutionTanStackMatrix';

interface ConstitutionEditorProps {
  constitution: ProjectConstitution;
  onSaveConstitution: (updatedConstitution: ProjectConstitution) => void;
}

type ConstitutionViewMode = 'visual' | 'tanstack' | 'markdown';

const VIEW_OPTIONS: ViewOption<ConstitutionViewMode>[] = [
  { id: 'visual', label: 'Visual Policies', icon: Eye },
  { id: 'tanstack', label: 'TanStack Matrix', icon: TableIcon, badge: 'High Density' },
  { id: 'markdown', label: 'constitution.md Source', icon: Code },
];

export const ConstitutionEditor: React.FC<ConstitutionEditorProps> = ({
  constitution,
  onSaveConstitution,
}) => {
  const [activeView, setActiveView] = useState<ConstitutionViewMode>('visual');
  const [currentConst, setCurrentConst] = useState<ProjectConstitution>(constitution);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const handleSave = useCallback(() => {
    onSaveConstitution(currentConst);
    setHasUnsaved(false);
  }, [currentConst, onSaveConstitution]);

  const handleUpdateField = useCallback((field: keyof ProjectConstitution, value: any) => {
    setCurrentConst((prev) => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    }));
    setHasUnsaved(true);
  }, []);

  const handleAddRule = useCallback((ruleData: Omit<ConstitutionRule, 'id'>) => {
    setCurrentConst((prev) => {
      const newRule: ConstitutionRule = {
        ...ruleData,
        id: `RULE-${10 + prev.rules.length + 1}`,
      };
      const updated = {
        ...prev,
        rules: [...prev.rules, newRule],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleRemoveRule = useCallback((id: string) => {
    setCurrentConst((prev) => {
      const updated = {
        ...prev,
        rules: prev.rules.filter((r) => r.id !== id),
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  const handleApplyPreset = useCallback((presetName: string) => {
    let presetRules: ConstitutionRule[] = [];
    if (presetName === 'security') {
      presetRules = [
        {
          id: `RULE-SEC-${Date.now().toString().slice(-3)}`,
          title: 'Zero Direct API Key Exposure',
          category: 'Security',
          description: 'All AI model and secret keys must be kept strictly on server side.',
          ruleStatement: 'Never send raw secrets or API keys to browser clients. Proxy all requests via /api/* routes.',
          strictness: 'Mandatory',
        },
        {
          id: `RULE-SEC-${Date.now().toString().slice(-3)}1`,
          title: 'Input Validation & Sanitization',
          category: 'Security',
          description: 'Validate all inputs against schema before processing.',
          ruleStatement: 'All API routes must validate payload schemas before handling.',
          strictness: 'Mandatory',
        },
      ];
    } else if (presetName === 'typescript') {
      presetRules = [
        {
          id: `RULE-TS-${Date.now().toString().slice(-3)}`,
          title: 'Strict TypeScript & Zero Any',
          category: 'Coding Standard',
          description: 'Explicitly type all props, state, API contracts, and domain models.',
          ruleStatement: 'Use of any is strictly disallowed; declare comprehensive domain interfaces.',
          strictness: 'Mandatory',
        },
        {
          id: `RULE-PERF-${Date.now().toString().slice(-3)}`,
          title: 'Component Memoization & Render Budget',
          category: 'Architecture',
          description: 'Wrap child cards in React.memo and handlers in useCallback/useMemo.',
          ruleStatement: 'High-frequency list items must be memoized to prevent render cascading.',
          strictness: 'Recommended',
        },
      ];
    } else if (presetName === 'modular') {
      presetRules = [
        {
          id: `RULE-MOD-${Date.now().toString().slice(-3)}`,
          title: 'Decoupled Plug-and-Play Modules',
          category: 'Architecture',
          description: 'Subcomponents must be isolated, single-responsibility, and reusable.',
          ruleStatement: 'Never place more than one primary domain responsibility in a single file.',
          strictness: 'Mandatory',
        },
      ];
    }

    setCurrentConst((prev) => {
      const updated = {
        ...prev,
        rules: [...prev.rules, ...presetRules],
        lastUpdated: new Date().toISOString(),
      };
      setHasUnsaved(true);
      return updated;
    });
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={ShieldCheck}
        iconColor="text-emerald-400"
        title="Project Constitution & Governance (constitution.md)"
        subtitle="Non-negotiable architectural constraints, coding standards, and security compliance rules."
        badgeLabel="Rule Governance"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        hasUnsaved={hasUnsaved}
        onSave={handleSave}
        viewToggle={
          <ViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
            options={VIEW_OPTIONS}
          />
        }
      />

      {/* Visual Policies View */}
      {activeView === 'visual' && (
        <div className="space-y-6">
          <ConstitutionPresets onApplyPreset={handleApplyPreset} />

          {/* Active Rules List */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Active Constitution Rules ({currentConst.rules.length})</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Audited automatically against all AI prompts and code generation.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentConst.rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onRemove={handleRemoveRule}
                />
              ))}
            </div>

            <AddRuleForm onAddRule={handleAddRule} />
          </div>
        </div>
      )}

      {/* TanStack Matrix View */}
      {activeView === 'tanstack' && (
        <ConstitutionTanStackMatrix
          rules={currentConst.rules}
          onRemoveRule={handleRemoveRule}
        />
      )}

      {/* Markdown Source View */}
      {activeView === 'markdown' && (
        <MarkdownSourceView
          value={currentConst.markdown}
          onChange={(val) => handleUpdateField('markdown', val)}
          fileName="constitution.md"
          title="Raw constitution.md Document Output"
          subtitle="Policy specification for spec-kit CLI audit"
        />
      )}
    </div>
  );
};
