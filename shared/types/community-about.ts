import { toCommunitySettingsDTO } from './community-settings';

export type CommunityAboutDTO = ReturnType<typeof toCommunitySettingsDTO> & {
  memberCount: number;
  eventCount: number;
  foundedYear: number;
};
