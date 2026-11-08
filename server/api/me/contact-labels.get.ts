import { listContactLabels } from '~~/server/features/contact/contact-label.repository';
import type { Collection } from '~~/shared/contracts/collection';
import type { LabelSummary } from '~~/shared/contracts/label';

/** The caller's own contact labels, oldest first, with how many contacts carry each. */
export default defineEventHandler(
  async (event): Promise<Collection<LabelSummary>> => {
    const principal = requirePrincipal(event);
    return { items: await listContactLabels(principal.user.id) };
  }
);
