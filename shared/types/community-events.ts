import type { EventDTO } from '~~/shared/types/event';
import {
  eventStatus,
  formatEventDateLabel,
  formatEventDateValue,
  formatEventTimeValue,
} from '~~/shared/utils/event-datetime';

export type CommunityEventStatus = 'upcoming' | 'past';

export type CommunityEvent = {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  imageUrl: string;
  status: CommunityEventStatus;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coverUrl: string;
  photoUrls: string[];
};

export type CommunityEventsFilterOption = {
  label: string;
  value: string;
};

export type CommunityEventsData = {
  title: string;
  searchPlaceholder: string;
  statusOptions: CommunityEventsFilterOption[];
  infoItems: {
    icon: string;
    title: string;
    description: string;
  }[];
  events: CommunityEvent[];
};

export type CommunityEventFormValues = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coverUrl: string;
  photoUrls: string[];
  capacity: number | null;
};

export function toCommunityEvent(event: EventDTO): CommunityEvent {
  return {
    id: event.id,
    title: event.title,
    dateLabel: formatEventDateLabel(event.startsAt),
    location: event.location,
    imageUrl: event.coverUrl,
    status: eventStatus(event.endsAt),
    description: event.description ?? '',
    date: formatEventDateValue(event.startsAt),
    startTime: formatEventTimeValue(event.startsAt),
    endTime: formatEventTimeValue(event.endsAt),
    capacity: event.capacity,
    coverUrl: event.coverUrl,
    photoUrls: event.photoUrls ?? [],
  };
}
