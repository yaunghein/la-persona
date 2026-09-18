import type {
  EventDTO,
  EventListItemDTO,
  ViewerRegistrationStatus,
} from '~~/shared/types/event';
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
  registrationMode: EventDTO['registrationMode'];
  approvalMode: EventDTO['approvalMode'];
  registeredCount: number;
  viewerRegistrationStatus: ViewerRegistrationStatus;
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
  registrationMode: EventDTO['registrationMode'];
  approvalMode: EventDTO['approvalMode'];
};

export function toCommunityEvent(event: EventListItemDTO): CommunityEvent {
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
    registrationMode: event.registrationMode,
    approvalMode: event.approvalMode,
    registeredCount: event.registeredCount,
    viewerRegistrationStatus: event.viewerRegistrationStatus,
  };
}
