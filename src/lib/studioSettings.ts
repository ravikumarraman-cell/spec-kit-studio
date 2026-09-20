import { LocalAgentId } from './agentAvailability';

export interface StudioSettings {
  preferredAgent: 'auto' | LocalAgentId;
  showAdvancedTools: boolean;
}

const key = 'speckit_studio_settings_v1';
const defaults: StudioSettings = { preferredAgent: 'auto', showAdvancedTools: true };

export function getStudioSettings(): StudioSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return { ...defaults, ...stored };
  } catch { return defaults; }
}

export function saveStudioSettings(settings: StudioSettings): void {
  localStorage.setItem(key, JSON.stringify(settings));
  window.dispatchEvent(new Event('speckit-settings-change'));
}
