export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useSession();
  if (!session.value && to.path.startsWith(ROUTES.platform.root)) {
    return navigateTo({
      path: ROUTES.signIn,
      query: {
        redirectTo: to.fullPath,
      },
    });
  }
});
