<script setup lang="ts">
const token = String(useRoute().params.id || '');
await navigateTo(ROUTES.INVITE.COMMUNITY_ACCEPT(token), { replace: true });
</script>
