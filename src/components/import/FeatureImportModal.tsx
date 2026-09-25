import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { DeliveryScope, FeatureImportSource as DeliveryImportSource, FunctionalRequirement, SpecKitProject, UserStory } from '../../types/speckit';
import { ImportNotice } from './ImportNotice';
import { FeatureExtractionPackage, importApi } from '../../lib/api/imports';
import { createProjectFromFeatureExtraction } from '../../lib/importProjectFactory';
import { LocalAgentId, localAgentLabel, recommendedLocalAgent } from '../../lib/agentAvailability';
import { configuredConnectorClient, ConnectorJob } from '../../lib/connector';
import { getStudioSettings } from '../../lib/studioSettings';
import { readRuntimeAgentScan, saveRuntimeAgentScan } from '../../lib/runtimeAgents';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { parseSpecKitArtifact } from '../../lib/specArtifactParser';
import { FeatureImportSource, FeatureSourceInput } from './FeatureSourceInput';
import { GenerationPathSelector } from './GenerationPathSelector';
import { EngineWorkPacketPanel } from './EngineWorkPacketPanel';
import { FeatureExtractionPreview, FeaturePreviewTab } from './FeatureExtractionPreview';
import { Modal } from '../common/Modal';
import { featureImportDestination } from '../../lib/featureImportRouting';
import { DeliveryScopeSelector } from './DeliveryScopeSelector';
import { StoryIntakePanel } from './StoryIntakePanel';
import { SPECKIT_RELEASE_TAG } from '../../lib/specKitCompliance';

interface FeatureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (project: SpecKitProject) => void;
  activeProject?: SpecKitProject | null;
  onMergeIntoActiveProject?: (importedStories: UserStory[], importedData: any) => boolean;
  initialScope?: DeliveryScope;
  initialStoryId?: string;
  onStartStoryDelivery?: (story: UserStory, requirements: FunctionalRequirement[], source: DeliveryImportSource, parentFeatureId?: string) => boolean;
  onOpenWorkspace?: () => void;
}

export const FeatureImportModal: React.FC<FeatureImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  activeProject,
  onMergeIntoActiveProject,
  initialScope = 'feature',
  initialStoryId,
  onStartStoryDelivery,
  onOpenWorkspace,
}) => {
  const [deliveryScope, setDeliveryScope] = useState<DeliveryScope>(initialScope);
  const [importTab, setImportTab] = useState<FeatureImportSource>('text');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureContent, setFeatureContent] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<FeatureExtractionPackage | null>(null);
  const [previewTab, setPreviewTab] = useState<FeaturePreviewTab>('stories');
  const [fileError, setFileError] = useState<string | null>(null);
  const [agentScan, setAgentScan] = useState(() => readRuntimeAgentScan());
  const [generationPath, setGenerationPath] = useState<'engine' | 'gemini'>('engine');
  const [engineAgent, setEngineAgent] = useState<LocalAgentId>('');
  const [enginePrompt, setEnginePrompt] = useState('');
  const [connectorToken, setConnectorToken] = useState(() => getConnectorSessionToken());
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [savedFeatureTitle, setSavedFeatureTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDeliveryScope(initialScope);
    const latest = readRuntimeAgentScan();
    setAgentScan(latest);
    const recommended = recommendedLocalAgent(latest.agents, getStudioSettings().preferredAgent);
    setGenerationPath('engine');
    if (recommended) setEngineAgent(recommended.id);
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) return;
    let cancelled = false;
    configuredConnectorClient(connectorToken).scan(repositoryPath).then((report) => {
      if (cancelled) return;
      const refreshed = { scanned: true, agents: report.agents };
      saveRuntimeAgentScan(refreshed.agents);
      setAgentScan(refreshed);
      const detected = recommendedLocalAgent(refreshed.agents, getStudioSettings().preferredAgent);
      setGenerationPath('engine');
      if (detected) setEngineAgent(detected.id);
    }).catch(() => {
      // Keep the last known scan visible. Connection guidance remains available
      // in Connected Workspace when a pairing token is required.
    });
    return () => { cancelled = true; };
  }, [isOpen, initialScope, activeProject?.importedRepo?.repoUrl, connectorToken]);


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
    if (!agentScan.scanned) { setFileError('Scan the connected workspace to enable a local agent. Gemini remains an optional manual choice.'); return; }
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!selectedAgent?.installed) { setFileError('That local coding agent is not available. Install or sign in to it, then scan again. Gemini remains an optional manual choice.'); return; }
    const agentName = localAgentLabel(selectedAgent);
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
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!selectedAgent) { setFileError('Choose a detected local agent before running the work packet.'); return; }
    if (!window.confirm(`Run ${localAgentLabel(selectedAgent)} in ${repositoryPath}? It may create or update only feature-scoped Spec-Kit artifacts. Studio will show its output here.`)) return;
    setFileError(null); setIsRunningAgent(true);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      let job = await client.startSpecKitAgent(repositoryPath, engineAgent, enginePrompt, activeProject, undefined, 'workspace-write');
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
    // An intake opened from an active workspace always belongs there. This
    // fallback supports only standalone intake before a workspace exists.
    if (featureImportDestination(Boolean(activeProject), Boolean(activeProject && onMergeIntoActiveProject)) === 'active-workspace') {
      handleMergeToActive();
      return;
    }
    // New means a separate feature workspace, not a disconnected repository.
    // Preserve the read-only connection evidence from the workspace where the
    // user started the import so the new feature can continue at Stage 2.
    onImportComplete(createProjectFromFeatureExtraction(extractedResult, featureTitle, undefined, activeProject || undefined));
    onClose();
  };

  const handleMergeToActive = () => {
    if (!extractedResult || !activeProject || !onMergeIntoActiveProject) {
      setFileError('The active workspace is unavailable. Close this dialog, select the intended workspace, and try again.');
      return;
    }
    setFileError(null);
    setIsSavingFeature(true);
    try {
      const saved = onMergeIntoActiveProject(extractedResult.userStories || [], { ...extractedResult, source: importTab });
      if (!saved) {
        setFileError('Studio could not retain this feature in the current workspace. The dialog remains open; do not continue until this is resolved.');
        return;
      }
      setSavedFeatureTitle(extractedResult.title || featureTitle || 'Imported feature');
    } catch (error) {
      console.error('Failed to save imported feature:', error);
      setFileError(error instanceof Error ? `Studio could not retain this feature: ${error.message}` : 'Studio could not retain this feature in the current workspace.');
    } finally {
      setIsSavingFeature(false);
    }
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

  const deliveryWorkIsActive = isExtracting || isRunningAgent || isSavingFeature || agentJob?.status === 'running';
  const requestClose = () => {
    if (deliveryWorkIsActive) {
      setFileError('Delivery work is still running. Keep this dialog open until the local agent or save operation finishes.');
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={requestClose} closeOnBackdrop={false} closeOnEscape={false} ariaLabel="Import feature and generate Spec-Kit" className="items-center justify-center overflow-y-auto p-3 sm:p-4 md:p-6">
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
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">Start delivery work</h2>
                <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Spec-Kit {SPECKIT_RELEASE_TAG} AI Extractor
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Start with a complete feature or one focused user story. Existing feature workflows remain unchanged.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={deliveryWorkIsActive}
            aria-label="Close delivery import"
            title={deliveryWorkIsActive ? 'Close is unavailable while delivery work is running' : 'Close'}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          <ImportNotice message={fileError} />
          {!extractedResult && <DeliveryScopeSelector value={deliveryScope} onChange={(scope) => { setDeliveryScope(scope); setFileError(null); }} />}
          {deliveryScope === 'user-story' && activeProject && !extractedResult && (
            <StoryIntakePanel
              project={activeProject}
              initialStoryId={initialStoryId}
              isSaving={isSavingFeature}
              onError={setFileError}
              onSubmit={(story, requirements, source, parentFeatureId) => {
                if (!onStartStoryDelivery) { setFileError('The active workspace cannot start a story journey. Close this dialog and try again.'); return; }
                setIsSavingFeature(true);
                try {
                  if (!onStartStoryDelivery(story, requirements, source, parentFeatureId)) { setFileError('Studio could not retain this story journey. Your workspace was not changed.'); return; }
                  onClose();
                } finally { setIsSavingFeature(false); }
              }}
            />
          )}
          {deliveryScope === 'feature' && !extractedResult && (
            <GenerationPathSelector
              scan={agentScan}
              path={generationPath}
              selectedAgent={engineAgent}
              onPathChange={setGenerationPath}
              onAgentChange={setEngineAgent}
            />
          )}
          {deliveryScope === 'feature' && !extractedResult && activeProject?.importedRepo?.repoUrl && !enginePrompt && (
            <section className="feature-import-recovery flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold text-zinc-100">Already ran a local agent?</p><p className="mt-0.5 text-[11px] text-zinc-400">Load the newest official <code>specs/.../spec.md</code> into Studio for review. Nothing is written to your repository.</p></div>
              <button type="button" onClick={loadEngineStories} className="shrink-0 rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10">Load generated stories</button>
            </section>
          )}
          {deliveryScope === 'feature' && enginePrompt && !extractedResult && (
            <EngineWorkPacketPanel
              prompt={enginePrompt}
              agentLabel={localAgentLabel(agentScan.agents.find((agent) => agent.id === engineAgent) || engineAgent)}
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
          {deliveryScope === 'feature' && agentJob && !extractedResult && <AgentJobStatus job={agentJob} preparingLabel={`Running ${localAgentLabel(agentScan.agents.find((agent) => agent.id === engineAgent) || engineAgent)} for this feature…`} />}

          {/* Step 1: Input source. Business logic stays in this modal; this component is view-only. */}
          {deliveryScope === 'feature' && !extractedResult && (
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
              onReExtract={() => { setExtractedResult(null); setSavedFeatureTitle(null); }}
              onCreateProject={handleCreateNewProject}
              onMerge={handleMergeToActive}
              onOpenSavedFeature={onClose}
              isSavingFeature={isSavingFeature}
              savedFeatureTitle={savedFeatureTitle}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
