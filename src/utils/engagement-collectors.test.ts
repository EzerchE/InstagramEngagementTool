import { describe, expect, it } from 'vitest';
import {
  collectDirectMessageSignals,
  collectPostEngagementSignals,
  collectProfileObservationSignals,
  collectStoryEngagementSignals,
} from './engagement-collectors';

const actor = (userId: string, username: string) => ({
  userId,
  username,
});

describe('engagement collectors', () => {
  it('normalizes post likes and comments into engagement signals', () => {
    const signals = collectPostEngagementSignals([
      {
        mediaId: 'post-1',
        observedAt: 1700000000000,
        likedBy: [actor('1', 'liker.one')],
        commentedBy: [actor('2', 'commenter.one')],
      },
    ]);

    expect(signals).toEqual([
      {
        userId: '1',
        username: 'liker.one',
        type: 'post_like',
        sourceId: 'post-1',
        observedAt: 1700000000000,
      },
      {
        userId: '2',
        username: 'commenter.one',
        type: 'post_comment',
        sourceId: 'post-1',
        observedAt: 1700000000000,
      },
    ]);
  });

  it('deduplicates repeated actors for the same source and signal type', () => {
    const signals = collectPostEngagementSignals([
      {
        mediaId: 'post-1',
        observedAt: 1700000000000,
        likedBy: [actor('1', 'same.user'), actor('1', 'same.user')],
        commentedBy: [],
      },
    ]);

    expect(signals).toHaveLength(1);
  });

  it('normalizes story views and reactions separately', () => {
    const signals = collectStoryEngagementSignals([
      {
        storyId: 'story-1',
        observedAt: 1700000000000,
        viewedBy: [actor('1', 'viewer.one')],
        reactedBy: [actor('1', 'viewer.one')],
      },
    ]);

    expect(signals.map(signal => signal.type)).toEqual(['story_view', 'story_reaction']);
  });

  it('normalizes profile observations for possible watcher analysis', () => {
    const signals = collectProfileObservationSignals([
      {
        sourceId: 'manual-target-check',
        observedAt: 1700000000000,
        observedUsers: [actor('1', 'target.user')],
      },
    ]);

    expect(signals).toEqual([
      {
        userId: '1',
        username: 'target.user',
        type: 'profile_observation',
        sourceId: 'manual-target-check',
        observedAt: 1700000000000,
      },
    ]);
  });

  it('normalizes direct message directions separately', () => {
    const signals = collectDirectMessageSignals([
      {
        threadId: 'thread-1',
        observedAt: 1700000000000,
        sentTo: [actor('1', 'sent.to')],
        receivedFrom: [actor('2', 'reply.from')],
      },
    ]);

    expect(signals.map(signal => signal.type)).toEqual([
      'direct_message_sent',
      'direct_message_received',
    ]);
  });
});
