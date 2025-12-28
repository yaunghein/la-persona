export default defineNuxtRouteMiddleware(async (to, from) => {
  const { data: session } = await useSession();
  if (session.value) {
    if (to.path === ROUTES.signIn) {
      return navigateTo(ROUTES.platform.root);
    }
  }
});
