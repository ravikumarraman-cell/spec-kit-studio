import React, { useEffect, useState } from 'react';
import { ChevronLeft, FolderOpen, LoaderCircle, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { connectorCapabilityError } from '../../lib/connector';

export interface RepositoryDirectoryEntry { name: string; path: string; }
export interface RepositoryDirectoryListing { parentPath: string | null; directories: RepositoryDirectoryEntry[]; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  listDirectories: (parentPath?: string) => Promise<RepositoryDirectoryListing>;
  onUseSystemDialog: () => void;
}

/** A theme-aware, bounded picker for connector-approved repository roots. */
export function RepositoryDirectoryPicker({ isOpen, onClose, onSelect, listDirectories, onUseSystemDialog }: Props) {
  const [listing, setListing] = useState<RepositoryDirectoryListing | null>(null);
  const [currentPath, setCurrentPath] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (path?: string) => {
    setLoading(true); setError(null);
    try { const next = await listDirectories(path); setListing(next); setCurrentPath(path); }
    catch (reason) { setError(connectorCapabilityError(reason, 'approved-folder browsing')); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) void load(); }, [isOpen]); // Reset to the connector-approved roots each time.

  return <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Choose a repository folder" closeOnBackdrop closeOnEscape>
    <section className="repository-directory-picker mx-4 w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em]">Connected workspace</p><h2 className="mt-1 text-lg font-bold">Choose a repository folder</h2><p className="mt-1 text-xs leading-relaxed">Browse only folders approved by this local connector. Selecting one fills the path; scanning remains your next explicit action.</p></div><button type="button" onClick={onClose} aria-label="Close folder picker" className="rounded-lg p-2"><X className="h-5 w-5" /></button></header>
      <div className="p-5"><div className="repository-directory-picker-path truncate rounded-lg px-3 py-2 font-mono text-[11px]">{currentPath || 'Approved connector folders'}</div>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border p-1">
          {loading ? <div className="flex items-center justify-center gap-2 p-8 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />Loading folders…</div> : error ? <p role="alert" className="p-4 text-sm">{error}</p> : <>
            {listing?.parentPath && <button type="button" onClick={() => void load(listing.parentPath || undefined)} className="repository-directory-picker-row flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm"><ChevronLeft className="h-4 w-4" />Up one folder</button>}
            {(listing?.directories || []).map((directory) => <div key={directory.path} className="repository-directory-picker-row flex items-center gap-3 rounded-lg px-3 py-2.5"><button type="button" onClick={() => void load(directory.path)} className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm font-semibold"><FolderOpen className="h-4 w-4 shrink-0" /><span className="truncate">{directory.name}</span></button><button type="button" onClick={() => onSelect(directory.path)} className="repository-directory-picker-select shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold">Select</button></div>)}
            {!listing?.directories.length && <p className="p-5 text-center text-sm">No selectable subfolders are available here.</p>}
          </>}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><button type="button" onClick={onUseSystemDialog} className="text-xs font-semibold underline-offset-2 hover:underline">Use system folder dialog</button><button type="button" onClick={onClose} className="repository-directory-picker-cancel rounded-lg px-4 py-2 text-xs font-bold">Cancel</button></footer>
    </section>
  </Modal>;
}
