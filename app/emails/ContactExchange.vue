<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailDetails from './components/EmailDetails.vue';
import EmailLayout from './components/EmailLayout.vue';

const props = defineProps<{
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  contactsUrl: string;
}>();

const rows = [
  { label: 'Name', value: props.name },
  { label: 'Company', value: props.company },
  { label: 'Role / Position', value: props.position },
  { label: 'Email', value: props.email },
  { label: 'Phone', value: props.phone },
];
</script>

<template>
  <EmailLayout
    :preview="`${props.name || 'Someone'} exchanged contacts with you`"
  >
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      NEW CONNECTION
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      You exchanged contact information via your
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong> digital card.
      Here are the details of your new&nbsp;connection.
    </EText>

    <EmailDetails :rows="rows" />

    <EmailButton :href="props.contactsUrl">MANAGE CONTACTS</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EText style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666">
      This contact is saved to your LA&nbsp;PERSONA contacts, so you can find
      and follow up with them&nbsp;anytime.
    </EText>
  </EmailLayout>
</template>
