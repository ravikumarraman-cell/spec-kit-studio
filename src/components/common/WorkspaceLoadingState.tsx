export function WorkspaceLoadingState() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading workspace"
      className="workspace-loading-state rounded-2xl border p-5 sm:p-6"
    >
      <div className="workspace-loading-state__line workspace-loading-state__line--title" />
      <div className="workspace-loading-state__line workspace-loading-state__line--body" />
      <div className="workspace-loading-state__grid mt-6">
        <div className="workspace-loading-state__card" />
        <div className="workspace-loading-state__card" />
      </div>
      <span className="sr-only">Loading workspace content.</span>
    </section>
  );
}
