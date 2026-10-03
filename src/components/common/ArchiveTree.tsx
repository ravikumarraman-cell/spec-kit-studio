import { FileText, FolderOpen } from 'lucide-react';

interface Node { name: string; children: Map<string, Node>; file: boolean; }
function createTree(paths: string[]) {
  const root: Node = { name: 'handoff', children: new Map(), file: false };
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean); let current = root;
    parts.forEach((part, index) => { const child = current.children.get(part) || { name: part, children: new Map<string, Node>(), file: false }; if (index === parts.length - 1) child.file = true; current.children.set(part, child); current = child; });
  }
  return root;
}
function NodeView({ node, depth = 0 }: { node: Node; depth?: number }) {
  return <li className="list-none"><span className="flex items-center gap-1.5 py-0.5 text-xs text-zinc-300" style={{ paddingLeft: `${depth * 16}px` }}>{node.file ? <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-300" /> : <FolderOpen className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}<span className={node.file ? 'font-mono text-[11px]' : 'font-semibold'}>{node.name}{node.file ? '' : '/'}</span></span>{node.children.size > 0 && <ul>{[...node.children.values()].sort((a, b) => Number(a.file) - Number(b.file) || a.name.localeCompare(b.name)).map((child) => <NodeView key={child.name} node={child} depth={depth + 1} />)}</ul>}</li>;
}

/** Expanded, content-free preview of the exact archive paths a user downloads. */
export function ArchiveTree({ paths, rootLabel }: { paths: string[]; rootLabel: string }) {
  const root = createTree(paths); root.name = rootLabel;
  return <section className="mt-3 rounded-xl border border-emerald-400/20 bg-zinc-950/35 p-3" aria-label="Archive file tree"><p className="text-xs font-bold text-emerald-100">Inside the downloadable ZIP</p><p className="mt-1 text-[11px] text-zinc-400">Exact package layout; no repository files, tokens, or agent settings are included.</p><ul className="mt-2"><NodeView node={root} /></ul></section>;
}
