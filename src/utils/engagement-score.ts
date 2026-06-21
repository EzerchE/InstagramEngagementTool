import {
  EngagementConfidence,
  EngagementProfile,
  EngagementRecommendation,
  EngagementSampleWindow,
  EngagementSignal,
  EngagementSubject,
} from '../model/engagement';

interface SignalCounts {
  readonly postLikes: number;
  readonly postComments: number;
  readonly storyViews: number;
  readonly storyReactions: number;
  readonly profileObservations: number;
  readonly lastInteractionAt: number | null;
}

const emptyCounts: SignalCounts = {
  postLikes: 0,
  postComments: 0,
  storyViews: 0,
  storyReactions: 0,
  profileObservations: 0,
  lastInteractionAt: null,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getInteractionCount = (counts: SignalCounts): number =>
  counts.postLikes + counts.postComments + counts.storyViews + counts.storyReactions;

const countSignals = (subject: EngagementSubject, signals: readonly EngagementSignal[]): SignalCounts =>
  signals
    .filter(signal => signal.userId === subject.userId || signal.username === subject.username)
    .reduce<SignalCounts>((counts, signal) => {
      const lastInteractionAt = Math.max(counts.lastInteractionAt ?? 0, signal.observedAt);

      switch (signal.type) {
        case 'post_like':
          return { ...counts, postLikes: counts.postLikes + 1, lastInteractionAt };
        case 'post_comment':
          return { ...counts, postComments: counts.postComments + 1, lastInteractionAt };
        case 'story_view':
          return { ...counts, storyViews: counts.storyViews + 1, lastInteractionAt };
        case 'story_reaction':
          return { ...counts, storyReactions: counts.storyReactions + 1, lastInteractionAt };
        case 'profile_observation':
          return {
            ...counts,
            profileObservations: counts.profileObservations + 1,
            lastInteractionAt: counts.lastInteractionAt,
          };
      }
    }, emptyCounts);

const getConfidence = (window: EngagementSampleWindow): EngagementConfidence => {
  const sampleSize = window.sampledPosts + window.sampledStories;

  if (sampleSize >= 12) {
    return 'high';
  }

  if (sampleSize >= 5) {
    return 'medium';
  }

  return 'low';
};

const getScore = (counts: SignalCounts, subject: EngagementSubject, window: EngagementSampleWindow): number => {
  const postLikeRate = window.sampledPosts === 0 ? 0 : counts.postLikes / window.sampledPosts;
  const postCommentRate = window.sampledPosts === 0 ? 0 : counts.postComments / window.sampledPosts;
  const storyViewRate = window.sampledStories === 0 ? 0 : counts.storyViews / window.sampledStories;
  const storyReactionRate = window.sampledStories === 0 ? 0 : counts.storyReactions / window.sampledStories;
  const relationshipBoost = subject.followsViewer && subject.followedByViewer ? 5 : 0;

  return Math.round(clamp(
    postLikeRate * 35 +
    postCommentRate * 20 +
    storyViewRate * 30 +
    storyReactionRate * 10 +
    relationshipBoost,
    0,
    100,
  ));
};

const getRecommendation = (
  counts: SignalCounts,
  subject: EngagementSubject,
  window: EngagementSampleWindow,
): { readonly recommendation: EngagementRecommendation; readonly reasons: readonly string[] } => {
  const reasons: string[] = [];
  const interactions = getInteractionCount(counts);

  if (counts.profileObservations > 0 && interactions === 0 && !subject.followsViewer) {
    reasons.push('Observed profile-level interest without follow-back or content interactions.');
    return { recommendation: 'possible_watcher', reasons };
  }

  if (interactions === 0 && window.sampledPosts + window.sampledStories >= 5) {
    reasons.push('No observed likes, comments, story views, or story reactions in the sampled window.');
    return { recommendation: 'possible_muted', reasons };
  }

  if (interactions >= 3 || counts.postComments > 0 || counts.storyReactions > 0) {
    reasons.push('Has repeated direct interaction signals.');
    return { recommendation: 'keep', reasons };
  }

  if (counts.storyViews === 0 && window.sampledStories >= 3 && counts.postLikes + counts.postComments > 0) {
    reasons.push('Interacts with posts but has no observed story views in the sampled story window.');
    return { recommendation: 'low_interest', reasons };
  }

  reasons.push('Not enough evidence for a strong action.');
  return { recommendation: 'review', reasons };
};

export const buildEngagementProfile = (
  subject: EngagementSubject,
  signals: readonly EngagementSignal[],
  window: EngagementSampleWindow,
): EngagementProfile => {
  const counts = countSignals(subject, signals);
  const recommendation = getRecommendation(counts, subject, window);

  return {
    ...subject,
    postLikes: counts.postLikes,
    postComments: counts.postComments,
    storyViews: counts.storyViews,
    storyReactions: counts.storyReactions,
    profileObservations: counts.profileObservations,
    sampledPosts: window.sampledPosts,
    sampledStories: window.sampledStories,
    lastInteractionAt: counts.lastInteractionAt,
    score: getScore(counts, subject, window),
    confidence: getConfidence(window),
    recommendation: recommendation.recommendation,
    reasons: recommendation.reasons,
  };
};
