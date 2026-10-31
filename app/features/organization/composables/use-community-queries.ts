import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  CommunityAbout,
  CommunityInvitationPreview,
  CommunityMember,
  CreateInvitationRequest,
  InvitationInvitee,
  InvitationReviewResult,
  JoinLink,
  MembershipResult,
  ReviewInvitationRequest,
  UpdateCommunitySettingsRequest,
  UpdateMemberRequest,
} from '~~/shared/contracts/organization';
import { eventQueryKeys } from '~/features/event/composables/use-event-queries';
import { organizationQueryKeys } from '~/features/organization/composables/use-user-organizations';
import { parseInvitePath } from '~~/shared/utils/routes';

const organizationUrl = (organizationSlug: string, path: string): string =>
  `/api/organizations/${organizationSlug}/${path}`;

export function useCommunityMembersQuery(
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

function useInvalidateMembers(organizationSlug: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: organizationQueryKeys.members(toValue(organizationSlug)),
    });
}

export function useInviteMemberMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateMembers = useInvalidateMembers(organizationSlug);
  return useMutation({
    mutationFn: (request: CreateInvitationRequest) =>
      $fetch<{ id: string }>(
        organizationUrl(toValue(organizationSlug), 'invitations'),
        {
          method: 'POST',
          body: request,
        }
      ),
    onSuccess: invalidateMembers,
  });
}

export function useUpdateMemberRoleMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateMembers = useInvalidateMembers(organizationSlug);
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: { memberId: string } & UpdateMemberRequest) =>
      $fetch<unknown>(`/api/members/${memberId}` as string, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: invalidateMembers,
  });
}

export function useRemoveMemberMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateMembers = useInvalidateMembers(organizationSlug);
  return useMutation({
    mutationFn: (memberId: string) =>
      $fetch<unknown>(`/api/members/${memberId}` as string, {
        method: 'DELETE',
      }),
    onSuccess: invalidateMembers,
  });
}

/** Manager approves (adds/resends) or cancels a pending email invitation. */
export function useReviewInvitationMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateMembers = useInvalidateMembers(organizationSlug);
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
    onSuccess: invalidateMembers,
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
      // Name and logo show up in the nav; the event list carries the contact organizer.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: eventQueryKeys.all }),
      ]);
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

export function useInviteeEmailQuery(invitePath: MaybeRefOrGetter<string>) {
  const invite = computed(() => parseInvitePath(toValue(invitePath)));
  return useQuery({
    queryKey: computed(() =>
      organizationQueryKeys.invitee(toValue(invitePath))
    ),
    queryFn: () => {
      const { kind, id } = invite.value!;
      const collection =
        kind === 'card' ? 'onboarding-invitations' : 'invitations';
      return $fetch<InvitationInvitee>(
        `/api/public/${collection}/${id}` as string
      );
    },
    enabled: () => !!invite.value,
    select: (invitee) => invitee.email,
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
