import { describe, expect, it } from 'vitest';
import { EngagementSampleWindow, EngagementSignal, EngagementSubject } from '../model/engagement';
import { buildEngagementProfile } from './engagement-score';

const baseSubject: EngagementSubject = {
  userId: 'user-1',
  username: 'quiet.signal',
  fullName: 'Quiet Signal',
  followsViewer: true,
  followedByViewer: true,
  isPrivate: false,
  isVerified: false,
};

const observedWindow: EngagementSampleWindow = {
  sampledPosts: 6,
  sampledStories: 4,
  observedSince: 1700000000000,
  observedUntil: 1701000000000,
};

const signal = (
  type: EngagementSignal['type'],
  observedAt: number,
  userId = baseSubject.userId,
  username = baseSubject.username,
): EngagementSignal => ({
  userId,
  username,
  type,
  observedAt,
  sourceId: `${type}-${observedAt}`,
});

describe('buildEngagementProfile', () => {
  it('keeps users with repeated direct interactions', () => {
    const profile = buildEngagementProfile(
      baseSubject,
      [
        signal('post_like', 1700000001000),
        signal('post_comment', 1700000002000),
        signal('story_reaction', 1700000003000),
      ],
      observedWindow,
    );

    expect(profile.recommendation).toBe('keep');
    expect(profile.score).toBeGreaterThan(0);
    expect(profile.postComments).toBe(1);
    expect(profile.storyReactions).toBe(1);
    expect(profile.lastInteractionAt).toBe(1700000003000);
  });

  it('marks no-signal accounts as possible muted only inside a sampled window', () => {
    const profile = buildEngagementProfile(baseSubject, [], observedWindow);

    expect(profile.recommendation).toBe('possible_muted');
    expect(profile.confidence).toBe('medium');
    expect(profile.reasons[0]).toContain('sampled window');
  });

  it('does not overstate weak evidence when the sample window is too small', () => {
    const profile = buildEngagementProfile(
      baseSubject,
      [],
      {
        sampledPosts: 1,
        sampledStories: 1,
        observedSince: 1700000000000,
        observedUntil: 1700100000000,
      },
    );

    expect(profile.recommendation).toBe('review');
    expect(profile.confidence).toBe('low');
  });

  it('flags profile-level interest without follow-back as a possible watcher', () => {
    const profile = buildEngagementProfile(
      {
        ...baseSubject,
        followsViewer: false,
      },
      [signal('profile_observation', 1700000001000)],
      observedWindow,
    );

    expect(profile.recommendation).toBe('possible_watcher');
    expect(profile.profileObservations).toBe(1);
    expect(profile.lastInteractionAt).toBeNull();
  });

  it('treats post engagement without story views as low interest rather than no interest', () => {
    const profile = buildEngagementProfile(
      baseSubject,
      [signal('post_like', 1700000001000)],
      observedWindow,
    );

    expect(profile.recommendation).toBe('low_interest');
    expect(profile.storyViews).toBe(0);
    expect(profile.postLikes).toBe(1);
  });
});
