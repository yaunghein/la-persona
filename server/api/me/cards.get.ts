import { listCardsInWorkspace } from '~~/server/features/card/card.service';

/** Every card the caller holds across personal and community workspaces. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  return listCardsInWorkspace(principal.user.id);
});
