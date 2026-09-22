import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { SpecKitProject, UserStory } from '../../types/speckit';
import { ImportNotice } from './ImportNotice';
import { FeatureExtractionPackage, importApi } from '../../lib/api/imports';
import { createProjectFromFeatureExtraction } from '../../lib/importProjectFactory';
import { LocalAgentId, LocalAgentStatus, localAgentLabels, recommendedLocalAgent } from '../../lib/agentAvailability';
import { configuredConnectorClient, ConnectorJob } from '../../lib/connector';
import { getStudioSettings } from '../../lib/studioSettings';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { parseSpecKitArtifact } from '../../lib/specArtifactParser';
import { FeatureImportSource, FeatureSourceInput } from './FeatureSourceInput';
import { GenerationPathSelector } from './GenerationPathSelector';
import { EngineWorkPacketPanel } from './EngineWorkPacketPanel';
import { FeatureExtractionPreview, FeaturePreviewTab } from './FeatureExtractionPreview';
import { Modal } from '../common/Modal';

interface FeatureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (project: SpecKitProject) => void;
  activeProject?: SpecKitProject | null;
  onMergeIntoActiveProject?: (importedStories: UserStory[], importedData: any) => void;
  onOpenWorkspace?: () => void;
}

function readLocalAgentStatus(): { scanned: boolean; agents: LocalAgentStatus[] } {
  if (typeof window === 'undefined') return { scanned: false, agents: [] };
  const stored = window.localStorage.getItem('speckit_local_agents');
  if (!stored) return { scanned: false, agents: [] };
  try {
    const value = JSON.parse(stored);
    if (!Array.isArray(value)) return { scanned: false, agents: [] };
    return {
      scanned: true,
      agents: value.filter((item): item is LocalAgentStatus =>
        item && typeof item.id === 'string' && item.id in localAgentLabels && typeof item.label === 'string' && typeof item.installed === 'boolean',
      ),
    };
  } catch {
    return { scanned: false, agents: [] };
  }
}

export const FeatureImportModal: React.FC<FeatureImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  activeProject,
  onMergeIntoActiveProject,
  onOpenWorkspace,
}) => {
  const [importTab, setImportTab] = useState<FeatureImportSource>('text');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureContent, setFeatureContent] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<FeatureExtractionPackage | null>(null);
  const [previewTab, setPreviewTab] = useState<FeaturePreviewTab>('stories');
  const [fileError, setFileError] = useState<string | null>(null);
  const [agentScan, setAgentScan] = useState(() => readLocalAgentStatus());
  const [generationPath, setGenerationPath] = useState<'engine' | 'gemini'>(() => recommendedLocalAgent(agentScan.agents, getStudioSettings().preferredAgent) ? 'engine' : 'gemini');
  const [engineAgent, setEngineAgent] = useState<'claude' | 'codex' | 'copilot'>('claude');
  const [enginePrompt, setEnginePrompt] = useState('');
  const [connectorToken, setConnectorToken] = useState(() => getConnectorSessionToken());
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [isRunningAgent, setIsRunningAgent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const latest = readLocalAgentStatus();
    setAgentScan(latest);
    if (!latest.scanned) return;
    const recommended = recommendedLocalAgent(latest.agents, getStudioSettings().preferredAgent);
    setGenerationPath(recommended ? 'engine' : 'gemini');
    if (recommended) setEngineAgent(recommended.id);
  }, [isOpen]);


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

    if (!textToSend.trim()) {
      setFileError('Add a feature description before extracting user stories.');
      return;
    }

    setFileError(null);
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
      setFileError(err instanceof Error
        ? `Couldn’t generate the Spec-Kit package: ${err.message}`
        : 'Couldn’t generate the Spec-Kit package. Check the local server connection and try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePrepareEngine = async (contentToPrepare?: string, titleToPrepare?: string) => {
    const content = contentToPrepare || featureContent;
    const title = titleToPrepare || featureTitle || 'New feature';
    if (!content.trim()) { setFileError('Add a feature description before preparing the Engine work packet.'); return; }
    if (!agentScan.scanned) { setGenerationPath('gemini'); setFileError('Studio switched to Gemini so you can continue now. Scan the connected workspace later to enable a detected local coding agent.'); return; }
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!selectedAgent?.installed) { setGenerationPath('gemini'); setFileError('That coding agent is not available to the local connector. Gemini is selected so you can continue now, or scan again after installing an agent.'); return; }
    const agentName = localAgentLabels[engineAgent];
    const prompt = `Use Spec-Kit Engine with ${agentName} for Feature Journey stage 2 only: describe the feature. Do not implement application code.\n\nRead the existing repository, .specify instructions, and coding standards first. Run the integration-appropriate Spec-Kit “specify” workflow to create or update only the feature-scoped specification. Focus on user-facing behavior, success measures, and compatibility boundaries that must not break. Do not invoke planning, tasks, analysis, or implementation. Stop after the specification and requirements-quality findings are ready; summarize repository evidence, assumptions, and questions that need human review.\n\nFeature title: ${title}\n\nFeature input:\n${content}`;
    setEnginePrompt(prompt);
    try { await navigator.clipboard.writeText(prompt); } catch { /* The visible work packet remains available for manual copy. */ }
    setFileError(null);
  };

  const handlePrimaryAction = () => generationPath === 'engine' ? handlePrepareEngine() : handleExtractFeature();

  const runEngineInStudio = async () => {
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) { setFileError('Connect and scan a repository in Connected Workspace before running an agent from Studio.'); return; }
    if (!enginePrompt) { setFileError('Prepare the Engine work packet first.'); return; }
    if (!window.confirm(`Run ${localAgentLabels[engineAgent]} in ${repositoryPath}? It may create or update only feature-scoped Spec-Kit artifacts. Studio will show its output here.`)) return;
    setFileError(null); setIsRunningAgent(true);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      let job = await client.startSpecKitAgent(repositoryPath, engineAgent, enginePrompt, activeProject);
      setAgentJob(job);
      while (job.status === 'running') {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        job = await client.getJob(job.id);
        setAgentJob(job);
      }
      if (!job.ok) throw new Error(agentFailureGuidance(engineAgent, job.output));
    } catch (error) {
      setFileError(error instanceof Error ? `Studio could not run the local agent: ${error.message}` : 'Studio could not run the local agent.');
    } finally { setIsRunningAgent(false); }
  };

  const handleCreateNewProject = () => {
    if (!extractedResult) return;
    onImportComplete(createProjectFromFeatureExtraction(extractedResult, featureTitle));
    onClose();
  };

  const handleMergeToActive = () => {
    if (!extractedResult || !activeProject || !onMergeIntoActiveProject) return;
    onMergeIntoActiveProject(extractedResult.userStories || [], { ...extractedResult, source: importTab });
    onClose();
  };

  const loadEngineStories = async () => {
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) { setFileError('Connect and scan the repository before loading its generated Spec-Kit file.'); return; }
    try {
      setFileError(null);
      const { artifacts } = await configuredConnectorClient(connectorToken).readSpecKitArtifacts(repositoryPath);
      if (!artifacts.length) throw new Error('No feature spec was found yet. Confirm the agent completed the “specify” step, then try again.');
      const artifact = artifacts[0];
      const parsed = parseSpecKitArtifact(artifact.content);
      if (!parsed.userStories?.length) throw new Error(`Studio found ${artifact.path}, but could not identify user stories in it.`);
      setFeatureTitle(parsed.title || featureTitle);
      setExtractedResult(parsed);
      setPreviewTab('stories');
    } catch (error) {
      setFileError(error instanceof Error ? `Couldn’t load the generated stories: ${error.message}` : 'Couldn’t load the generated stories.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Import feature and generate Spec-Kit" className="items-center justify-center overflow-y-auto p-3 sm:p-4 md:p-6">
      <div className="my-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
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
          <ImportNotice message={fileError} />
          {!extractedResult && (
            <GenerationPathSelector
              scan={agentScan}
              path={generationPath}
              selectedAgent={engineAgent}
              onPathChange={setGenerationPath}
              onAgentChange={setEngineAgent}
            />
          )}
          {!extractedResult && activeProject?.importedRepo?.repoUrl && !enginePrompt && (
            <section className="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold text-zinc-100">Already ran a local agent?</p><p className="mt-0.5 text-[11px] text-zinc-400">Load the newest official <code>specs/.../spec.md</code> into Studio for review. Nothing is written to your repository.</p></div>
              <button type="button" onClick={loadEngineStories} className="shrink-0 rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10">Load generated stories</button>
            </section>
          )}
          {enginePrompt && !extractedResult && (
            <EngineWorkPacketPanel
              prompt={enginePrompt}
              agentLabel={localAgentLabels[engineAgent]}
              connectorToken={connectorToken}
              repositoryConnected={Boolean(activeProject?.importedRepo?.repoUrl)}
              isRunning={isRunningAgent}
              job={agentJob}
              onCopy={() => navigator.clipboard.writeText(enginePrompt)}
              onTokenChange={(token) => { setConnectorToken(token); setConnectorSessionToken(token); }}
              onRun={runEngineInStudio}
              onOpenWorkspace={onOpenWorkspace}
              onReviewStories={loadEngineStories}
            />
          )}
          {agentJob && !extractedResult && <AgentJobStatus job={agentJob} preparingLabel={`Running ${localAgentLabels[engineAgent]} for this feature…`} />}

          {/* Step 1: Input source. Business logic stays in this modal; this component is view-only. */}
          {!extractedResult && (
            <FeatureSourceInput
              source={importTab}
              title={featureTitle}
              content={featureContent}
              githubUrl={githubUrl}
              isProcessing={isExtracting}
              actionLabel={generationPath === 'engine' ? 'Prepare Spec-Kit Engine Work Packet' : 'Extract User Stories & Generate Spec-Kit'}
              onSourceChange={setImportTab}
              onTitleChange={setFeatureTitle}
              onContentChange={setFeatureContent}
              onGithubUrlChange={(url) => {
                setGithubUrl(url);
                setFeatureContent(`Feature from GitHub Issue: ${url}`);
              }}
              onFileSelect={handleFileUpload}
              onClearFile={() => setFeatureContent('')}
              onPrimaryAction={handlePrimaryAction}
              onPresetSelect={(content, title) => {
                setFeatureTitle(title);
                setFeatureContent(content);
                if (generationPath === 'engine') handlePrepareEngine(content, title);
                else handleExtractFeature(content, title);
              }}
            />
          )}

          {/* Step 2: review extracted artifacts before choosing their destination. */}
          {extractedResult && (
            <FeatureExtractionPreview
              result={extractedResult}
              activeProjectName={activeProject?.name}
              canMerge={Boolean(activeProject && onMergeIntoActiveProject)}
              tab={previewTab}
              onTabChange={setPreviewTab}
              onReExtract={() => setExtractedResult(null)}
              onCreateProject={handleCreateNewProject}
              onMerge={handleMergeToActive}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
