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

    const leastPostLikes = getProfilesForEngagementDisplay(profiles, 'post_likes_least', '');
    const mostDirectMessages = getProfilesForEngagementDisplay(profiles, 'direct_messages_most', '');
    const searched = getProfilesForEngagementDisplay(profiles, 'all', 'user.11');

    expect(leastPostLikes[0].postLikes).toBeLessThanOrEqual(leastPostLikes[leastPostLikes.length - 1].postLikes);
    expect(mostDirectMessages[0].directMessagesSent + mostDirectMessages[0].directMessagesReceived)
      .toBeGreaterThanOrEqual(mostDirectMessages[mostDirectMessages.length - 1].directMessagesSent
        + mostDirectMessages[mostDirectMessages.length - 1].directMessagesReceived);
    expect(searched).toHaveLength(1);
    expect(searched[0].username).toBe('user.11');
  });
});
