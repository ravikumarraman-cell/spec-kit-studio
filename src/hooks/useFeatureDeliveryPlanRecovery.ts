import { useEffect } from 'react';
import { FeatureInboxItem } from '../types/speckit';
import { configuredConnectorClient } from '../lib/connector';
import { getConnectorSessionToken } from '../lib/connectorSession';
import { deliveryPlanRepositoryPath, featureDeliveryPlanRecovery, FeatureDeliveryPlanRecovery } from '../lib/featureDeliveryReconciliation';

/** Keeps each delivery view synchronized with its authoritative plan artifact. */
export function useFeatureDeliveryPlanRecovery(
  feature: FeatureInboxItem | undefined,
  connectedRepositoryPath: string | undefined,
  onRecover: ((plan: FeatureDeliveryPlanRecovery) => void) | undefined,
) {
  useEffect(() => {
    const repositoryPath = deliveryPlanRepositoryPath(feature, connectedRepositoryPath);
    if (!feature || !repositoryPath || !onRecover) return;
    let active = true;
    configuredConnectorClient(getConnectorSessionToken()).readSpecKitArtifacts(repositoryPath)
      .then(({ artifacts }) => {
        const recovery = featureDeliveryPlanRecovery(feature, connectedRepositoryPath, artifacts);
        if (active && recovery) onRecover(recovery);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [feature?.id, feature?.deliveryPlan?.path, feature?.deliveryPlan?.content, feature?.deliveryPlan?.repositoryPath, feature?.worktreePath, connectedRepositoryPath, onRecover]);
}
