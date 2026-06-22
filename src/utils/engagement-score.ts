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
  readonly directMessagesSent: number;
  readonly directMessagesReceived: number;
  readonly lastDirectMessageSentAt: number | null;
  readonly lastDirectMessageReceivedAt: number | null;
  readonly profileObservations: number;
  readonly lastInteractionAt: number | null;
}

const emptyCounts: SignalCounts = {
  postLikes: 0,
  postComments: 0,
  storyViews: 0,
  storyReactions: 0,
  directMessagesSent: 0,
  directMessagesReceived: 0,
  lastDirectMessageSentAt: null,
  lastDirectMessageReceivedAt: null,
  profileObservations: 0,
  lastInteractionAt: null,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getInteractionCount = (counts: SignalCounts): number =>
  counts.postLikes
  + counts.postComments
  + counts.storyViews
  + counts.storyReactions
  + counts.directMessagesReceived;

const getUnansweredMessageCount = (counts: SignalCounts): number => {
  if (counts.directMessagesSent === 0) {
    return 0;
  }

  if (
    counts.lastDirectMessageSentAt !== null
    && (counts.lastDirectMessageReceivedAt === null || counts.lastDirectMessageSentAt > counts.lastDirectMessageReceivedAt)
  ) {
    return Math.max(1, counts.directMessagesSent - counts.directMessagesReceived);
  }

  return Math.max(0, counts.directMessagesSent - counts.directMessagesReceived);
};

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
        case 'direct_message_sent':
          return {
            ...counts,
            directMessagesSent: counts.directMessagesSent + 1,
            lastDirectMessageSentAt: Math.max(counts.lastDirectMessageSentAt ?? 0, signal.observedAt),
          };
        case 'direct_message_received':
          return {
            ...counts,
            directMessagesReceived: counts.directMessagesReceived + 1,
            lastDirectMessageReceivedAt: Math.max(counts.lastDirectMessageReceivedAt ?? 0, signal.observedAt),
            lastInteractionAt,
          };
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
  const directMessageBoost = clamp(counts.directMessagesReceived * 8 - getUnansweredMessageCount(counts) * 3, -10, 24);
  const relationshipBoost = subject.followsViewer && subject.followedByViewer ? 5 : 0;

  return Math.round(clamp(
    postLikeRate * 35 +
    postCommentRate * 20 +
    storyViewRate * 30 +
    storyReactionRate * 10 +
    directMessageBoost +
    relationshipBoost,
    0,
    100,
  ));
};

const getRecommendation = (
  counts: SignalCounts,
  window: EngagementSampleWindow,
): { readonly recommendation: EngagementRecommendation; readonly reasons: readonly string[] } => {
  const reasons: string[] = [];
  const interactions = getInteractionCount(counts);
  const unansweredMessages = getUnansweredMessageCount(counts);

  if (counts.profileObservations > 0 && interactions === 0) {
    reasons.push('Observed profile-level interest without content interactions.');
    return { recommendation: 'possible_watcher', reasons };
  }

  if (unansweredMessages > 0 && interactions === 0) {
    reasons.push('You sent direct messages but no reply signal was observed in the imported window.');
    return { recommendation: 'low_interest', reasons };
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
  const recommendation = getRecommendation(counts, window);
  const unansweredMessages = getUnansweredMessageCount(counts);

  return {
    ...subject,
    postLikes: counts.postLikes,
    postComments: counts.postComments,
    storyViews: counts.storyViews,
    storyReactions: counts.storyReactions,
    directMessagesSent: counts.directMessagesSent,
    directMessagesReceived: counts.directMessagesReceived,
    unansweredMessages,
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
