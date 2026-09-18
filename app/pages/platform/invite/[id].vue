<script setup lang="ts">
const token = String(useRoute().params.id || '');
await navigateTo(ROUTES.INVITE.CARD(token), { replace: true });
</script>
