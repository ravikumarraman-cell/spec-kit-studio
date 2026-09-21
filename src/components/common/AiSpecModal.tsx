import React, { useState } from 'react';
import { Sparkles, X, RefreshCw, CheckCircle2, Zap, Layers } from 'lucide-react';
import { SpecKitProject, FeatureSpec } from '../../types/speckit';
import { generationApi } from '../../lib/api/generation';
import { Modal } from './Modal';

interface AiSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SpecKitProject;
  onApplySpecData: (generatedSpec: FeatureSpec, generatedPlanData?: any, generatedTasksData?: any) => void;
}

export const AiSpecModal: React.FC<AiSpecModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplySpecData,
}) => {
  const [topic, setTopic] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([
    'Offline First & Local Storage',
    'Dark Mode & Mobile Responsiveness',
    'Requirement Traceability',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter((a) => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      // 1. Generate Spec
      const specData = await generationApi.generateSpec({ topic, existingSpec: project.spec.markdown, focusAreas });
      const generatedSpecPayload = specData.data;

      // 2. Generate Plan
      const planData = await generationApi.generatePlan({ specTitle: generatedSpecPayload.title || topic, specSummary: generatedSpecPayload.summary, requirements: generatedSpecPayload.functionalRequirements || [] });

      // 3. Generate Tasks
      const tasksData = await generationApi.generateTasks({ specTitle: generatedSpecPayload.title || topic, functionalRequirements: generatedSpecPayload.functionalRequirements || [], techStack: planData.data.techStack || [] });

      const newSpecObj: FeatureSpec = {
        id: project.spec.id,
        title: generatedSpecPayload.title || topic,
        summary: generatedSpecPayload.summary || 'AI-generated specification.',
        userStories: generatedSpecPayload.userStories || [],
        functionalRequirements: generatedSpecPayload.functionalRequirements || [],
        nonFunctionalRequirements: generatedSpecPayload.nonFunctionalRequirements || [],
        userFlows: generatedSpecPayload.userFlows || [],
        edgeCases: generatedSpecPayload.edgeCases || [],
        successMetrics: generatedSpecPayload.successMetrics || [],
        markdown: generatedSpecPayload.markdown || '# Generated Spec',
        lastUpdated: new Date().toISOString(),
      };

      onApplySpecData(newSpecObj, planData.data, tasksData.data);
      onClose();
    } catch (err: any) {
      console.error('AI Spec modal generation error:', err);
      setErrorMsg(err.message || 'An error occurred during Gemini AI spec generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const availableFocusAreas = [
    'Offline First & Local Storage',
    'Dark Mode & Mobile Responsiveness',
    'Requirement Traceability',
    'Security & API Key Protection',
    'High Performance & Fluid UI',
    'Real-time Multi-user Synchronization',
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="AI Spec Generator" className="items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">AI Spec Generator & Refiner</h3>
              <p className="text-[11px] text-zinc-400">Powered by Gemini 3.8 Flash Server Proxy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Describe Feature, Concept or Application Topic
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Real-Time Collaborative Spec Whiteboard with WebSockets, IndexedDB cache, and Cursor-style AI prompts..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-2">Select Primary Focus Areas</label>
            <div className="flex flex-wrap gap-1.5">
              {availableFocusAreas.map((area) => {
                const isSelected = focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40 font-semibold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? 'Generating Spec, Plan & Tasks...' : 'Generate Full Spec Package'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
