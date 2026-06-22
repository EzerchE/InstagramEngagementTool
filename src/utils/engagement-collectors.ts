import { EngagementSignal } from '../model/engagement';
import {
  EngagementActor,
  DirectMessageSnapshot,
  PostEngagementSnapshot,
  ProfileObservationSnapshot,
  StoryEngagementSnapshot,
} from '../model/engagement-source';

const actorToSignal = (
  actor: EngagementActor,
  type: EngagementSignal['type'],
  sourceId: string,
  observedAt: number,
): EngagementSignal => ({
  userId: actor.userId,
  username: actor.username,
  type,
  sourceId,
  observedAt,
});

const getSignalKey = (signal: EngagementSignal): string =>
  `${signal.type}:${signal.sourceId}:${signal.userId}:${signal.username}`;

export const dedupeEngagementSignals = (signals: readonly EngagementSignal[]): readonly EngagementSignal[] => {
  const seen = new Set<string>();
  const deduped: EngagementSignal[] = [];

  for (const signal of signals) {
    const key = getSignalKey(signal);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(signal);
  }

  return deduped;
};

export const collectPostEngagementSignals = (
  snapshots: readonly PostEngagementSnapshot[],
): readonly EngagementSignal[] => {
  const signals: EngagementSignal[] = [];

  for (const snapshot of snapshots) {
    for (const actor of snapshot.likedBy) {
      signals.push(actorToSignal(actor, 'post_like', snapshot.mediaId, snapshot.observedAt));
    }

    for (const actor of snapshot.commentedBy) {
      signals.push(actorToSignal(actor, 'post_comment', snapshot.mediaId, snapshot.observedAt));
    }
  }

  return dedupeEngagementSignals(signals);
};

export const collectStoryEngagementSignals = (
  snapshots: readonly StoryEngagementSnapshot[],
): readonly EngagementSignal[] => {
  const signals: EngagementSignal[] = [];

  for (const snapshot of snapshots) {
    for (const actor of snapshot.viewedBy) {
      signals.push(actorToSignal(actor, 'story_view', snapshot.storyId, snapshot.observedAt));
    }

    for (const actor of snapshot.reactedBy) {
      signals.push(actorToSignal(actor, 'story_reaction', snapshot.storyId, snapshot.observedAt));
    }
  }

  return dedupeEngagementSignals(signals);
};

export const collectDirectMessageSignals = (
  snapshots: readonly DirectMessageSnapshot[],
): readonly EngagementSignal[] => {
  const signals: EngagementSignal[] = [];

  for (const snapshot of snapshots) {
    for (const actor of snapshot.sentTo) {
      signals.push(actorToSignal(actor, 'direct_message_sent', snapshot.threadId, snapshot.observedAt));
    }

    for (const actor of snapshot.receivedFrom) {
      signals.push(actorToSignal(actor, 'direct_message_received', snapshot.threadId, snapshot.observedAt));
    }
  }

  return dedupeEngagementSignals(signals);
};

export const collectProfileObservationSignals = (
  snapshots: readonly ProfileObservationSnapshot[],
): readonly EngagementSignal[] => {
  const signals: EngagementSignal[] = [];

  for (const snapshot of snapshots) {
    for (const actor of snapshot.observedUsers) {
      signals.push(actorToSignal(actor, 'profile_observation', snapshot.sourceId, snapshot.observedAt));
    }
  }

  return dedupeEngagementSignals(signals);
};
