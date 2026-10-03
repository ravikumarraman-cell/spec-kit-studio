import { BookOpenCheck, Layers3 } from 'lucide-react';
import { deliveryScope, primaryStoryForItem } from '../../lib/deliveryItems';
import { FeatureInboxItem, SpecKitProject } from '../../types/speckit';

export function DeliveryScopeBanner({ project, item }: { project: SpecKitProject; item?: FeatureInboxItem }) {
  if (!item) return null;
  const storyScope = deliveryScope(item) === 'user-story';
  const story = storyScope ? primaryStoryForItem(project, item) : undefined;
  const Icon = storyScope ? BookOpenCheck : Layers3;
  return <section className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3 text-xs">
    <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">{storyScope ? 'User story in focus' : 'Feature in focus'}</p><p className="mt-0.5 truncate font-bold text-zinc-100">{storyScope ? `${story?.id || item.primaryStoryId} - ${story?.title || item.title}` : item.title}</p>{storyScope && <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">As a {story?.asA}, I want to {story?.iWantTo}, so that {story?.soThat}.</p>}</div></div>
  </section>;
}