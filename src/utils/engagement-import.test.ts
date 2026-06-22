import { describe, expect, it } from 'vitest';
import { buildEngagementProfilesFromImport } from './engagement-import';

describe('engagement import', () => {
  it('builds profiles from normalized snapshots and included quiet subjects', () => {
    const result = buildEngagementProfilesFromImport(JSON.stringify({
      subjects: [
        { userId: '1', username: 'active.one', fullName: 'Active One' },
        { userId: '2', username: 'quiet.one', fullName: 'Quiet One' },
      ],
      posts: [
        {
          mediaId: 'post-1',
          observedAt: 1700000000000,
          likedBy: [{ userId: '1', username: 'active.one' }],
          commentedBy: [{ userId: '1', username: 'active.one' }],
        },
      ],
      stories: [
        {
          storyId: 'story-1',
          observedAt: 1700000001000,
          viewedBy: [{ userId: '1', username: 'active.one' }],
          reactedBy: [],
        },
      ],
      messages: [
        {
          threadId: 'thread-1',
          observedAt: 1700000001500,
          sentTo: [{ userId: '2', username: 'quiet.one' }],
          receivedFrom: [{ userId: '1', username: 'active.one' }],
        },
      ],
      sampleWindow: {
        sampledPosts: 3,
        sampledStories: 3,
      },
    }), 1700000002000);

    const active = result.profiles.find(profile => profile.username === 'active.one');
    const quiet = result.profiles.find(profile => profile.username === 'quiet.one');

    expect(result.sampleWindow.sampledPosts).toBe(3);
    expect(result.signals).toHaveLength(5);
    expect(active?.postLikes).toBe(1);
    expect(active?.postComments).toBe(1);
    expect(active?.storyViews).toBe(1);
    expect(active?.directMessagesReceived).toBe(1);
    expect(quiet?.unansweredMessages).toBe(1);
    expect(quiet?.recommendation).toBe('low_interest');
  });

  it('accepts raw response containers and derives subjects from actors', () => {
    const result = buildEngagementProfilesFromImport(JSON.stringify({
      posts: [
        {
          mediaId: 'post-1',
          likedByResponse: { users: [{ id: '1', username: 'liker.one' }] },
          commentedByResponse: { edges: [{ node: { id: '2', username: 'commenter.one' } }] },
        },
      ],
      stories: [
        {
          storyId: 'story-1',
          viewedByResponse: { viewers: [{ pk: '3', username: 'viewer.one' }] },
          reactedByResponse: { reactions: [{ user_id: '4', username: 'reactor.one' }] },
        },
      ],
    }), 1700000000000);

    expect(result.profiles.map(profile => profile.username).sort()).toEqual([
      'commenter.one',
      'liker.one',
      'reactor.one',
      'viewer.one',
    ]);
  });

  it('rejects payloads without subjects or actors', () => {
    expect(() => buildEngagementProfilesFromImport(JSON.stringify({ posts: [] })))
      .toThrow('at least one subject or engagement actor');
  });
});
