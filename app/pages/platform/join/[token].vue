<script setup lang="ts">
const token = String(useRoute().params.token || '');
await navigateTo(ROUTES.INVITE.COMMUNITY_JOIN(token), { replace: true });
</script>
