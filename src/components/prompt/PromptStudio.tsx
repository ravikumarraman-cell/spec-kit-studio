import React, { useState, useMemo, memo } from 'react';
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Send,
  Code,
  Zap,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { SpecKitProject } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { useClipboard } from '../../hooks/useClipboard';

interface PromptStudioProps {
  project: SpecKitProject;
  initialTaskId?: string;
}

const AGENT_FRAMEWORKS = [
  { name: 'Claude 3.7 Sonnet / Cursor', desc: 'Optimized for Cursor & Anthropic Sonnet' },
  { name: 'Gemini 3.1 Pro / Flash', desc: 'Optimized for Google AI Studio & Gemini CLI' },
  { name: 'GitHub Copilot Workspace', desc: 'Optimized for Copilot spec task execution' },
  { name: 'Windsurf Cascade', desc: 'Optimized for Codeium Windsurf flow' },
  { name: 'Aider / Terminal CLI', desc: 'Optimized for git-integrated command line agents' },
];

export const PromptStudio: React.FC<PromptStudioProps> = memo(({
  project,
  initialTaskId,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('Claude 3.7 Sonnet / Cursor');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTaskId || project.tasks.tasks[0]?.id || 'TASK-101'
  );
  const [customNotes, setCustomNotes] = useState('');
  const { copied, copy } = useClipboard();

  // AI Simulation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSimulationOutput, setAiSimulationOutput] = useState<string | null>(null);

  const selectedTask = useMemo(() => {
    return project.tasks.tasks.find((t) => t.id === selectedTaskId) || project.tasks.tasks[0];
  }, [project.tasks.tasks, selectedTaskId]);

  // Generated Master Prompt String
  const masterPrompt = useMemo(() => {
    return `You are a Senior Principal AI Software Engineer assigned to implement task ${selectedTask?.id || 'TASK'} for project "${project.name}".

=== 1. GOVERNING CONSTITUTION & RULES ===
${project.constitution.rules.map((r) => `- [${r.strictness}] ${r.title}: ${r.ruleStatement}`).join('\n')}

=== 2. FEATURE SPECIFICATION CONTEXT ===
Project Summary: ${project.spec.summary}
Functional Requirements:
${project.spec.functionalRequirements.map((f) => `- ${f.id} (${f.category}): ${f.title} - ${f.description}`).join('\n')}

=== 3. ARCHITECTURE & TECH STACK ===
${project.plan.techStack.map((t) => `- ${t.category}: ${t.technology} (${t.justification})`).join('\n')}

=== 4. ACTIVE TARGET TASK TO IMPLEMENT ===
Task ID: ${selectedTask?.id || 'TASK-101'}
Task Title: ${selectedTask?.title || 'Implementation'}
Phase: ${selectedTask?.phase || 'Phase 1'}
Task Description: ${selectedTask?.description || 'Build task according to spec.'}
Mapped Spec Requirement: ${selectedTask?.mappedRequirementId || 'FR-101'}
${customNotes ? `\n=== ADDITIONAL INSTRUCTIONS ===\n${customNotes}\n` : ''}
=== EXECUTION DIRECTIVES ===
1. Write clean, modular, highly maintainable TypeScript code.
2. Adhere strictly to the project constitution rules.
3. Ensure zero hallucinated APIs and complete error handling.
4. Verify task completion against acceptance criteria before ending your session.`;
  }, [project, selectedTask, customNotes]);

  const handleRunAiSimulation = async () => {
    setIsGenerating(true);
    setAiSimulationOutput(null);

    try {
      const res = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgent: selectedAgent,
          taskId: selectedTask?.id,
          taskTitle: selectedTask?.title,
          specSummary: project.spec.summary,
          constitution: project.constitution.rules.map((r) => r.ruleStatement).join('; '),
          techStack: project.plan.techStack.map((t) => t.technology),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiSimulationOutput(data.promptText || 'AI Agent prompt simulated successfully.');
      } else {
        setAiSimulationOutput('Error: ' + (data.error || 'Failed to simulate AI prompt.'));
      }
    } catch (err: any) {
      setAiSimulationOutput('Failed to connect to AI server route: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={Bot}
        iconColor="text-purple-400"
        title="AI Agent Prompt Studio"
        subtitle="Compile mathematically grounded, multi-file context prompts tailored to Claude, Gemini, Copilot, and Cursor."
        badgeLabel="Context Grounding"
        badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
      />

      {/* Target Task and Agent Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Task Selection */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="font-bold text-zinc-200 block">Select Target Task to Implement</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-purple-500/50"
          >
            {project.tasks.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.id} [{task.phase}]: {task.title}
              </option>
            ))}
          </select>

          {selectedTask && (
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="text-zinc-400">
                Phase: <strong className="text-zinc-200">{selectedTask.phase}</strong>
              </div>
              <div className="text-zinc-400">
                Mapped Requirement:{' '}
                <strong className="text-cyan-400 font-mono">
                  {selectedTask.mappedRequirementId || 'None'}
                </strong>
              </div>
              <p className="text-zinc-300 leading-snug">{selectedTask.description}</p>
            </div>
          )}
        </div>

        {/* Agent Profile Selector */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="font-bold text-zinc-200 block">Target Agent Architecture</label>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {AGENT_FRAMEWORKS.map((agent) => (
              <div
                key={agent.name}
                onClick={() => setSelectedAgent(agent.name)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedAgent === agent.name
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-zinc-200">{agent.name}</div>
                  <div className="text-[10px] text-zinc-500">{agent.desc}</div>
                </div>
                {selectedAgent === agent.name && (
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Instructions */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
        <label className="font-bold text-zinc-300 block">
          Custom Directives & Extra Task Instructions (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Ensure strict type narrowing and provide Jest unit tests."
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {/* Compiled Master Prompt Output */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-zinc-200">
              Compiled Task Prompt ({selectedAgent})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copy(masterPrompt)}
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Full Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiSimulation}
              disabled={isGenerating}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isGenerating ? 'Simulating...' : 'Simulate with Gemini'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={14}
          readOnly
          value={masterPrompt}
          className="w-full p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none leading-relaxed resize-y cursor-text"
          spellCheck={false}
        />
      </div>

      {/* Simulated AI Output Panel */}
      {aiSimulationOutput && (
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-purple-500/40 space-y-3 text-xs">
          <div className="flex items-center justify-between font-bold text-purple-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Simulated AI Response Output (Server-side Gemini Pro)</span>
            </div>
            <button
              type="button"
              onClick={() => copy(aiSimulationOutput)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 flex items-center gap-1 text-[11px] font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy Response</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {aiSimulationOutput}
          </div>
        </div>
      )}
    </div>
  );
});

PromptStudio.displayName = 'PromptStudio';
