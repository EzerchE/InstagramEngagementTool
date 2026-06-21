import { describe, expect, it } from 'vitest';
import {
  postSnapshotFromResponses,
  storySnapshotFromResponses,
} from './instagram-engagement-adapters';

describe('instagram engagement adapters', () => {
  it('builds post snapshots from GraphQL-style liker edges and REST-style commenters', () => {
    const snapshot = postSnapshotFromResponses(
      'media-1',
      1700000000000,
      {
        edges: [
          { node: { id: '1', username: 'edge.liker' } },
          { node: { pk: 2, username: 'numeric.pk' } },
        ],
      },
      {
        users: [
          { user_id: '3', username: 'commenter.one' },
          { id: 'missing-username' },
        ],
      },
    );

    expect(snapshot).toEqual({
      mediaId: 'media-1',
      observedAt: 1700000000000,
      likedBy: [
        { userId: '1', username: 'edge.liker' },
        { userId: '2', username: 'numeric.pk' },
      ],
      commentedBy: [
        { userId: '3', username: 'commenter.one' },
      ],
    });
  });

  it('builds story snapshots from viewer and reaction containers', () => {
    const snapshot = storySnapshotFromResponses(
      'story-1',
      1700000000000,
      {
        viewers: [
          { user: { id: '1', username: 'viewer.one' } },
        ],
      },
      {
        reactions: [
          { node: { id: '2', username: 'reaction.one' } },
        ],
      },
    );

    expect(snapshot.viewedBy).toEqual([
      { userId: '1', username: 'viewer.one' },
    ]);
    expect(snapshot.reactedBy).toEqual([
      { userId: '2', username: 'reaction.one' },
    ]);
  });

  it('ignores malformed actors instead of producing partial signals', () => {
    const snapshot = postSnapshotFromResponses(
      'media-1',
      1700000000000,
      {
        users: [
          null,
          { id: '1' },
          { username: 'missing.id' },
          { id: '2', username: 'valid.user' },
        ],
      },
      {},
    );

    expect(snapshot.likedBy).toEqual([
      { userId: '2', username: 'valid.user' },
    ]);
    expect(snapshot.commentedBy).toEqual([]);
  });
});
