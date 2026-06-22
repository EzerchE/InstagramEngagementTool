import { EngagementProfile, EngagementSampleWindow, EngagementSignal, EngagementSubject } from '../model/engagement';
import {
  DirectMessageSnapshot,
  PostEngagementSnapshot,
  ProfileObservationSnapshot,
  StoryEngagementSnapshot,
} from '../model/engagement-source';
import { UserNode } from '../model/user';
import {
  collectPostEngagementSignals,
  collectDirectMessageSignals,
  collectProfileObservationSignals,
  collectStoryEngagementSignals,
  dedupeEngagementSignals,
} from './engagement-collectors';
import { buildEngagementProfile } from './engagement-score';

const toSubject = (user: UserNode): EngagementSubject => ({
  userId: user.id,
  username: user.username,
  fullName: user.full_name,
  relationshipKnown: true,
  followsViewer: user.follows_viewer,
  followedByViewer: user.followed_by_viewer,
  isPrivate: user.is_private,
  isVerified: user.is_verified,
});

export const getProfilesForEngagementDisplay = (
  profiles: readonly EngagementProfile[],
  currentTab:
    | 'all'
    | 'top_supporters'
    | 'post_likes_most'
    | 'post_likes_least'
    | 'direct_messages_most'
    | 'direct_unanswered'
    | 'story_reactions_most'
    | 'story_reactions_least'
    | 'low_interest'
    | 'known_non_followers',
  searchTerm: string,
): readonly EngagementProfile[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const getDirectMessageCount = (profile: EngagementProfile): number =>
    profile.directMessagesSent + profile.directMessagesReceived;

  return [...profiles]
    .filter(profile => {
      switch (currentTab) {
        case 'all':
          return true;
        case 'top_supporters':
          return profile.recommendation === 'keep';
        case 'post_likes_most':
          return profile.sampledPosts > 0 && profile.postLikes > 0;
        case 'post_likes_least':
          return profile.sampledPosts > 0;
        case 'direct_messages_most':
          return getDirectMessageCount(profile) > 0;
        case 'direct_unanswered':
          return profile.unansweredMessages > 0;
        case 'story_reactions_most':
          return profile.sampledStories > 0 && profile.storyReactions > 0;
        case 'story_reactions_least':
          return profile.sampledStories > 0;
        case 'low_interest':
          return profile.recommendation === 'low_interest' || profile.recommendation === 'review';
        case 'known_non_followers':
          return profile.relationshipKnown
            && !profile.followsViewer
            && profile.storyViews + profile.storyReactions + profile.postLikes + profile.postComments + profile.profileObservations > 0;
      }
    })
    .filter(profile => normalizedSearch === ''
      || profile.username.toLowerCase().includes(normalizedSearch)
      || profile.fullName.toLowerCase().includes(normalizedSearch))
    .sort((a, b) => {
      switch (currentTab) {
        case 'post_likes_most':
          return b.postLikes - a.postLikes || b.postComments - a.postComments || b.score - a.score || a.username.localeCompare(b.username);
        case 'post_likes_least':
          return a.postLikes - b.postLikes || a.postComments - b.postComments || a.score - b.score || a.username.localeCompare(b.username);
        case 'direct_messages_most':
          return getDirectMessageCount(b) - getDirectMessageCount(a)
            || b.directMessagesReceived - a.directMessagesReceived
            || a.username.localeCompare(b.username);
        case 'direct_unanswered':
          return b.unansweredMessages - a.unansweredMessages
            || b.directMessagesSent - a.directMessagesSent
            || a.username.localeCompare(b.username);
        case 'story_reactions_most':
          return b.storyReactions - a.storyReactions || b.storyViews - a.storyViews || b.score - a.score || a.username.localeCompare(b.username);
        case 'story_reactions_least':
          return a.storyReactions - b.storyReactions || a.storyViews - b.storyViews || a.score - b.score || a.username.localeCompare(b.username);
        case 'all':
        case 'top_supporters':
        case 'low_interest':
        case 'known_non_followers':
          return b.score - a.score || a.username.localeCompare(b.username);
      }
    });
};

export const buildPreviewEngagementProfiles = (
  users: readonly UserNode[],
  now = Date.now(),
): {
  readonly profiles: readonly EngagementProfile[];
  readonly signals: readonly EngagementSignal[];
  readonly sampleWindow: EngagementSampleWindow;
} => {
  const sampleWindow: EngagementSampleWindow = {
    sampledPosts: 4,
    sampledStories: 4,
    observedSince: now - 1000 * 60 * 60 * 24 * 14,
    observedUntil: now,
  };

  const postSnapshots: readonly PostEngagementSnapshot[] = [
    {
      mediaId: 'preview-post-1',
      observedAt: now - 1000 * 60 * 60 * 24 * 10,
      likedBy: [users[0], users[2], users[4], users[6]].filter(Boolean).map(toSubject),
      commentedBy: [users[0], users[6]].filter(Boolean).map(toSubject),
    },
    {
      mediaId: 'preview-post-2',
      observedAt: now - 1000 * 60 * 60 * 24 * 7,
      likedBy: [users[0], users[2], users[5], users[8]].filter(Boolean).map(toSubject),
      commentedBy: [users[2]].filter(Boolean).map(toSubject),
    },
    {
      mediaId: 'preview-post-3',
      observedAt: now - 1000 * 60 * 60 * 24 * 4,
      likedBy: [users[0], users[4], users[6], users[9]].filter(Boolean).map(toSubject),
      commentedBy: [users[9]].filter(Boolean).map(toSubject),
    },
    {
      mediaId: 'preview-post-4',
      observedAt: now - 1000 * 60 * 60 * 24,
      likedBy: [users[0], users[2], users[4], users[6], users[9]].filter(Boolean).map(toSubject),
      commentedBy: [users[0], users[4]].filter(Boolean).map(toSubject),
    },
  ];

  const storySnapshots: readonly StoryEngagementSnapshot[] = [
    {
      storyId: 'preview-story-1',
      observedAt: now - 1000 * 60 * 60 * 24 * 9,
      viewedBy: [users[0], users[2], users[4], users[6], users[9]].filter(Boolean).map(toSubject),
      reactedBy: [users[0]].filter(Boolean).map(toSubject),
    },
    {
      storyId: 'preview-story-2',
      observedAt: now - 1000 * 60 * 60 * 24 * 6,
      viewedBy: [users[0], users[2], users[4], users[6]].filter(Boolean).map(toSubject),
      reactedBy: [users[2]].filter(Boolean).map(toSubject),
    },
    {
      storyId: 'preview-story-3',
      observedAt: now - 1000 * 60 * 60 * 24 * 3,
      viewedBy: [users[0], users[4], users[6], users[9]].filter(Boolean).map(toSubject),
      reactedBy: [users[4]].filter(Boolean).map(toSubject),
    },
    {
      storyId: 'preview-story-4',
      observedAt: now - 1000 * 60 * 60 * 8,
      viewedBy: [users[0], users[2], users[6], users[9]].filter(Boolean).map(toSubject),
      reactedBy: [users[6]].filter(Boolean).map(toSubject),
    },
  ];

  const directMessageSnapshots: readonly DirectMessageSnapshot[] = [
    {
      threadId: 'preview-dm-close-friends',
      observedAt: now - 1000 * 60 * 60 * 18,
      sentTo: [users[0], users[2]].filter(Boolean).map(toSubject),
      receivedFrom: [users[0], users[0], users[2]].filter(Boolean).map(toSubject),
    },
    {
      threadId: 'preview-dm-unanswered',
      observedAt: now - 1000 * 60 * 60 * 6,
      sentTo: [users[5], users[5], users[8]].filter(Boolean).map(toSubject),
      receivedFrom: [],
    },
  ];

  const profileObservationSnapshots: readonly ProfileObservationSnapshot[] = [
    {
      sourceId: 'preview-profile-visit-window',
      observedAt: now - 1000 * 60 * 60 * 12,
      observedUsers: [users[10]].filter(Boolean).map(toSubject),
    },
  ];

  const signals = dedupeEngagementSignals([
    ...collectPostEngagementSignals(postSnapshots),
    ...collectStoryEngagementSignals(storySnapshots),
    ...collectDirectMessageSignals(directMessageSnapshots),
    ...collectProfileObservationSignals(profileObservationSnapshots),
  ]);

  return {
    sampleWindow,
    signals,
    profiles: users.map(user => buildEngagementProfile(toSubject(user), signals, sampleWindow)),
  };
};
