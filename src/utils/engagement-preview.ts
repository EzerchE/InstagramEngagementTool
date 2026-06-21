import { EngagementProfile, EngagementSampleWindow, EngagementSignal, EngagementSubject } from '../model/engagement';
import { PostEngagementSnapshot, ProfileObservationSnapshot, StoryEngagementSnapshot } from '../model/engagement-source';
import { UserNode } from '../model/user';
import {
  collectPostEngagementSignals,
  collectProfileObservationSignals,
  collectStoryEngagementSignals,
  dedupeEngagementSignals,
} from './engagement-collectors';
import { buildEngagementProfile } from './engagement-score';

const toSubject = (user: UserNode): EngagementSubject => ({
  userId: user.id,
  username: user.username,
  fullName: user.full_name,
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
    | 'low_interest'
    | 'possible_muted'
    | 'possible_watchers'
    | 'non_follower_watchers',
  searchTerm: string,
): readonly EngagementProfile[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return [...profiles]
    .filter(profile => {
      switch (currentTab) {
        case 'all':
          return true;
        case 'top_supporters':
          return profile.recommendation === 'keep';
        case 'low_interest':
          return profile.recommendation === 'low_interest' || profile.recommendation === 'review';
        case 'possible_muted':
          return profile.recommendation === 'possible_muted';
        case 'possible_watchers':
          return profile.recommendation === 'possible_watcher';
        case 'non_follower_watchers':
          return !profile.followsViewer
            && profile.storyViews + profile.storyReactions + profile.postLikes + profile.postComments + profile.profileObservations > 0;
      }
    })
    .filter(profile => normalizedSearch === ''
      || profile.username.toLowerCase().includes(normalizedSearch)
      || profile.fullName.toLowerCase().includes(normalizedSearch))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
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
    ...collectProfileObservationSignals(profileObservationSnapshots),
  ]);

  return {
    sampleWindow,
    signals,
    profiles: users.map(user => buildEngagementProfile(toSubject(user), signals, sampleWindow)),
  };
};
