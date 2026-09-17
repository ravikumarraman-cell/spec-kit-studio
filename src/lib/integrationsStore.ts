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

export function getGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading github config", e);
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
    localStorage.setItem(GITHUB_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("speckit_integrations_updated"));
  } catch (e) {
    console.error("Error saving github config", e);
  }
}

export function getJiraConfig(): JiraConfig {
  try {
    const raw = localStorage.getItem(JIRA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading jira config", e);
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
    localStorage.setItem(JIRA_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("speckit_integrations_updated"));
  } catch (e) {
    console.error("Error saving jira config", e);
  }
}
