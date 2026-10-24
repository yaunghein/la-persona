import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  CommunityAbout,
  CommunityInvitationPreview,
  CommunityMember,
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

/** Community profile: the settings form fields plus About page counts. */
export function useCommunityQuery(organizationSlug: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.detail(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<CommunityAbout>(
        `/api/organizations/${toValue(organizationSlug)}` as string
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
      $fetch<CommunityAbout>(
        `/api/organizations/${toValue(organizationSlug)}` as string,
        {
          method: 'PATCH',
          body: changes,
        }
      ),
    onSuccess: async (community) => {
      queryClient.setQueryData(
        organizationQueryKeys.detail(toValue(organizationSlug)),
        community
      );
      // Name and logo show up in the nav.
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.all,
      });
    },
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
