<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailLayout from './components/EmailLayout.vue';

const props = defineProps<{
  recipientName: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  cardUrl: string;
}>();

const rows = [
  { label: 'Name', value: props.name },
  { label: 'Position', value: props.position },
  { label: 'Company', value: props.company },
  { label: 'Email', value: props.email },
  { label: 'Phone', value: props.phone },
];
</script>

<template>
  <EmailLayout :preview="`${props.name}'s contact details`">
    <EText style="margin: 0; line-height: 1.5">
      Hi {{ props.recipientName }},
    </EText>
    <EText style="margin: 16px 0 0; line-height: 1.5">
      Thanks for your interest in connecting with
      <strong>{{ props.name }}</strong
      >!
    </EText>
    <EText style="margin: 16px 0 0; line-height: 1.5">
      Here are their contact details so you can easily get in&nbsp;touch.
    </EText>

    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      style="margin: 24px 0; border-collapse: collapse"
    >
      <tr v-for="row in rows" :key="row.label">
        <td
          style="
            padding: 4px 16px 4px 0;
            font-weight: 700;
            white-space: nowrap;
            vertical-align: top;
          "
        >
          {{ row.label }}:
        </td>
        <td style="padding: 4px 0; vertical-align: top; word-break: break-word">
          {{ row.value || 'N/A' }}
        </td>
      </tr>
    </table>

    <EText style="margin: 0; line-height: 1.5; font-weight: 600">
      Want to learn more about&nbsp;them?
    </EText>
    <EText style="margin: 8px 0 0; line-height: 1.5">
      View their LA&nbsp;PERSONA digital card to explore their profile, social
      links, and other contact&nbsp;information.
    </EText>

    <EmailButton :href="props.cardUrl">VIEW PERSONA CARD</EmailButton>

    <EText style="margin: 0; line-height: 1.5">
      Looking forward to helping you make meaningful&nbsp;connections!
    </EText>
  </EmailLayout>
</template>
