import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  CommunityAbout,
  CommunityInvitationPreview,
  CommunityMember,
  CommunitySettings,
  CreateInvitationRequest,
  InvitationReviewResult,
  JoinLink,
  JoinLinkPreview,
  MembershipResult,
  ReviewInvitationRequest,
  UpdateCommunitySettingsRequest,
  UpdateMemberRequest,
} from '~~/shared/contracts/organization';
import { organizationQueryKeys } from '~/features/organization/composables/use-user-organizations';

const organizationUrl = (organizationSlug: string, path: string): string =>
  `/api/organizations/${organizationSlug}/${path}`;

export function useCommunityRosterQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.members(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<Collection<CommunityMember>>(
        organizationUrl(toValue(organizationSlug), 'members')
      ),
    select: (collection) => collection.items,
    enabled: () => !!toValue(organizationSlug),
  });
}

export function useJoinLinkQuery(organizationSlug: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.joinLink(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<JoinLink>(organizationUrl(toValue(organizationSlug), 'join-link')),
    enabled: () => !!toValue(organizationSlug),
  });
}

/** Issues a new join link; previously shared links stop working. */
export function useRotateJoinLinkMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      $fetch<JoinLink>(
        organizationUrl(toValue(organizationSlug), 'join-link'),
        {
          method: 'POST',
        }
      ),
    onSuccess: (joinLink) =>
      queryClient.setQueryData(
        organizationQueryKeys.joinLink(toValue(organizationSlug)),
        joinLink
      ),
  });
}

function useInvalidateRoster(organizationSlug: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: organizationQueryKeys.members(toValue(organizationSlug)),
    });
}

export function useInviteMemberMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateRoster = useInvalidateRoster(organizationSlug);
  return useMutation({
    mutationFn: (request: CreateInvitationRequest) =>
      $fetch<{ id: string }>(
        organizationUrl(toValue(organizationSlug), 'invitations'),
        {
          method: 'POST',
          body: request,
        }
      ),
    onSuccess: invalidateRoster,
  });
}

export function useUpdateMemberRoleMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateRoster = useInvalidateRoster(organizationSlug);
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: { memberId: string } & UpdateMemberRequest) =>
      $fetch<unknown>(`/api/members/${memberId}` as string, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: invalidateRoster,
  });
}

export function useRemoveMemberMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateRoster = useInvalidateRoster(organizationSlug);
  return useMutation({
    mutationFn: (memberId: string) =>
      $fetch<unknown>(`/api/members/${memberId}` as string, {
        method: 'DELETE',
      }),
    onSuccess: invalidateRoster,
  });
}

/** Manager approves (adds/resends) or cancels a pending email invitation. */
export function useReviewInvitationMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateRoster = useInvalidateRoster(organizationSlug);
  return useMutation({
    mutationFn: ({
      invitationId,
      status,
    }: { invitationId: string } & ReviewInvitationRequest) =>
      $fetch<InvitationReviewResult>(
        `/api/invitations/${invitationId}` as string,
        {
          method: 'PATCH',
          body: { status },
        }
      ),
    onSuccess: invalidateRoster,
  });
}

export function useCommunitySettingsQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.settings(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<CommunitySettings>(
        organizationUrl(toValue(organizationSlug), 'settings')
      ),
    enabled: () => !!toValue(organizationSlug),
  });
}

export function useUpdateCommunitySettingsMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UpdateCommunitySettingsRequest) =>
      $fetch<CommunitySettings>(
        organizationUrl(toValue(organizationSlug), 'settings'),
        {
          method: 'PATCH',
          body: changes,
        }
      ),
    onSuccess: async (settings) => {
      queryClient.setQueryData(
        organizationQueryKeys.settings(toValue(organizationSlug)),
        settings
      );
      // Name and logo show up in the nav and the about page.
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.all,
      });
    },
  });
}

export function useCommunityAboutQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.about(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<CommunityAbout>(
        organizationUrl(toValue(organizationSlug), 'about')
      ),
    enabled: () => !!toValue(organizationSlug),
  });
}

export function useInvitationPreviewQuery(
  invitationId: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.invitation(toValue(invitationId))
    ),
    queryFn: () =>
      $fetch<CommunityInvitationPreview>(
        `/api/invitations/${toValue(invitationId)}` as string
      ),
    enabled: () => !!toValue(invitationId),
    retry: false,
  });
}

/** The invitee accepts their invitation. */
export function useAcceptInvitationMutation(
  invitationId: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      $fetch<InvitationReviewResult>(
        `/api/invitations/${toValue(invitationId)}` as string,
        {
          method: 'PATCH',
          body: { status: 'accepted' } satisfies ReviewInvitationRequest,
        }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all }),
  });
}

export function fetchJoinLinkPreview(token: string) {
  return $fetch<JoinLinkPreview>(`/api/public/join-links/${token}` as string);
}

export function useJoinCommunityMutation(token: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      $fetch<MembershipResult>(
        `/api/join-links/${toValue(token)}/members` as string,
        {
          method: 'POST',
        }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all }),
  });
}
