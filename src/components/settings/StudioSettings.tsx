import React, { useState } from "react";
import { CheckCircle2, LockKeyhole, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { SddEngineId, SpecKitProject } from "../../types/speckit";
import { projectBackups } from "../../lib/projectBackup";
import { resolveStackProfile } from "../../lib/stackProfiles";
import { providerOptions } from "../../lib/providerConfiguration";
import { getStudioSettings, saveStudioSettings, StudioSettings as Settings } from "../../lib/studioSettings";
import { SpecKitVersionSelector } from "../common/SpecKitVersionSelector";
import { ProgressiveDisclosure } from "../common/ProgressiveDisclosure";
import { THEME_PRESETS, useTheme } from "../../context/ThemeContext";
import { SDD_ENGINES, sddEngine } from "../../lib/sddEngines";
import { confirmStudioAction } from "../../lib/confirmation";
import { LocalAgentPreferences } from "./LocalAgentPreferences";
import { LocalConnectorPreferences } from "./LocalConnectorPreferences";

interface Props {
  project: SpecKitProject;
  onSelectVersion: (version: string) => void;
  onSelectSddEngine: (engine: SddEngineId) => void;
  onSaveStackProfile: (profile: SpecKitProject["stackProfile"]) => void;
  onRestoreSnapshot: (savedAt: string) => boolean;
}

export function StudioSettings({ project, onSelectVersion, onSelectSddEngine, onSaveStackProfile, onRestoreSnapshot }: Props) {
  const profile = resolveStackProfile(project);
  const backups = projectBackups(project.id);
  const [settings, setSettings] = useState<Settings>(() => getStudioSettings());
  const { theme, setTheme } = useTheme();
  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveStudioSettings(next);
  };
  const repositoryPath = project.importedRepo?.repoUrl;
  const engine = sddEngine(project.sddEngine);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <header>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400">
          <Settings2 className="h-4 w-4" />
          Studio settings
        </div>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Make Studio work your way—without changing the workflow</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">These preferences shape how Studio presents and runs work. Repository rules and Spec-Kit artifacts remain reviewable in the Feature Journey.</p>
      </header>

      <LocalConnectorPreferences />

      <LocalAgentPreferences settings={settings} repositoryPath={repositoryPath} onChange={update} />

      <ProgressiveDisclosure className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1" tone="context" label="More workspace settings" summary="compatibility, repository profile, recovery, providers, and appearance">
        <div className="space-y-4 p-3">
          <section className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-zinc-900 to-zinc-900 p-5">
            <div className="flex gap-3">
              <div className="rounded-xl bg-indigo-500/15 p-2 text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">SDD engine</p>
                <h2 className="mt-1 font-bold text-zinc-100">One production engine. A clear future path.</h2>
                <p className="mt-1 text-xs text-zinc-400">GitHub Spec Kit is the only engine Studio can install, validate, and execute today. Future choices are visible for planning, but intentionally unavailable.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SDD_ENGINES.map((candidate) =>
                candidate.availability === "available" ? (
                  <button key={candidate.id} type="button" onClick={() => onSelectSddEngine(candidate.id)} aria-pressed={engine.id === candidate.id} className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 p-4 text-left ring-1 ring-emerald-400/20">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-emerald-100">{candidate.label}</strong>
                      <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-950">Available now</span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-300">{candidate.description}</span>
                  </button>
                ) : (
                  <div key={candidate.id} aria-label={`${candidate.label}: coming soon`} className="rounded-xl border border-zinc-800 bg-zinc-950/45 p-4 opacity-75">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-zinc-300">{candidate.label}</strong>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        <LockKeyhole className="h-3 w-3" />
                        Coming soon
                      </span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-500">{candidate.description}</span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-3 rounded-lg border border-indigo-400/20 bg-zinc-950/60 p-3 text-[11px] text-zinc-400">
              <strong className="text-zinc-200">Available today: {engine.artifactModel}</strong>
              <br />
              Studio applies strict local conformance checks and preserves its existing review, approval, worktree, and receipt controls.
            </p>
            <div className="mt-4">
              <SpecKitVersionSelector currentVersion={project.version} onSelectVersion={onSelectVersion} variant="full" />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold text-zinc-100">Repository stack profile</h2>
            <p className="mt-1 text-xs text-zinc-400">This drives task guardrails and handoff templates for this project only.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-300">
                Profile
                <select value={profile.id} onChange={(event) => onSaveStackProfile({ id: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-100">
                  <option value="node">Node.js / TypeScript</option>
                  <option value="python">Python</option>
                  <option value="infrastructure">Infrastructure as Code</option>
                  <option value="generic">Repository-defined</option>
                </select>
              </label>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
                <strong className="text-zinc-200">Default checks</strong>
                <p className="mt-1">{profile.testCommands.join(" · ") || "Use repository-declared checks."}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold text-zinc-100">Recovery snapshots</h2>
            <p className="mt-1 text-xs text-zinc-400">Studio retains up to 12 local pre-change snapshots for this project. Restore only when you want to undo a Studio state change; repository files are never modified.</p>
            {backups.length === 0 ? (
              <p className="mt-3 rounded-lg bg-zinc-950 p-3 text-xs text-zinc-500">No snapshot is available yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {backups.map((backup) => (
                  <div key={backup.savedAt} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-950 p-3 text-xs">
                    <div>
                      <p className="font-semibold text-cyan-200">{new Date(backup.savedAt).toLocaleString()}</p>
                      <p className="mt-1 text-zinc-500">
                        {backup.reason} · {backup.project.journey?.completedStages.length || 0}/8 stages approved
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void confirmStudioAction({
                          title: "Restore this Studio snapshot?",
                          description: "Your current Studio state will be saved as a new recovery snapshot first. Repository files will not be changed.",
                          confirmLabel: "Restore snapshot",
                          tone: "caution",
                        }).then((confirmed) => {
                          if (confirmed) onRestoreSnapshot(backup.savedAt);
                        });
                      }}
                      className="rounded-lg border border-cyan-400/30 px-3 py-2 font-bold text-cyan-200 hover:bg-cyan-500/10"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold text-zinc-100">Provider configuration options</h2>
            <p className="mt-1 text-xs text-zinc-400">Choose a collaboration model deliberately. Remote publication remains an explicit action.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {providerOptions.map((option) => (
                <div key={option.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <strong className="text-xs text-zinc-100">{option.label}</strong>
                  <p className="mt-1 text-[11px] text-zinc-400">{option.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold text-zinc-100">Appearance</h2>
            <p className="mt-1 text-xs text-zinc-400">Theme is a personal Studio preference and never changes repository files.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {THEME_PRESETS.map((preset) => (
                <button type="button" key={preset.id} onClick={() => setTheme(preset.id)} className={`rounded-xl border p-3 text-left ${theme === preset.id ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-zinc-100">{preset.name}</strong>
                    {theme === preset.id && <CheckCircle2 className="h-4 w-4 text-cyan-300" />}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ProgressiveDisclosure>

      <p className="flex items-center gap-2 text-xs text-zinc-500">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        Sensitive actions still require an explicit confirmation at the point of action.
      </p>
    </div>
  );
}
