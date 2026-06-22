import { describe, expect, it } from 'vitest';
import { Typename, UserNode } from '../model/user';
import { buildPreviewEngagementProfiles, getProfilesForEngagementDisplay } from './engagement-preview';

const user = (id: string, username: string): UserNode => ({
  id,
  username,
  full_name: username,
  profile_pic_url: `${username}.jpg`,
  is_private: false,
  is_verified: false,
  followed_by_viewer: true,
  follows_viewer: true,
  requested_by_viewer: false,
  reel: {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: `${username}.jpg`,
      username,
    },
  },
});

describe('engagement preview', () => {
  it('builds ranked fixture profiles without live Instagram data', () => {
    const users = Array.from({ length: 12 }, (_, index) => user(`${index + 1}`, `user.${index + 1}`));

    const result = buildPreviewEngagementProfiles(users, 1700000000000);

    expect(result.sampleWindow.sampledPosts).toBe(4);
    expect(result.sampleWindow.sampledStories).toBe(4);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.profiles).toHaveLength(12);
    expect(result.profiles[0].score).toBeGreaterThan(result.profiles[1].score);
  });

  it('filters profiles by segment and search term', () => {
    const users = Array.from({ length: 12 }, (_, index) => user(`${index + 1}`, `user.${index + 1}`));
    const { profiles } = buildPreviewEngagementProfiles(users, 1700000000000);

    const possibleMuted = getProfilesForEngagementDisplay(profiles, 'possible_muted', '');
    const nonFollowerWatchers = getProfilesForEngagementDisplay(profiles, 'non_follower_watchers', '');
    const searched = getProfilesForEngagementDisplay(profiles, 'all', 'user.11');

    expect(possibleMuted.every(profile => profile.recommendation === 'possible_muted')).toBe(true);
    expect(nonFollowerWatchers.every(profile => profile.relationshipKnown && !profile.followsViewer)).toBe(true);
    expect(nonFollowerWatchers.every(profile =>
      profile.storyViews + profile.storyReactions + profile.postLikes + profile.postComments + profile.profileObservations > 0)).toBe(true);
    expect(searched).toHaveLength(1);
    expect(searched[0].username).toBe('user.11');
  });
});
