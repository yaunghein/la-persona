import type { RecordCardInteractionRequest } from '~~/shared/contracts/analytics';

/**
 * Records a public card interaction. Fire-and-forget: analytics must never
 * block or break the visitor's experience.
 */
export function recordCardInteraction(cardSlug: string, interaction: RecordCardInteractionRequest) {
  $fetch(`/api/public/cards/${cardSlug}/interactions`, {
    method: 'POST',
    body: interaction,
  }).catch(() => undefined);
}
