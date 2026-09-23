/**
 * A feature is scoped to the workspace from which intake was opened. New
 * workspaces belong to the explicit project/repository setup flows; feature
 * intake must not unexpectedly change the user's workspace.
 */
export function featureImportDestination(hasActiveWorkspace: boolean, canMerge: boolean): 'active-workspace' | 'new-workspace' {
  return hasActiveWorkspace && canMerge ? 'active-workspace' : 'new-workspace';
}
