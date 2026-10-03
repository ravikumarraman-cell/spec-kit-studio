import type { LucideIcon } from 'lucide-react';
import { FolderGit2, LayoutDashboard, Settings, Wrench } from 'lucide-react';
import type { ViewTab } from '../../types/speckit';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

type OtherWorkVisibility = 'always' | 'secondary' | 'hidden';

interface NavItemProps {
  tab: ViewTab;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: (tab: ViewTab) => void;
  detail?: string;
  tone?: 'default' | 'violet' | 'cyan';
  className?: string;
}

/** Shared, accessible sidebar item for every non-journey destination. */
export function SidebarNavItem({ tab, label, icon: Icon, active, onNavigate, detail, tone = 'default', className = '' }: NavItemProps) {
  const activeStyle = tone === 'violet'
    ? 'border-violet-300 bg-violet-50 text-violet-900 shadow-sm before:bg-violet-600 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-100 dark:before:bg-violet-300'
    : tone === 'cyan'
      ? 'border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm before:bg-cyan-600 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-100 dark:before:bg-cyan-300'
      : 'border-blue-300 bg-blue-50 text-blue-950 shadow-sm before:bg-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100 dark:before:bg-blue-300';
  return <button type="button" onClick={() => onNavigate(tab)} aria-current={active ? 'page' : undefined} className={`relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full ${active ? activeStyle : 'border-transparent text-slate-600 before:hidden hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'} ${className}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{label}</span>{detail && <span className="shrink-0 text-[10px] font-medium text-slate-400 dark:text-zinc-500">{detail}</span>}</button>;
}

export function OtherWorkNavigationItem({ active, onNavigate, className }: Pick<NavItemProps, 'active' | 'className'> & { onNavigate: (tab: ViewTab) => void }) {
  return <SidebarNavItem tab="workflows" label="Other work" detail="Bug or assessment" icon={Wrench} active={active} onNavigate={onNavigate} tone="violet" className={className} />;
}

export function WorkspaceMigrationNavigationItem({ active, onNavigate }: Pick<NavItemProps, 'active'> & { onNavigate: (tab: ViewTab) => void }) {
  return <SidebarNavItem tab="import" label="Migrate workspace" detail="Advanced" icon={FolderGit2} active={active} onNavigate={onNavigate} tone="cyan" />;
}

interface StudioSidebarNavProps {
  activeTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  showRefinery?: boolean;
  otherWork?: OtherWorkVisibility;
  showMigration?: boolean;
}

/** Shared secondary navigation: delivery remains primary; reversible work stays discoverable. */
export function StudioSidebarNav({ activeTab, onNavigate, showRefinery = false, otherWork = 'secondary', showMigration = false }: StudioSidebarNavProps) {
  const otherWorkItem = <OtherWorkNavigationItem active={activeTab === 'workflows'} onNavigate={onNavigate} />;
  const migrationItem = <WorkspaceMigrationNavigationItem active={activeTab === 'import'} onNavigate={onNavigate} />;
  return <section className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800" aria-label="Studio navigation"><p className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Studio</p><nav className="mt-2 space-y-1"><SidebarNavItem tab="overview" label="Home" icon={LayoutDashboard} active={activeTab === 'overview'} onNavigate={onNavigate} />{showRefinery && <SidebarNavItem tab="refinery" label="Outcome Refinery" icon={Wrench} active={activeTab === 'refinery'} onNavigate={onNavigate} tone="violet" />}{otherWork === 'always' ? otherWorkItem : otherWork === 'secondary' ? activeTab === 'workflows' ? otherWorkItem : <ProgressiveDisclosure label="Other work" summary="bug fix or assessment">{otherWorkItem}</ProgressiveDisclosure> : null}<SidebarNavItem tab="settings" label="Settings" icon={Settings} active={activeTab === 'settings'} onNavigate={onNavigate} />{showMigration && (activeTab === 'import' ? migrationItem : <ProgressiveDisclosure label="Advanced" summary="migrate a workspace">{migrationItem}</ProgressiveDisclosure>)}</nav></section>;
}
