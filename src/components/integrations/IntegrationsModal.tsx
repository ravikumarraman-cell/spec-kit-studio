import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  ExternalLink,
  GitBranch,
  UploadCloud,
  FileText,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import {
  getGitHubConfig,
  saveGitHubConfig,
  getJiraConfig,
  saveJiraConfig,
  GitHubConfig,
  JiraConfig,
} from "../../lib/integrationsStore";

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specData?: any;
  planData?: any;
  tasksData?: any;
  rulesData?: any;
}

export function IntegrationsModal({
  isOpen,
  onClose,
  specData,
  planData,
  tasksData,
  rulesData,
}: IntegrationsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"github" | "jira">("github");

  // GitHub Local Config State
  const [ghToken, setGhToken] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string }>({
    owner: "",
    name: "",
  });
  const [targetBranch, setTargetBranch] = useState("main");
  const [commitStatusMsg, setCommitStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Jira Local Config State
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [selectedJiraProject, setSelectedJiraProject] = useState("");
  const [jiraStatusMsg, setJiraStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const gh = getGitHubConfig();
    setGhToken(gh.token);
    if (gh.selectedRepoOwner && gh.selectedRepoName) {
      setSelectedRepo({ owner: gh.selectedRepoOwner, name: gh.selectedRepoName });
    }
    setTargetBranch(gh.defaultBranch || "main");

    const jira = getJiraConfig();
    setJiraDomain(jira.domain);
    setJiraEmail(jira.email);
    setJiraApiToken(jira.apiToken);
    setSelectedJiraProject(jira.selectedProjectKey);
  }, [isOpen]);

  // TanStack Query: Fetch GitHub Repos
  const {
    data: githubRepos,
    isLoading: isReposLoading,
    refetch: refetchRepos,
    error: reposError,
  } = useQuery({
    queryKey: ["github-repos", ghToken],
    queryFn: async () => {
      if (!ghToken) return [];
      const res = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ghToken }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load GitHub repositories.");
      return data.repos || [];
    },
    enabled: Boolean(ghToken && activeTab === "github"),
  });

  // TanStack Query: Fetch Jira Projects
  const {
    data: jiraProjects,
    isLoading: isJiraLoading,
    refetch: refetchJira,
    error: jiraError,
  } = useQuery({
    queryKey: ["jira-projects", jiraDomain, jiraEmail, jiraApiToken],
    queryFn: async () => {
      if (!jiraDomain || !jiraEmail || !jiraApiToken) return [];
      const res = await fetch("/api/jira/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: jiraDomain, email: jiraEmail, apiToken: jiraApiToken }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load Jira projects.");
      return data.projects || [];
    },
    enabled: Boolean(jiraDomain && jiraEmail && jiraApiToken && activeTab === "jira"),
  });

  // TanStack Mutation: Commit .spec-kit files directly to GitHub
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!ghToken || !selectedRepo.owner || !selectedRepo.name) {
        throw new Error("Please select a target GitHub repository first.");
      }

      // Prepare .spec-kit files payload
      const filesPayload: Record<string, string> = {
        "spec.md": typeof specData === "string" ? specData : JSON.stringify(specData || {}, null, 2),
        "plan.md": typeof planData === "string" ? planData : JSON.stringify(planData || {}, null, 2),
        "tasks.md": typeof tasksData === "string" ? tasksData : JSON.stringify(tasksData || {}, null, 2),
        "rules.md": typeof rulesData === "string" ? rulesData : JSON.stringify(rulesData || {}, null, 2),
      };

      const res = await fetch("/api/github/commit-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ghToken,
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          branch: targetBranch,
          files: filesPayload,
          commitMessage: `docs(spec-kit): update specification package via Spec-Kit Studio`,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to commit files to GitHub.");
      return data;
    },
    onSuccess: (data) => {
      setCommitStatusMsg({ type: "success", text: data.message || "Successfully committed .spec-kit to repository!" });
      saveGitHubConfig({
        token: ghToken,
        selectedRepoOwner: selectedRepo.owner,
        selectedRepoName: selectedRepo.name,
        defaultBranch: targetBranch,
        isConnected: true,
      });
    },
    onError: (err: any) => {
      setCommitStatusMsg({ type: "error", text: err.message || "Commit failed." });
    },
  });

  // TanStack Mutation: Sync User Stories to Jira
  const jiraSyncMutation = useMutation({
    mutationFn: async (story: { title: string; description: string }) => {
      if (!jiraDomain || !jiraEmail || !jiraApiToken || !selectedJiraProject) {
        throw new Error("Please select a Jira project and configure credentials.");
      }

      const res = await fetch("/api/jira/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: jiraDomain,
          email: jiraEmail,
          apiToken: jiraApiToken,
          projectKey: selectedJiraProject,
          issueType: "Story",
          summary: story.title,
          description: story.description,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create Jira issue.");
      return data;
    },
    onSuccess: (data) => {
      setJiraStatusMsg({ type: "success", text: `Created Jira Story: ${data.key}!` });
      saveJiraConfig({
        domain: jiraDomain,
        email: jiraEmail,
        apiToken: jiraApiToken,
        selectedProjectKey: selectedJiraProject,
        isConnected: true,
      });
    },
    onError: (err: any) => {
      setJiraStatusMsg({ type: "error", text: err.message || "Jira creation failed." });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Integrations & Direct Sync
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                  TanStack Query Powered
                </span>
              </h2>
              <p className="text-xs text-slate-400">Connect GitHub repos and Jira Cloud projects for seamless SDD workflows.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integration Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          <button
            onClick={() => setActiveTab("github")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "github"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository Direct Sync</span>
          </button>
          <button
            onClick={() => setActiveTab("jira")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "jira"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <span>Jira Cloud Integration</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === "github" ? (
            <div className="space-y-5">
              {/* Token Config */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>GitHub Personal Access Token (PAT)</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Generate PAT on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-9 pr-24 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => {
                      saveGitHubConfig({
                        token: ghToken,
                        selectedRepoOwner: selectedRepo.owner,
                        selectedRepoName: selectedRepo.name,
                        defaultBranch: targetBranch,
                        isConnected: Boolean(ghToken),
                      });
                      refetchRepos();
                    }}
                    className="absolute right-1.5 top-1.5 px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/30 transition-all"
                  >
                    Save & Test
                  </button>
                </div>
              </div>

              {/* Repos Selector via TanStack Query */}
              {ghToken && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                      Select Target Repository
                    </label>
                    <button
                      onClick={() => refetchRepos()}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh Repos
                    </button>
                  </div>

                  {isReposLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      Loading repositories via TanStack Query...
                    </div>
                  ) : reposError ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      {(reposError as Error).message}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={selectedRepo.owner && selectedRepo.name ? `${selectedRepo.owner}/${selectedRepo.name}` : ""}
                        onChange={(e) => {
                          const [owner, name] = e.target.value.split("/");
                          setSelectedRepo({ owner: owner || "", name: name || "" });
                        }}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">-- Choose a Repository --</option>
                        {(githubRepos || []).map((r: any) => (
                          <option key={r.id} value={r.fullName}>
                            {r.fullName} ({r.language || "code"})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={targetBranch}
                        onChange={(e) => setTargetBranch(e.target.value)}
                        placeholder="Branch (e.g., main)"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {/* Direct Commit Action */}
                  {selectedRepo.owner && selectedRepo.name && (
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Target Path: <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded">.spec-kit/</code>
                      </div>
                      <button
                        onClick={() => commitMutation.mutate()}
                        disabled={commitMutation.isPending}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {commitMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                        <span>Commit .spec-kit to {selectedRepo.name}</span>
                      </button>
                    </div>
                  )}

                  {commitStatusMsg && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        commitStatusMsg.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {commitStatusMsg.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{commitStatusMsg.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Jira Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Jira Domain</label>
                  <input
                    type="text"
                    value={jiraDomain}
                    onChange={(e) => setJiraDomain(e.target.value)}
                    placeholder="company.atlassian.net"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Account Email</label>
                  <input
                    type="email"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    placeholder="dev@company.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Jira API Token</label>
                  <input
                    type="password"
                    value={jiraApiToken}
                    onChange={(e) => setJiraApiToken(e.target.value)}
                    placeholder="ATATT3xFfGF0..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    saveJiraConfig({
                      domain: jiraDomain,
                      email: jiraEmail,
                      apiToken: jiraApiToken,
                      selectedProjectKey: selectedJiraProject,
                      isConnected: Boolean(jiraDomain && jiraEmail && jiraApiToken),
                    });
                    refetchJira();
                  }}
                  className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs font-bold rounded-xl transition-all"
                >
                  Save Jira Config
                </button>
              </div>

              {/* Jira Project Selector */}
              {jiraDomain && jiraEmail && jiraApiToken && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 block">Select Jira Project / Board</label>
                  {isJiraLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      Loading Jira projects...
                    </div>
                  ) : jiraError ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      {(jiraError as Error).message}
                    </div>
                  ) : (
                    <select
                      value={selectedJiraProject}
                      onChange={(e) => setSelectedJiraProject(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose a Jira Project --</option>
                      {(jiraProjects || []).map((p: any) => (
                        <option key={p.id} value={p.key}>
                          {p.name} ({p.key})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Sync Story Sample Action */}
                  {selectedJiraProject && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Ready to create Jira Tickets directly from Spec-Kit Stories</span>
                      <button
                        onClick={() =>
                          jiraSyncMutation.mutate({
                            title: specData?.title || "Spec-Kit Feature User Story",
                            description: specData?.summary || "Automated specification requirement generated via Spec-Kit Studio.",
                          })
                        }
                        disabled={jiraSyncMutation.isPending}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {jiraSyncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        <span>Export Active Spec to Jira</span>
                      </button>
                    </div>
                  )}

                  {jiraStatusMsg && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        jiraStatusMsg.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {jiraStatusMsg.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{jiraStatusMsg.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>Config stored safely in browser local context.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
