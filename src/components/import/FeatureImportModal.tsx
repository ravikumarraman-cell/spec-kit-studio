import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Upload,
  Github,
  Layers,
  Zap,
  Check,
  RefreshCw,
  PlusCircle,
  FileCode,
  ShieldCheck,
  Cpu,
  ArrowRight,
  CheckCircle2,
  ListTodo,
  Workflow,
  Plus
} from 'lucide-react';
import { SpecKitProject, UserStory } from '../../types/speckit';
import { ImportNotice } from './ImportNotice';
import { FeatureExtractionPackage, importApi } from '../../lib/api/imports';
import { createProjectFromFeatureExtraction } from '../../lib/importProjectFactory';
import { featurePresets } from './featurePresets';

interface FeatureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (project: SpecKitProject) => void;
  activeProject?: SpecKitProject | null;
  onMergeIntoActiveProject?: (importedStories: UserStory[], importedData: any) => void;
}

export const FeatureImportModal: React.FC<FeatureImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  activeProject,
  onMergeIntoActiveProject,
}) => {
  const [importTab, setImportTab] = useState<'text' | 'file' | 'github' | 'preset'>('text');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureContent, setFeatureContent] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<FeatureExtractionPackage | null>(null);
  const [previewTab, setPreviewTab] = useState<'stories' | 'requirements' | 'plan' | 'tasks' | 'constitution'>('stories');
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);


  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const text = await file.text();
      setFeatureTitle(file.name.replace(/\.[^/.]+$/, ''));
      setFeatureContent(text);
    } catch (err: any) {
      console.error('Failed to read feature file:', err);
      setFileError('Failed to read file contents. Please upload a valid text or markdown file.');
    }
  };

  const handleExtractFeature = async (contentToExtract?: string, titleToExtract?: string) => {
    const textToSend = contentToExtract || featureContent;
    const titleToSend = titleToExtract || featureTitle;

    if (!textToSend.trim()) return;

    setIsExtracting(true);
    setExtractedResult(null);

    try {
      const data = await importApi.extractFeature({
        featureContent: textToSend,
        featureTitle: titleToSend,
        sourceType: importTab,
      });
      if (data.data) {
        setExtractedResult(data.data);
      } else {
        throw new Error('The feature extractor returned no usable specification.');
      }
    } catch (err) {
      console.error('Error extracting feature:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateNewProject = () => {
    if (!extractedResult) return;
    onImportComplete(createProjectFromFeatureExtraction(extractedResult, featureTitle));
    onClose();
  };

  const handleMergeToActive = () => {
    if (!extractedResult || !activeProject || !onMergeIntoActiveProject) return;
    onMergeIntoActiveProject(extractedResult.userStories || [], extractedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  Import Feature & Auto-Generate Spec-Kit
                </h2>
                <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Spec-Kit v1.0.7 AI Extractor
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Import PRDs, Jira tickets, GitHub issues, or text to extract structured User Stories and complete 4-pillar Spec-Kit documents.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Input Source Selector Tabs */}
          {!extractedResult && (
            <div className="space-y-5">
              <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center text-xs">
                <button
                  onClick={() => setImportTab('text')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    importTab === 'text'
                      ? 'bg-zinc-800 text-cyan-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Paste Text / PRD</span>
                </button>
                <button
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    importTab === 'file'
                      ? 'bg-zinc-800 text-cyan-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Upload Document</span>
                </button>
                <button
                  onClick={() => setImportTab('github')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    importTab === 'github'
                      ? 'bg-zinc-800 text-cyan-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Issue / URL</span>
                </button>
                <button
                  onClick={() => setImportTab('preset')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    importTab === 'preset'
                      ? 'bg-zinc-800 text-amber-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Feature Presets</span>
                </button>
              </div>

              {/* Tab 1: Text / PRD */}
              {importTab === 'text' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-zinc-200">Feature Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Multi-Factor Authentication (MFA) & Passkeys"
                      value={featureTitle}
                      onChange={(e) => setFeatureTitle(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-zinc-200">Feature Description, PRD Text, or Requirements</label>
                    <textarea
                      rows={8}
                      placeholder="Paste your PRD text, Jira issue details, feature specifications, or user feedback here..."
                      value={featureContent}
                      onChange={(e) => setFeatureContent(e.target.value)}
                      className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-cyan-500/50 leading-relaxed"
                    />
                  </div>

                  {/* Extract Button */}
                  <button
                    onClick={() => handleExtractFeature()}
                    disabled={isExtracting || !featureContent.trim()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                        <span>AI Extracting User Stories & Spec-Kit...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract User Stories & Generate Spec-Kit</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: File Upload */}
              {importTab === 'file' && (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div className="space-y-1 max-w-md">
                    <h3 className="text-sm font-bold text-zinc-100">Upload Feature Document (.md, .txt, .json)</h3>
                    <p className="text-zinc-400">
                      Upload your feature spec, PRD document, or requirements file. Spec-Kit Studio will parse it and generate full user stories!
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".md,.txt,.json,.doc,.docx"
                    className="hidden"
                  />

                  <ImportNotice message={fileError} />

                  {featureContent ? (
                    <div className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>File Loaded: {featureTitle}</span>
                        </span>
                        <button onClick={() => setFeatureContent('')} className="text-zinc-500 hover:text-zinc-300">
                          Clear
                        </button>
                      </div>
                      <p className="text-zinc-400 font-mono text-[11px] line-clamp-3">{featureContent}</p>
                      <button
                        onClick={() => handleExtractFeature()}
                        disabled={isExtracting}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2"
                      >
                        {isExtracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Extract Stories & Spec-Kit from File</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Select Feature Document</span>
                    </button>
                  )}
                </div>
              )}

              {/* Tab 3: GitHub Issue URL */}
              {importTab === 'github' && (
                <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-zinc-100">GitHub Issue URL or Raw Issue Description</label>
                    <p className="text-zinc-400">
                      Import feature user stories directly from a GitHub issue or PR description.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="https://github.com/owner/repo/issues/42"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setFeatureContent(`Feature from GitHub Issue: ${e.target.value}`);
                    }}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none"
                  />

                  <div className="space-y-1">
                    <label className="block font-bold text-zinc-200">GitHub Issue Body / Acceptance Criteria</label>
                    <textarea
                      rows={5}
                      placeholder="Paste issue body text or user stories from GitHub..."
                      value={featureContent}
                      onChange={(e) => setFeatureContent(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleExtractFeature()}
                    disabled={isExtracting || !featureContent.trim()}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2"
                  >
                    {isExtracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Extract User Stories from GitHub Issue</span>
                  </button>
                </div>
              )}

              {/* Tab 4: Feature Presets */}
              {importTab === 'preset' && (
                <div className="space-y-3 text-xs">
                  <div className="font-semibold text-zinc-400 uppercase tracking-wider">
                    Select a Production Feature Blueprint
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featurePresets.map((preset) => (
                      <div
                        key={preset.title}
                        className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/40 transition-all space-y-3 flex flex-col justify-between group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-zinc-100 group-hover:text-cyan-300 transition-colors">
                              {preset.title}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-zinc-400">{preset.summary}</p>
                        </div>

                        <button
                          onClick={() => {
                            setFeatureTitle(preset.title);
                            setFeatureContent(preset.content);
                            handleExtractFeature(preset.content, preset.title);
                          }}
                          disabled={isExtracting}
                          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Extract User Stories & Spec-Kit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Extracted User Stories & Spec-Kit Preview */}
          {extractedResult && (
            <div className="space-y-6">
              {/* Feature Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-zinc-900 to-cyan-950/80 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-zinc-100">{extractedResult.title}</h3>
                  </div>
                  <p className="text-zinc-300 max-w-2xl">{extractedResult.summary}</p>
                </div>

                <button
                  onClick={() => setExtractedResult(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium shrink-0 self-start sm:self-auto"
                >
                  Edit Input / Re-Extract
                </button>
              </div>

              {/* Preview Section Tabs */}
              <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center text-xs">
                <button
                  onClick={() => setPreviewTab('stories')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    previewTab === 'stories'
                      ? 'bg-zinc-800 text-indigo-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>User Stories ({extractedResult.userStories?.length || 0})</span>
                </button>

                <button
                  onClick={() => setPreviewTab('requirements')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    previewTab === 'requirements'
                      ? 'bg-zinc-800 text-cyan-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Requirements ({extractedResult.functionalRequirements?.length || 0})</span>
                </button>

                <button
                  onClick={() => setPreviewTab('plan')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    previewTab === 'plan'
                      ? 'bg-zinc-800 text-purple-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Workflow className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tech Stack & Plan</span>
                </button>

                <button
                  onClick={() => setPreviewTab('tasks')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    previewTab === 'tasks'
                      ? 'bg-zinc-800 text-emerald-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Task Breakdown ({extractedResult.tasks?.length || 0})</span>
                </button>
              </div>

              {/* Preview Content: User Stories */}
              {previewTab === 'stories' && (
                <div className="space-y-3 text-xs">
                  {extractedResult.userStories?.map((story: any, idx: number) => (
                    <div
                      key={story.id || idx}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{story.id}</span>
                          <span className="font-bold text-zinc-100">{story.title}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            story.priority === 'High'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {story.priority || 'High'}
                        </span>
                      </div>

                      <p className="text-zinc-300 leading-relaxed bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                        <span className="text-zinc-500">As a </span>
                        <strong className="text-cyan-300">{story.asA}</strong>
                        <span className="text-zinc-500">, I want to </span>
                        <strong className="text-zinc-100">{story.iWantTo}</strong>
                        <span className="text-zinc-500">, so that </span>
                        <strong className="text-zinc-300">{story.soThat}</strong>.
                      </p>

                      {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                        <div className="space-y-1 pl-1">
                          <div className="text-[11px] font-semibold text-zinc-400">Acceptance Criteria:</div>
                          <ul className="space-y-1">
                            {story.acceptanceCriteria.map((criterion: string, cIdx: number) => (
                              <li key={cIdx} className="flex items-start gap-2 text-[11px] text-zinc-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{criterion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Content: Requirements */}
              {previewTab === 'requirements' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {extractedResult.functionalRequirements?.map((fr: any) => (
                    <div key={fr.id} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-400">{fr.id}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {fr.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-100">{fr.title}</h4>
                      <p className="text-zinc-400">{fr.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Content: Plan */}
              {previewTab === 'plan' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                    <h4 className="font-bold text-zinc-200">Recommended Technology Stack</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {extractedResult.techStack?.map((st: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80">
                          <div className="font-bold text-cyan-300">{st.technology}</div>
                          <div className="text-[10px] text-zinc-400">{st.category} — {st.justification}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Content: Tasks */}
              {previewTab === 'tasks' && (
                <div className="space-y-2.5 text-xs">
                  {extractedResult.tasks?.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">{t.id}</span>
                          <span className="font-bold text-zinc-100">{t.title}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-900 text-zinc-400">{t.phase}</span>
                        </div>
                        <p className="text-zinc-400">{t.description}</p>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">{t.estimatedHours || 3}h</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Destination Actions */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 pt-4">
                <div className="text-xs font-bold text-zinc-300">Choose Spec-Kit Project Destination:</div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleCreateNewProject}
                    className="flex-1 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create New Spec-Kit Project ({extractedResult.title})</span>
                  </button>

                  {activeProject && onMergeIntoActiveProject && (
                    <button
                      onClick={handleMergeToActive}
                      className="flex-1 w-full py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Merge Feature into "{activeProject.name}"</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
