export interface GitHubConfig {
  token: string;
  selectedRepoOwner: string;
  selectedRepoName: string;
  defaultBranch: string;
  isConnected: boolean;
}

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  selectedProjectKey: string;
  isConnected: boolean;
}

const GITHUB_KEY = "speckit_github_config";
const JIRA_KEY = "speckit_jira_config";
const GITHUB_TOKEN_SESSION_KEY = "speckit_github_token_session";
const JIRA_TOKEN_SESSION_KEY = "speckit_jira_token_session";

type SavedGitHubConfig = Omit<GitHubConfig, "token" | "isConnected">;
type SavedJiraConfig = Omit<JiraConfig, "apiToken" | "isConnected">;

function storage(kind: "local" | "session"): Storage | undefined {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function notifyUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("speckit_integrations_updated"));
}

export function getGitHubConfig(): GitHubConfig {
  try {
    const local = storage("local");
    const session = storage("session");
    const parsed = JSON.parse(local?.getItem(GITHUB_KEY) || "{}") as Partial<GitHubConfig>;
    const migratedToken = typeof parsed.token === "string" ? parsed.token : "";
    const token = session?.getItem(GITHUB_TOKEN_SESSION_KEY) || migratedToken;
    if (migratedToken) {
      session?.setItem(GITHUB_TOKEN_SESSION_KEY, migratedToken);
      local?.setItem(GITHUB_KEY, JSON.stringify({ selectedRepoOwner: parsed.selectedRepoOwner || "", selectedRepoName: parsed.selectedRepoName || "", defaultBranch: parsed.defaultBranch || "main" } satisfies SavedGitHubConfig));
    }
    return { token, selectedRepoOwner: parsed.selectedRepoOwner || "", selectedRepoName: parsed.selectedRepoName || "", defaultBranch: parsed.defaultBranch || "main", isConnected: Boolean(token) };
  } catch (error) {
    console.error("Error reading GitHub integration configuration", error);
  }
  return {
    token: "",
    selectedRepoOwner: "",
    selectedRepoName: "",
    defaultBranch: "main",
    isConnected: false,
  };
}

export function saveGitHubConfig(config: GitHubConfig) {
  try {
    storage("local")?.setItem(GITHUB_KEY, JSON.stringify({ selectedRepoOwner: config.selectedRepoOwner, selectedRepoName: config.selectedRepoName, defaultBranch: config.defaultBranch || "main" } satisfies SavedGitHubConfig));
    const session = storage("session");
    if (config.token) session?.setItem(GITHUB_TOKEN_SESSION_KEY, config.token);
    else session?.removeItem(GITHUB_TOKEN_SESSION_KEY);
    notifyUpdated();
  } catch (error) {
    console.error("Error saving GitHub integration configuration", error);
  }
}

export function getJiraConfig(): JiraConfig {
  try {
    const local = storage("local");
    const session = storage("session");
    const parsed = JSON.parse(local?.getItem(JIRA_KEY) || "{}") as Partial<JiraConfig>;
    const migratedToken = typeof parsed.apiToken === "string" ? parsed.apiToken : "";
    const apiToken = session?.getItem(JIRA_TOKEN_SESSION_KEY) || migratedToken;
    if (migratedToken) {
      session?.setItem(JIRA_TOKEN_SESSION_KEY, migratedToken);
      local?.setItem(JIRA_KEY, JSON.stringify({ domain: parsed.domain || "", email: parsed.email || "", selectedProjectKey: parsed.selectedProjectKey || "" } satisfies SavedJiraConfig));
    }
    return { domain: parsed.domain || "", email: parsed.email || "", apiToken, selectedProjectKey: parsed.selectedProjectKey || "", isConnected: Boolean(parsed.domain && parsed.email && apiToken) };
  } catch (error) {
    console.error("Error reading Jira integration configuration", error);
  }
  return {
    domain: "",
    email: "",
    apiToken: "",
    selectedProjectKey: "",
    isConnected: false,
  };
}

export function saveJiraConfig(config: JiraConfig) {
  try {
    storage("local")?.setItem(JIRA_KEY, JSON.stringify({ domain: config.domain, email: config.email, selectedProjectKey: config.selectedProjectKey } satisfies SavedJiraConfig));
    const session = storage("session");
    if (config.apiToken) session?.setItem(JIRA_TOKEN_SESSION_KEY, config.apiToken);
    else session?.removeItem(JIRA_TOKEN_SESSION_KEY);
    notifyUpdated();
  } catch (error) {
    console.error("Error saving Jira integration configuration", error);
  }
}
