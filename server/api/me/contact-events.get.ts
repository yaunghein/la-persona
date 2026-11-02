import {
  listContactEventCollection,
  workspaceContactScope,
} from '~~/server/features/contact/contact.service';

/** Events that appear on contacts of any card the caller holds. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  return listContactEventCollection(
    await workspaceContactScope(principal.user.id)
  );
});
