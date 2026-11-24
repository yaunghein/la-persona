import { listCardsInWorkspace } from '~~/server/features/card/card.service';

/** Every card the caller holds across personal, community and company workspaces. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  return listCardsInWorkspace(principal.user.id);
});
