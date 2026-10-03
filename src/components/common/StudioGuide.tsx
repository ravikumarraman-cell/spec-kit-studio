import { ClipboardEvent as ReactClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronRight, Copy, ImagePlus, LoaderCircle, Send, ShieldCheck, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import type { SpecKitProject, ViewTab } from '../../types/speckit';
import { configuredConnectorClient, reviewStudioGuideImages } from '../../lib/connector';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { deterministicStudioGuideReply, outcomeMismatchFromGuideReply, prepareRetainedStudioGuideImage, prepareStudioGuideImage, requestOutcomeRefinery, sanitizeStudioGuideText, sendMismatchToOutcomeRefinery, STUDIO_GUIDE_QUESTION_LIMIT, STUDIO_GUIDE_REQUEST_EVENT, studioGuideContext, studioGuideWelcome, type StudioGuideMessage, type StudioGuidePreparedImage } from '../../lib/studioGuide';

interface StudioGuideProps { project: SpecKitProject; activeTab: ViewTab; }

const prompts = ['Explain the current stage', 'Why did my plan fail?', 'What should I do next?'];

function GuideInlineText({ value }: { value: string }) {
  return <>{value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  })}</>;
}

/** Converts bounded Guide prose into scannable blocks without interpreting
 * arbitrary HTML or model-supplied markup. */
function GuideMessageContent({ content }: { content: string }) {
  const normalized = String(content || '').replace(/\r/g, '').trim();
  const parts = normalized.split(/\s+(?=\d+\.\s)/).filter(Boolean);
  const intro = parts.shift() || '';
  const paragraphs = intro.split(/\n{2,}/).map((item) => item.replace(/\n+/g, ' ').trim()).filter(Boolean);
  const actions = parts.map((item) => item.replace(/^\d+\.\s*/, '').replace(/\n+/g, ' ').trim()).filter(Boolean);
  return <div data-guide-message-content className="studio-guide__message-content">
    {paragraphs.map((paragraph, index) => <p key={index}><GuideInlineText value={paragraph} /></p>)}
    {actions.length > 0 && <ol>{actions.map((action, index) => <li key={index}><GuideInlineText value={action} /></li>)}</ol>}
  </div>;
}

/** Local-first help drawer. It remains useful offline and only calls the
 * connector when a question needs Copilot’s conversational reasoning. */
export function StudioGuide({ project, activeTab }: StudioGuideProps) {
  const context = useMemo(() => studioGuideContext(project, activeTab), [project, activeTab]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<StudioGuideMessage[]>(() => [studioGuideWelcome(context)]);
  const [question, setQuestion] = useState('');
  const [provider, setProvider] = useState<'copilot' | 'codex'>('copilot');
  const [isThinking, setIsThinking] = useState(false);
  const [referenceImage, setReferenceImage] = useState<StudioGuidePreparedImage | null>(null);
  const [outputImage, setOutputImage] = useState<StudioGuidePreparedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [visualReviewOpen, setVisualReviewOpen] = useState(false);
  const [visualMismatch, setVisualMismatch] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const outputInputRef = useRef<HTMLInputElement>(null);
  const retainedReference = activeFeatureForProject(project)?.referenceImages?.find((image) => image.url.startsWith('data:image/'));

  useEffect(() => {
    const openForQuestion = (event: Event) => {
      const request = event as CustomEvent<string>;
      setQuestion(sanitizeStudioGuideText(request.detail || 'Explain this issue and tell me the safest next step.'));
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener(STUDIO_GUIDE_REQUEST_EVENT, openForQuestion);
    return () => window.removeEventListener(STUDIO_GUIDE_REQUEST_EVENT, openForQuestion);
  }, []);

  const ask = async (rawQuestion: string) => {
    const cleaned = sanitizeStudioGuideText(rawQuestion);
    if (!cleaned || isThinking) return;
    setQuestion('');
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: cleaned, source: 'deterministic' }]);
    const deterministic = deterministicStudioGuideReply(cleaned, context);
    if (deterministic) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'guide', content: deterministic, source: 'deterministic' }]);
      return;
    }
    setIsThinking(true);
    try {
      const response = await configuredConnectorClient().studioGuideChat(project.importedRepo?.repoUrl || '', cleaned, context, provider);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'guide', content: response.answer, source: 'copilot', provider: response.provider }]);
    } catch (error) {
      const explanation = error instanceof Error ? error.message : 'Studio Guide could not reach the local Copilot session.';
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'guide', source: 'deterministic', content: `${explanation}\n\nYou can still use the current stage guidance above. No workflow state was changed.` }]);
    } finally { setIsThinking(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void ask(question); };
  const attachImage = async (role: StudioGuidePreparedImage['role'], file?: File | null) => {
    if (!file) return;
    setImageError(null);
    try {
      const image = await prepareStudioGuideImage(file, role);
      if (role === 'reference') setReferenceImage(image); else setOutputImage(image);
      setVisualReviewOpen(true);
    } catch (error) { setImageError(error instanceof Error ? error.message : 'Studio could not prepare that image.'); }
  };
  const useRetainedReference = async () => {
    if (!retainedReference) return;
    setImageError(null);
    try {
      setReferenceImage(await prepareRetainedStudioGuideImage(retainedReference.url, retainedReference.alt));
      setVisualReviewOpen(true);
    } catch (error) { setImageError(error instanceof Error ? error.message : 'Studio could not use the retained feature reference.'); }
  };
  const analyzeVisualMatch = async () => {
    if (!referenceImage || !outputImage || isThinking) { setImageError('Attach both the reference and the current output before visual review.'); return; }
    const visualQuestion = 'Compare the reference screen with the current output. State whether the result matches, then identify observable layout, hierarchy, grouping, density, typography, contrast, responsive, and missing/extra-content differences. Do not speculate about code or data sources. End exactly with “Delivered outcome:” followed by one concise, evidence-based paragraph (maximum 900 characters) suitable for an Outcome Refinery repair request.';
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: 'Analyze the attached reference and current-output screenshots for visual mismatch.', source: 'deterministic' }]);
    setIsThinking(true); setImageError(null);
    try {
      const response = await reviewStudioGuideImages(project.importedRepo?.repoUrl || '', visualQuestion, context, provider, [
        { role: 'reference', mimeType: 'image/jpeg', data: referenceImage.data },
        { role: 'output', mimeType: 'image/jpeg', data: outputImage.data },
      ]);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'guide', content: response.answer, source: 'copilot', provider: response.provider }]);
      setVisualMismatch(outcomeMismatchFromGuideReply(response.answer));
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'guide', source: 'deterministic', content: `${error instanceof Error ? error.message : 'Studio could not complete visual review.'}\n\nYour images remain only in this browser session; retry after confirming the selected local provider can inspect images.` }]);
    } finally { setIsThinking(false); }
  };
  const pasteImage = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const file = [...event.clipboardData.files].find((candidate) => candidate.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    void attachImage(referenceImage ? 'output' : 'reference', file);
  };

  return <>
    <button type="button" onClick={() => { setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0); }} className="studio-guide-trigger" aria-label="Open Kit Guide" title="Open Kit Guide">
      <Bot size={19} /><span>Kit Guide</span>
    </button>
    {open && <aside className="studio-guide" aria-label="Kit Guide" aria-live="polite">
      <header className="studio-guide__header">
        <div className="studio-guide__identity"><span className="studio-guide__mark"><Bot size={19} /></span><div><strong>Kit Guide</strong><span>Local, read-only assistance</span></div></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close Kit Guide"><X size={20} /></button>
      </header>
      <div className="studio-guide__trust"><ShieldCheck size={15} /> Token-light, read-only guidance · no chat history is resent</div>
      <div className="studio-guide__providers" aria-label="Assistant provider">
        <span>Ask with</span>
        <button type="button" className={provider === 'copilot' ? 'is-selected' : ''} onClick={() => setProvider('copilot')} disabled={isThinking}>GitHub Copilot</button>
        <button type="button" className={provider === 'codex' ? 'is-selected' : ''} onClick={() => setProvider('codex')} disabled={isThinking}>Codex</button>
      </div>
      <button type="button" className="studio-guide__refinery" onClick={() => { requestOutcomeRefinery(); setOpen(false); }}><Sparkles size={15} />Improve a delivered outcome</button>
      <section className="studio-guide__messages">
        {messages.map((message) => <div key={message.id} className={`studio-guide__message studio-guide__message--${message.role}`}><GuideMessageContent content={message.content} />{message.role === 'guide' && <small>{message.source === 'copilot' ? `Answered by your local signed-in ${message.provider === 'codex' ? 'Codex' : 'GitHub Copilot'} session` : 'Studio guidance'}</small>}</div>)}
        {isThinking && <div className="studio-guide__thinking"><LoaderCircle size={16} /> Thinking through the safest next step…</div>}
      </section>
      <div className="studio-guide__prompts">{prompts.map((prompt) => <button key={prompt} type="button" disabled={isThinking} onClick={() => void ask(prompt)}>{prompt}<ChevronRight size={13} /></button>)}</div>
      <details open={visualReviewOpen} onToggle={(event) => setVisualReviewOpen(event.currentTarget.open)} className="studio-guide__visual-review" aria-label="Visual match review">
        <summary>
          <span><strong>Compare screens</strong><small>{referenceImage || outputImage ? `${referenceImage ? 1 : 0} reference · ${outputImage ? 1 : 0} output attached` : 'Optional visual review'}</small></span>
          <ChevronRight size={16} aria-hidden="true" />
        </summary>
        <div className="studio-guide__visual-review-content">
          <p>Token-light chat by default. Images stay local until you explicitly request analysis.</p>
          {retainedReference && !referenceImage && <button type="button" className="studio-guide__use-retained-reference" onClick={() => void useRetainedReference()} disabled={isThinking}><ImagePlus size={15} />Use feature’s retained reference</button>}
          <div className="studio-guide__visual-slots">
          {([['reference', 'Reference', referenceImage, referenceInputRef, setReferenceImage], ['output', 'Current output', outputImage, outputInputRef, setOutputImage]] as const).map(([role, label, image, inputRef, setImage]) => <div className="studio-guide__visual-slot" key={role}>{image ? <><img src={image.dataUrl} alt={`${label} preview`} /><span>{label} · {image.width}×{image.height}</span><button type="button" onClick={() => setImage(null)} aria-label={`Remove ${label}`}><Trash2 size={13} /></button></> : <button type="button" onClick={() => inputRef.current?.click()} disabled={isThinking}><ImagePlus size={15} />{label}</button>}<input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void attachImage(role, event.target.files?.[0]); event.currentTarget.value = ''; }} /></div>)}
          </div>
          {imageError && <p role="alert">{imageError}</p>}
          <button type="button" onClick={() => void analyzeVisualMatch()} disabled={!referenceImage || !outputImage || isThinking}>Analyze visual match</button>
          {visualMismatch && <section className="studio-guide__mismatch-handoff" aria-label="Outcome Refinery mismatch handoff"><strong>Mismatch ready for Outcome Refinery</strong><p>{visualMismatch}</p><div><button type="button" onClick={() => void navigator.clipboard?.writeText(visualMismatch)}><Copy size={14} />Copy mismatch</button><button type="button" onClick={() => { sendMismatchToOutcomeRefinery(visualMismatch); setOpen(false); }}><Wand2 size={14} />Use in Outcome Refinery</button></div></section>}
        </div>
      </details>
      <form className="studio-guide__composer" onSubmit={submit}>
        <textarea ref={inputRef} value={question} maxLength={STUDIO_GUIDE_QUESTION_LIMIT} rows={2} onPaste={pasteImage} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask one focused question, or paste an image here…" aria-label="Ask Kit Guide" />
        <button type="submit" disabled={!question.trim() || isThinking} aria-label="Send question"><Send size={17} /></button>
      </form>
    </aside>}
  </>;
}
