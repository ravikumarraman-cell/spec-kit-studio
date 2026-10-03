import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { DeliveryScope, FeatureImportSource as DeliveryImportSource, FunctionalRequirement, PersonaId, SpecKitProject, UserStory } from '../../types/speckit';
import { ImportNotice } from './ImportNotice';
import { FeatureExtractionPackage, importApi } from '../../lib/api/imports';
import { createProjectFromFeatureExtraction } from '../../lib/importProjectFactory';
import { agentSupports, LocalAgentId, localAgentLabel, recommendedLocalAgent } from '../../lib/agentAvailability';
import { configuredConnectorClient, ConnectorJob, GitHubMilestoneImport } from '../../lib/connector';
import { getStudioSettings } from '../../lib/studioSettings';
import { readRuntimeAgentScan, refreshRuntimeAgentAvailability, refreshRuntimeAgentScan } from '../../lib/runtimeAgents';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { parseSpecKitArtifact } from '../../lib/specArtifactParser';
import { FeatureImportSource, FeatureSourceInput } from './FeatureSourceInput';
import type { GitHubMilestoneAccessMode } from './FeatureSourceInput';
import { GenerationPathSelector } from './GenerationPathSelector';
import { EngineWorkPacketPanel } from './EngineWorkPacketPanel';
import { FeatureExtractionPreview, FeaturePreviewTab } from './FeatureExtractionPreview';
import { Modal } from '../common/Modal';
import { featureImportDestination } from '../../lib/featureImportRouting';
import { DeliveryScopeSelector } from './DeliveryScopeSelector';
import { StoryIntakePanel } from './StoryIntakePanel';
import { DeliveryIntakeProgress } from './DeliveryIntakeProgress';
import { DeliveryIntakeAction } from './DeliveryIntakeAction';
import { SPECKIT_RELEASE_TAG } from '../../lib/specKitCompliance';
import { referenceImagesFromMarkdown } from '../../lib/referenceImages';
import { compactAgentPacket } from '../../lib/agentPromptBudget';
import { isConnectorJobPollingAborted, waitForConnectorJob } from '../../lib/connectorJobPolling';
import { useConnectorPollingAbort } from '../../hooks/useConnectorPollingAbort';
import { readAuthSession } from '../../lib/api/auth';
import { integrationsApi } from '../../lib/api/integrations';
import { StudioApiError } from '../../lib/api/errors';
import { startRepositoryExecution } from '../../lib/repositoryExecution';
import { localProductSpecDraft } from '../../lib/personas/localProductSpecDraft';
import { parseProductDiscoveryFeatureDraft, productDiscoveryFeaturePrompt } from '../../lib/personas/productDiscoveryFeatureDraft';
import { confirmStudioAction } from '../../lib/confirmation';

interface FeatureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (project: SpecKitProject) => void;
  activeProject?: SpecKitProject | null;
  onMergeIntoActiveProject?: (importedStories: UserStory[], importedData: any, personaRoute?: PersonaId) => boolean;
  initialScope?: DeliveryScope;
  initialStoryId?: string;
  personaRoute?: PersonaId;
  onStartStoryDelivery?: (story: UserStory, requirements: FunctionalRequirement[], source: DeliveryImportSource, parentFeatureId?: string, referenceImages?: import('../../types/speckit').ReferenceImage[]) => boolean;
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
  personaRoute,
  onStartStoryDelivery,
  onOpenWorkspace,
}) => {
  const { beginPolling, abortAll } = useConnectorPollingAbort();
  const [deliveryScope, setDeliveryScope] = useState<DeliveryScope>(initialScope);
  // Most deliveries start from an existing GitHub issue or milestone. Keep it
  // first and selected initially; the other source methods remain one click
  // away for discovery work that has not reached GitHub yet.
  const [importTab, setImportTab] = useState<FeatureImportSource>('github');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureContent, setFeatureContent] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<FeatureExtractionPackage | null>(null);
  const [previewTab, setPreviewTab] = useState<FeaturePreviewTab>('stories');
  const [fileError, setFileError] = useState<string | null>(null);
  const [githubAuthorizationAction, setGithubAuthorizationAction] = useState<{ label: string; href?: string; onClick?: () => void } | null>(null);
  const [agentScan, setAgentScan] = useState(() => readRuntimeAgentScan());
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [isResolvingPersonaAgent, setIsResolvingPersonaAgent] = useState(false);
  const [generationPath, setGenerationPath] = useState<'engine' | 'gemini'>('engine');
  const [engineAgent, setEngineAgent] = useState<LocalAgentId>('');
  const agentChoiceIsExplicit = useRef(false);
  const [enginePrompt, setEnginePrompt] = useState('');
  const enginePacketRef = useRef<HTMLDivElement>(null);
  const deliveryActionRef = useRef<HTMLDivElement>(null);
  const [focusNextDeliveryAction, setFocusNextDeliveryAction] = useState(false);
  const [connectorToken, setConnectorToken] = useState(() => getConnectorSessionToken());
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [milestoneImages, setMilestoneImages] = useState<GitHubMilestoneImport['images']>([]);
  const [isLoadingEngineStories, setIsLoadingEngineStories] = useState(false);
  const [engineStoryReviewError, setEngineStoryReviewError] = useState<string | null>(null);
  const [milestoneAccessMode, setMilestoneAccessMode] = useState<GitHubMilestoneAccessMode>('local-cli');
  const [enterpriseMilestoneAvailable, setEnterpriseMilestoneAvailable] = useState(false);
  const [githubOAuthConfigured, setGithubOAuthConfigured] = useState(false);
  const isProductManagerIntake = personaRoute === 'product-manager';
  const featureReferenceImages = useMemo(() => {
    const seen = new Set<string>();
    return [...milestoneImages, ...referenceImagesFromMarkdown(featureContent)].filter((image) => !seen.has(image.url) && Boolean(seen.add(image.url)));
  }, [featureContent, milestoneImages]);

  useEffect(() => {
    if (!isOpen) abortAll();
  }, [abortAll, isOpen]);

  // A workspace-level refresh may complete while this modal is open. Adopt it
  // immediately so the chooser never presents a stale "not detected" state.
  useEffect(() => {
    const syncAgentScan = () => {
      const latest = readRuntimeAgentScan();
      setAgentScan(latest);
      const recommended = recommendedLocalAgent(latest.agents, getStudioSettings().preferredAgent);
      if (recommended && !agentChoiceIsExplicit.current) {
        setEngineAgent(recommended.id);
        setGenerationPath('engine');
      }
    };
    window.addEventListener('speckit-agents-change', syncAgentScan);
    return () => window.removeEventListener('speckit-agents-change', syncAgentScan);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setDeliveryScope(initialScope);
    agentChoiceIsExplicit.current = false;
    const latest = readRuntimeAgentScan();
    setAgentScan(latest);
    const recommended = recommendedLocalAgent(latest.agents, getStudioSettings().preferredAgent);
    // Product Manager can work without a repository, but when the connector
    // has already found a planning agent, make that local path the default.
    // The Studio-draft fallback remains the default only when no agent is
    // available, and an explicit user choice is never overwritten later.
    setGenerationPath(recommended ? 'engine' : isProductManagerIntake ? 'gemini' : 'engine');
    if (recommended && !agentChoiceIsExplicit.current) setEngineAgent(recommended.id);
    if (isProductManagerIntake) {
      let cancelled = false;
      setIsResolvingPersonaAgent(true);
      refreshRuntimeAgentAvailability(connectorToken).then((available) => {
        if (cancelled) return;
        setAgentScan(available);
        const detected = recommendedLocalAgent(available.agents, getStudioSettings().preferredAgent, 'planning');
        if (detected && !agentChoiceIsExplicit.current) {
          setEngineAgent(detected.id);
          setGenerationPath('engine');
        }
      }).catch(() => { /* A PM can still use the local draft without a connector. */ })
        .finally(() => { if (!cancelled) setIsResolvingPersonaAgent(false); });
      return () => { cancelled = true; };
    }
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) return;
    let cancelled = false;
    refreshRuntimeAgentScan(repositoryPath, connectorToken).then((refreshed) => {
      if (cancelled) return;
      setAgentScan(refreshed);
      const detected = recommendedLocalAgent(refreshed.agents, getStudioSettings().preferredAgent);
      if (detected && !agentChoiceIsExplicit.current) {
        setEngineAgent(detected.id);
        setGenerationPath('engine');
      }
    }).catch(() => {
      // Keep the last known scan visible. Connection guidance remains available
      // in Connected Workspace when a pairing token is required.
    });
    return () => { cancelled = true; };
  }, [isOpen, initialScope, activeProject?.importedRepo?.repoUrl, connectorToken, isProductManagerIntake]);

  useEffect(() => {
    if (!isOpen) return;
    void readAuthSession().then(async () => {
      // readAuthSession stores the session-bound CSRF proof before the
      // capability call, which enterprise mutation protection requires.
      return integrationsApi.githubAppStatus();
    }).then((status) => {
      const enabled = typeof status === 'object' && status?.available === true;
      setEnterpriseMilestoneAvailable(enabled);
      setGithubOAuthConfigured(typeof status === 'object' && status?.oauthConfigured === true);
      setMilestoneAccessMode(enabled ? 'enterprise-app' : 'local-cli');
    }).catch(() => { setEnterpriseMilestoneAvailable(false); setGithubOAuthConfigured(false); setMilestoneAccessMode('local-cli'); });
  }, [isOpen]);

  useEffect(() => {
    if (!enginePrompt) return;
    const focusPacket = window.setTimeout(() => {
      enginePacketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      enginePacketRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusPacket);
  }, [enginePrompt]);

  // Loading a remote source changes the available next step below the source
  // panel. Bring that action into view only for this explicit load flow; text
  // typed manually must never unexpectedly move the viewport.
  useEffect(() => {
    if (!focusNextDeliveryAction || !featureContent.trim()) return;
    const focusAction = window.setTimeout(() => {
      const container = deliveryActionRef.current;
      container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (container?.querySelector('button:not(:disabled)') as HTMLButtonElement | null)?.focus({ preventScroll: true });
      setFocusNextDeliveryAction(false);
    }, 0);
    return () => window.clearTimeout(focusAction);
  }, [featureContent, focusNextDeliveryAction]);



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
      if (isProductManagerIntake) {
        setExtractedResult(localProductSpecDraft(titleToSend, textToSend));
        setFileError('Cloud AI is unavailable, so Studio prepared a local reviewable Product Manager Spec-Kit draft. Review it before saving.');
        return;
      }
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
    if (isProductManagerIntake) {
      const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
      if (!selectedAgent || !agentSupports(selectedAgent, 'planning')) { setFileError('Choose a detected planning agent, or select the local Studio draft. No repository setup is required.'); return; }
      setFileError(null); setIsExtracting(true); setExtractedResult(null);
      try {
        const response = await configuredConnectorClient(connectorToken).preparePersonaDraft(selectedAgent.id, 'product-manager', productDiscoveryFeaturePrompt(title, content));
        const draft = parseProductDiscoveryFeatureDraft(response.output, content);
        if (!draft) throw new Error('The agent response did not contain the required user stories and functional requirements.');
        setExtractedResult(draft);
      } catch (error) {
        setFileError(error instanceof Error ? `Studio could not prepare the Product Manager draft: ${error.message}` : 'Studio could not prepare the Product Manager draft.');
      } finally { setIsExtracting(false); }
      return;
    }
    if (!agentScan.scanned) { setFileError('Scan the connected workspace to enable a local agent. Gemini remains an optional manual choice.'); return; }
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!selectedAgent?.installed) { setFileError('That local coding agent is not available. Install or sign in to it, then scan again. Gemini remains an optional manual choice.'); return; }
    const agentName = localAgentLabel(selectedAgent);
    const prompt = compactAgentPacket(`Use Spec-Kit Engine with ${agentName} for Feature Journey stage 2 only: describe the feature. Do not implement application code.\n\nRead the existing repository, .specify instructions, and coding standards first. Run the integration-appropriate Spec-Kit “specify” workflow to create or update exactly one official feature specification at specs/NNN-feature/spec.md. This is the only accepted output: do not edit application source, tests, configuration, infrastructure, or existing feature specs. Focus on user-facing behavior, success measures, and compatibility boundaries that must not break. Do not invoke planning, tasks, analysis, or implementation. Stop after the specification and requirements-quality findings are ready; summarize repository evidence, assumptions, and questions that need human review.\n\nFeature title: ${title}\n\nFeature input:\n${content}`);
    setEnginePrompt(prompt);
    try { await navigator.clipboard.writeText(prompt); } catch { /* The visible work packet remains available for manual copy. */ }
    setFileError(null);
  };

  const refreshAvailableAgents = async () => {
    if (isProductManagerIntake) {
      setIsRefreshingAgents(true);
      try {
        const refreshed = await refreshRuntimeAgentAvailability(connectorToken);
        setAgentScan(refreshed);
        const detected = recommendedLocalAgent(refreshed.agents, getStudioSettings().preferredAgent, 'planning');
        if (detected && !agentChoiceIsExplicit.current) { setEngineAgent(detected.id); setGenerationPath('engine'); }
        setFileError(null);
      } catch (error) { setFileError(error instanceof Error ? `Couldn’t refresh local agents: ${error.message}` : 'Couldn’t refresh local agents.'); }
      finally { setIsRefreshingAgents(false); }
      return;
    }
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) { setFileError('Connect and scan a repository in Connected Workspace before refreshing local agents.'); return; }
    setIsRefreshingAgents(true);
    try {
      const refreshed = await refreshRuntimeAgentScan(repositoryPath, connectorToken);
      setAgentScan(refreshed);
      const detected = recommendedLocalAgent(refreshed.agents, getStudioSettings().preferredAgent);
      if (detected && !agentChoiceIsExplicit.current) {
        setEngineAgent(detected.id);
        setGenerationPath('engine');
      }
      setFileError(null);
    } catch (error) { setFileError(error instanceof Error ? `Couldn’t refresh local agents: ${error.message}` : 'Couldn’t refresh local agents.'); }
    finally { setIsRefreshingAgents(false); }
  };

  const handlePrimaryAction = () => generationPath === 'gemini' ? handleExtractFeature() : handlePrepareEngine();

  const milestoneMarkdown = (milestone: GitHubMilestoneImport) => [
    `# ${milestone.title}`,
    '',
    `Source: ${milestone.sourceUrl}`,
    milestone.dueOn ? `Due: ${milestone.dueOn}` : '',
    '',
    milestone.description,
    '',
    '## Linked GitHub issues',
    milestone.issues.length ? milestone.issues.map((issue) => `- [${issue.state}] #${issue.number} ${issue.title}${issue.body ? `\n  ${issue.body}` : ''}${issue.url ? `\n  ${issue.url}` : ''}`).join('\n') : 'No linked GitHub issues were returned for this milestone.',
    '',
    milestone.images.length ? `## Reference images for implementation\n${milestone.images.map((image) => `- ${image.alt}: ${image.url}`).join('\n')}\n\nUse these as visual reference when accessible locally; do not infer requirements from an unavailable image.` : '',
  ].filter(Boolean).join('\n');

  const loadGitHubMilestone = async () => {
    setFileError(null);
    setGithubAuthorizationAction(null);
    setIsExtracting(true);
    try {
      const { milestone } = milestoneAccessMode === 'enterprise-app'
        ? { milestone: (await integrationsApi.readEnterpriseGitHubSource(githubUrl)).source }
        : await configuredConnectorClient(connectorToken).readGitHubMilestone(githubUrl);
      setFeatureTitle(milestone.title);
      setFeatureContent(milestoneMarkdown(milestone));
      setMilestoneImages(milestone.images);
      setFocusNextDeliveryAction(true);
    } catch (error) {
      const authorizationUrl = error instanceof StudioApiError && typeof error.details?.ssoAuthorizationUrl === 'string'
        ? error.details.ssoAuthorizationUrl
        : null;
      const reconnectRequired = error instanceof StudioApiError && ['GITHUB_RECONNECT_REQUIRED', 'GITHUB_AUTH_FAILED'].includes(error.code);
      setGithubAuthorizationAction(authorizationUrl
        ? { label: 'Authorize GitHub for this organization', href: authorizationUrl }
        : reconnectRequired ? { label: 'Reconnect GitHub', onClick: () => { void reconnectGitHub(); } } : null);
      setFileError(authorizationUrl
        ? 'GitHub needs you to authorize this connection for your company organization before Studio can read the issue or milestone.'
        : reconnectRequired
          ? 'Your GitHub connection needs to be refreshed. Reconnect GitHub, complete company SSO, then try this import again.'
          : error instanceof Error ? `Couldn’t load the GitHub milestone: ${error.message}` : 'Couldn’t load the GitHub milestone.');
    } finally { setIsExtracting(false); }
  };

  const connectGitHub = () => {
    window.location.assign(`/api/auth/github/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  };

  const reconnectGitHub = async () => {
    await fetch('/api/auth/github/reconnect', { method: 'POST', credentials: 'same-origin' });
    connectGitHub();
  };

  const handleGitHubPrimaryAction = () => {
    if (githubOAuthConfigured && !enterpriseMilestoneAvailable) { connectGitHub(); return; }
    if (!featureContent.trim() && /\/(?:milestone|issues)\/\d+\/?$/i.test(githubUrl.trim())) { void loadGitHubMilestone(); return; }
    handlePrimaryAction();
  };

  const requestEngineRun = () => {
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) { setFileError('Connect and scan a repository in Connected Workspace before running an agent from Studio.'); return; }
    if (!enginePrompt) { setFileError('Prepare the Engine work packet first.'); return; }
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!selectedAgent) { setFileError('Choose a detected local agent before running the work packet.'); return; }
    void confirmStudioAction({ title: `Run ${localAgentLabel(selectedAgent)} in Studio?`, description: `Run in an isolated planning worktree for ${repositoryPath}. Studio will promote only a validated specs/NNN-feature/spec.md; all other agent changes are discarded.`, confirmLabel: `Run ${localAgentLabel(selectedAgent)} in Studio` }).then((confirmed) => { if (confirmed) void runEngineInStudio(); });
  };

  const runEngineInStudio = async () => {
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    const selectedAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
    if (!repositoryPath || !enginePrompt || !selectedAgent) { setFileError('The local agent run is no longer ready. Prepare the work packet again.'); return; }
    // A completed job can remain visible while this modal stays open. It must
    // never be mistaken for the next isolated Stage-2 execution.
    setFileError(null); setEngineStoryReviewError(null); setAgentJob(null); setIsRunningAgent(true);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      let job = await startRepositoryExecution(client, repositoryPath, () => client.startSpecKitAgent(repositoryPath, engineAgent, enginePrompt, activeProject, undefined, 'workspace-write', 'spec'));
      const polling = beginPolling();
      try { job = await waitForConnectorJob(job, client, setAgentJob, 750, undefined, polling.signal); }
      finally { polling.release(); }
      if (!job.ok) throw new Error(agentFailureGuidance(engineAgent, job.output));
    } catch (error) {
      if (!isConnectorJobPollingAborted(error)) setFileError(error instanceof Error ? `Studio could not run the local agent: ${error.message}` : 'Studio could not run the local agent.');
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
      const saved = onMergeIntoActiveProject(extractedResult.userStories || [], { ...extractedResult, source: importTab, sourceContent: featureContent.trim(), referenceImages: featureReferenceImages }, personaRoute);
      if (!saved) {
        setFileError('Studio could not retain this feature in the current workspace. The dialog remains open; do not continue until this is resolved.');
        return;
      }
      // Saving is the only durable action here. Continue immediately to the
      // selected Journey so users do not have to confirm that same outcome a
      // second time. Product discovery remains available later as an optional
      // review, never as a gate on a structured import.
      onClose();
    } catch (error) {
      console.error('Failed to save imported feature:', error);
      setFileError(error instanceof Error ? `Studio could not retain this feature: ${error.message}` : 'Studio could not retain this feature in the current workspace.');
    } finally {
      setIsSavingFeature(false);
    }
  };

  const loadEngineStories = async () => {
    const repositoryPath = activeProject?.importedRepo?.repoUrl;
    if (!repositoryPath) { const message = 'Connect and scan the repository before loading its generated Spec-Kit file.'; setFileError(message); setEngineStoryReviewError(message); return; }
    try {
      setFileError(null);
      setEngineStoryReviewError(null);
      setIsLoadingEngineStories(true);
      const { artifacts } = await configuredConnectorClient(connectorToken).readSpecKitArtifacts(repositoryPath);
      const artifact = artifacts.find((candidate) => candidate.kind === 'spec' && /^specs\/[^/]+\/spec\.md$/i.test(candidate.path));
      if (!artifact) throw new Error('No official feature spec was found yet. The completed run did not create specs/NNN-feature/spec.md; review the agent output, then rerun the Step 2 work packet.');
      const parsed = parseSpecKitArtifact(artifact.content);
      if (!parsed.userStories?.length) throw new Error(`Studio found ${artifact.path}, but could not identify user stories in it.`);
      setFeatureTitle(parsed.title || featureTitle);
      setExtractedResult(parsed);
      setPreviewTab('stories');
    } catch (error) {
      const message = error instanceof Error ? `Couldn’t load the generated stories: ${error.message}` : 'Couldn’t load the generated stories.';
      setFileError(message); setEngineStoryReviewError(message);
    } finally { setIsLoadingEngineStories(false); }
  };

  const deliveryWorkIsActive = isExtracting || isRunningAgent || isSavingFeature || agentJob?.status === 'running';
  const selectedPlanningAgent = agentScan.agents.find((agent) => agent.id === engineAgent);
  const sourceIsReady = importTab === 'github' ? Boolean(featureContent.trim() || githubUrl.trim()) : Boolean(featureContent.trim());
  const localPreparationReady = Boolean(selectedPlanningAgent && agentSupports(selectedPlanningAgent, 'planning'));
  const featureReadyToPrepare = sourceIsReady && !isResolvingPersonaAgent && (generationPath === 'gemini' || localPreparationReady);
  const sourceLabel = importTab === 'text' ? 'Pasted brief' : importTab === 'file' ? 'Uploaded document' : importTab === 'github' ? 'GitHub source' : featureTitle || 'Feature blueprint';
  const preparationLabel = generationPath === 'engine'
    ? selectedPlanningAgent ? `${localAgentLabel(selectedPlanningAgent)}${isProductManagerIntake ? ' · repository-free draft' : ''}` : 'Local Spec-Kit Engine'
    : 'Studio draft with Gemini';
  const primaryActionLabel = importTab === 'github' && !featureContent.trim()
    ? 'Load GitHub milestone'
    : isProductManagerIntake && generationPath === 'engine' ? `Draft user stories with ${selectedPlanningAgent ? localAgentLabel(selectedPlanningAgent) : 'agent'}`
    : isProductManagerIntake && generationPath === 'gemini' ? 'Prepare Product Manager Spec-Kit brief'
    : generationPath === 'engine' ? 'Prepare reviewable Spec-Kit brief' : 'Create reviewable Studio draft';
  const requestClose = () => {
    if (deliveryWorkIsActive) {
      setFileError('Delivery work is still running. Keep this dialog open until the local agent or save operation finishes.');
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={requestClose} closeOnBackdrop={false} closeOnEscape={false} ariaLabel="Import feature and generate Spec-Kit" className="items-center justify-center overflow-y-auto p-3 sm:p-4 md:p-6">
      <div className="delivery-intake-modal my-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
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
                <span className="delivery-intake-badge text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded border">
                  Spec-Kit {SPECKIT_RELEASE_TAG}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Choose the smallest useful scope, add the source, then review before anything enters delivery.
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
          <ImportNotice message={fileError} action={githubAuthorizationAction} />
          {!extractedResult && <DeliveryIntakeProgress scope={deliveryScope} hasSource={sourceIsReady} readyToContinue={deliveryScope === 'user-story' || featureReadyToPrepare} />}
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
          {/* Step 2: capture the delivery source before selecting how Studio prepares it. */}
          {deliveryScope === 'feature' && !extractedResult && (
            <>
            <FeatureSourceInput
              source={importTab}
              title={featureTitle}
              content={featureContent}
              githubUrl={githubUrl}
              isProcessing={isExtracting}
              actionLabel={isProductManagerIntake && generationPath === 'engine' ? `Draft user stories with ${selectedPlanningAgent ? localAgentLabel(selectedPlanningAgent) : 'agent'}` : isProductManagerIntake && generationPath === 'gemini' ? 'Prepare Product Manager Spec-Kit brief' : generationPath === 'engine' ? 'Prepare Spec-Kit Engine Work Packet' : 'Extract User Stories & Generate Spec-Kit'}
              milestoneAccessMode={milestoneAccessMode}
              enterpriseMilestoneAvailable={enterpriseMilestoneAvailable}
              githubOAuthConfigured={githubOAuthConfigured}
              onConnectGitHub={connectGitHub}
              onReconnectGitHub={() => { void reconnectGitHub(); }}
              onSourceChange={setImportTab}
              onTitleChange={setFeatureTitle}
              onContentChange={setFeatureContent}
              onGithubUrlChange={(url) => { setGithubUrl(url); setFeatureContent(''); setMilestoneImages([]); }}
              onMilestoneAccessModeChange={setMilestoneAccessMode}
              onFileSelect={handleFileUpload}
              onClearFile={() => setFeatureContent('')}
              onPrimaryAction={importTab === 'github' ? handleGitHubPrimaryAction : handlePrimaryAction}
              showPrimaryAction={false}
              onPresetSelect={(content, title) => {
                setFeatureTitle(title);
                setFeatureContent(content);
              }}
            />
            <div ref={deliveryActionRef} tabIndex={-1} className="scroll-mt-6 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <DeliveryIntakeAction
                label={primaryActionLabel}
                disabled={!featureReadyToPrepare}
                isProcessing={isExtracting}
                sourceLabel={sourceLabel}
                preparationLabel={preparationLabel}
                onStart={importTab === 'github' ? handleGitHubPrimaryAction : handlePrimaryAction}
              />
            </div>
            </>
          )}
          {deliveryScope === 'feature' && featureReferenceImages.length > 0 && !extractedResult && (
            <section aria-labelledby="milestone-images-title" className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4">
              <div className="flex items-start gap-2"><ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><div><h3 id="milestone-images-title" className="text-xs font-bold text-cyan-100">Reference images retained for agents</h3><p className="mt-1 text-[11px] leading-5 text-cyan-100/75">These HTTPS references are included in the work packet. Studio does not download, persist, or proxy them.</p></div></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{featureReferenceImages.map((image) => <a key={image.url} href={image.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 hover:border-cyan-400/50"><img src={image.url} alt={image.alt} referrerPolicy="no-referrer" className="h-40 w-full object-cover" /><span className="flex items-center justify-between gap-2 p-2 text-[11px] font-semibold text-zinc-200"><span className="truncate">{image.alt}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></span></a>)}</div>
            </section>
          )}

          {deliveryScope === 'feature' && !extractedResult && !enginePrompt && <>
            {isProductManagerIntake && <section className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-xs text-violet-100"><p className="font-bold">Product Manager intake — local draft or connector agent</p><p className="mt-1 leading-relaxed">A local reviewable draft is available without repository setup. A detected agent can turn this source into user stories and a reviewable Spec-Kit handoff in a disposable, repository-free session—no clone, development tools, or tests.</p></section>}
            <details className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4 text-xs"><summary className="cursor-pointer font-bold text-cyan-100">{isProductManagerIntake ? 'Choose preparation method' : 'Adjust preparation method'} <span className="font-normal text-zinc-400">· Studio selected {preparationLabel}</span></summary><div className="mt-4 border-t border-cyan-400/15 pt-4"><GenerationPathSelector workflow={isProductManagerIntake ? 'persona-draft' : 'repository'} scan={agentScan} path={generationPath} selectedAgent={engineAgent} onPathChange={(path) => { agentChoiceIsExplicit.current = true; setGenerationPath(path); }} onAgentChange={(agent) => { agentChoiceIsExplicit.current = true; setEngineAgent(agent); }} onRefreshAgents={() => void refreshAvailableAgents()} isRefreshingAgents={isRefreshingAgents} /></div></details>
          </>}

          {deliveryScope === 'feature' && !extractedResult && !isProductManagerIntake && activeProject?.importedRepo?.repoUrl && !enginePrompt && (
            <section className="feature-import-recovery flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold text-zinc-100">Already have a generated specification?</p><p className="mt-0.5 text-[11px] text-zinc-400">Load the newest official <code>specs/.../spec.md</code> for review instead of running an agent again. Nothing is written to your repository.</p></div>
              <button type="button" onClick={loadEngineStories} className="shrink-0 rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10">Review existing specification</button>
            </section>
          )}
          {deliveryScope === 'feature' && enginePrompt && !extractedResult && (
            <div ref={enginePacketRef} tabIndex={-1} className="scroll-mt-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            <EngineWorkPacketPanel
              prompt={enginePrompt}
              agentLabel={localAgentLabel(agentScan.agents.find((agent) => agent.id === engineAgent) || engineAgent)}
              connectorToken={connectorToken}
              repositoryConnected={Boolean(activeProject?.importedRepo?.repoUrl)}
              isRunning={isRunningAgent}
              job={agentJob}
              onCopy={() => navigator.clipboard.writeText(enginePrompt)}
              onTokenChange={(token) => { setConnectorToken(token); setConnectorSessionToken(token); }}
              onRun={requestEngineRun}
              onOpenWorkspace={onOpenWorkspace}
              onReviewStories={loadEngineStories}
              isReviewingStories={isLoadingEngineStories}
              reviewError={engineStoryReviewError}
            />
            </div>
          )}
          {deliveryScope === 'feature' && agentJob && !agentJob.ok && !extractedResult && <AgentJobStatus job={agentJob} preparingLabel={`Running ${localAgentLabel(agentScan.agents.find((agent) => agent.id === engineAgent) || engineAgent)} for this feature…`} />}

          {/* Step 2: review extracted artifacts before choosing their destination. */}
          {extractedResult && (
            <FeatureExtractionPreview
              result={extractedResult}
              activeProjectName={activeProject?.name}
              canMerge={Boolean(activeProject && onMergeIntoActiveProject)}
              tab={previewTab}
              onTabChange={setPreviewTab}
              onReExtract={() => { setExtractedResult(null); }}
              onCreateProject={handleCreateNewProject}
              onMerge={handleMergeToActive}
              mergeLabel={isProductManagerIntake ? 'Add and review with Product Manager' : 'Add to this Journey'}
              isSavingFeature={isSavingFeature}
              alternativeAction={isProductManagerIntake
                ? {
                    label: localPreparationReady ? 'Use the connector agent instead' : 'Use a connector agent instead',
                    description: localPreparationReady
                      ? 'Keep this source and prepare another repository-free, reviewable user-story draft.'
                      : 'Keep this source. Studio will show the agent readiness needed before it can run.',
                    onAction: () => {
                      setExtractedResult(null);
                      setGenerationPath('engine');
                      setFileError(localPreparationReady
                        ? 'Connector agent selected. Review the source and prepare the work packet when ready.'
                        : 'Connector-agent path selected. Refresh available agents before preparing the repository-free draft.');
                    },
                  }
                : undefined}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
