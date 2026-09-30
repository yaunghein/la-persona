<script setup lang="ts">
const route = useRoute();
const id = String(route.params.id || '');

await navigateTo(id ? ROUTES.INVITE.CARD(id) : ROUTES.PLATFORM.ROOT, {
  replace: true,
});
</script>
