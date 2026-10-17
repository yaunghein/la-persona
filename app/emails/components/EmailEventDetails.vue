<script setup lang="ts">
import { computed } from 'vue';
import { bodyStyle, emailAsset, ink, titleStyle } from './email-styles';

const props = defineProps<{
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  directionsUrl?: string | null;
  assetBaseUrl: string;
}>();

// Narrow columns: keep "11 November" and "1 PM" together so they never split.
const details = computed(() => [
  {
    icon: 'email-icon-calendar.png',
    label: 'Date',
    value: props.eventDate.replace(/^(\d+) /, '$1\u00A0'),
  },
  {
    icon: 'email-icon-clock.png',
    label: 'Time',
    value: props.eventTime.replace(/ (AM|PM)/g, '\u00A0$1'),
  },
  {
    icon: 'email-icon-location.png',
    label: 'Location',
    value: props.eventLocation,
  },
]);
</script>

<template>
  <EContainer style="text-align: center">
    <EText :style="titleStyle"><strong>Event</strong> Details</EText>
    <ERow style="margin-top: 20px">
      <EColumn
        v-for="detail in details"
        :key="detail.label"
        style="
          width: 33%;
          padding: 0 6px;
          vertical-align: top;
          text-align: center;
        "
      >
        <EImg
          :src="emailAsset(assetBaseUrl, detail.icon)"
          alt=""
          width="32"
          height="32"
          style="display: block; margin: 0 auto 10px"
        />
        <EText
          :style="`${bodyStyle}; font-weight: 500; text-transform: uppercase`"
        >
          {{ detail.value }}
        </EText>
      </EColumn>
    </ERow>
    <EText v-if="directionsUrl" style="margin: 20px 0 0">
      <ELink
        :href="directionsUrl"
        target="_blank"
        :style="`font-size: 12px; font-weight: 500; letter-spacing: 1.2px; text-decoration: underline; ${ink}`"
      >
        Get&nbsp;Directions
      </ELink>
    </EText>
  </EContainer>
</template>
