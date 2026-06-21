import {
  EngagementProfile,
  EngagementSampleWindow,
  EngagementSignal,
  EngagementSubject,
} from '../model/engagement';
import {
  EngagementActor,
  PostEngagementSnapshot,
  ProfileObservationSnapshot,
  StoryEngagementSnapshot,
} from '../model/engagement-source';
import {
  collectPostEngagementSignals,
  collectProfileObservationSignals,
  collectStoryEngagementSignals,
  dedupeEngagementSignals,
} from './engagement-collectors';
import { buildEngagementProfile } from './engagement-score';
import {
  postSnapshotFromResponses,
  storySnapshotFromResponses,
} from './instagram-engagement-adapters';

interface ImportPost {
  readonly mediaId?: unknown;
  readonly observedAt?: unknown;
  readonly likedBy?: unknown;
  readonly commentedBy?: unknown;
  readonly likedByResponse?: unknown;
  readonly commentedByResponse?: unknown;
}

interface ImportStory {
  readonly storyId?: unknown;
  readonly observedAt?: unknown;
  readonly viewedBy?: unknown;
  readonly reactedBy?: unknown;
  readonly viewedByResponse?: unknown;
  readonly reactedByResponse?: unknown;
}

interface ImportProfileObservation {
  readonly sourceId?: unknown;
  readonly observedAt?: unknown;
  readonly observedUsers?: unknown;
}

interface ImportPayload {
  readonly subjects?: unknown;
  readonly posts?: unknown;
  readonly stories?: unknown;
  readonly profileObservations?: unknown;
  readonly sampleWindow?: unknown;
}

export interface EngagementImportResult {
  readonly profiles: readonly EngagementProfile[];
  readonly signals: readonly EngagementSignal[];
  readonly sampleWindow: EngagementSampleWindow;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

const toNumberValue = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toBooleanValue = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : false;

const actorFromUnknown = (value: unknown): EngagementActor | null => {
  if (!isRecord(value)) {
    return null;
  }

  const nested = value.user ?? value.node;
  if (nested !== undefined) {
    return actorFromUnknown(nested);
  }

  const userId = toStringValue(value.userId ?? value.id ?? value.pk ?? value.user_id);
  const username = toStringValue(value.username);

  if (userId === null || username === null) {
    return null;
  }

  return { userId, username };
};

const actorsFromUnknown = (value: unknown): readonly EngagementActor[] => {
  if (Array.isArray(value)) {
    return value
      .map(actorFromUnknown)
      .filter((actor): actor is EngagementActor => actor !== null);
  }

  if (!isRecord(value)) {
    return [];
  }

  const candidates = [
    value.users,
    value.data,
    value.viewers,
    value.likers,
    value.commenters,
    value.reactions,
    value.items,
    value.observedUsers,
  ];

  for (const candidate of candidates) {
    const actors = actorsFromUnknown(candidate);
    if (actors.length > 0) {
      return actors;
    }
  }

  const actor = actorFromUnknown(value);
  return actor === null ? [] : [actor];
};

const subjectFromUnknown = (value: unknown): EngagementSubject | null => {
  if (!isRecord(value)) {
    return null;
  }

  const actor = actorFromUnknown(value);
  if (actor === null) {
    return null;
  }

  return {
    userId: actor.userId,
    username: actor.username,
    fullName: toStringValue(value.fullName ?? value.full_name) ?? actor.username,
    followsViewer: toBooleanValue(value.followsViewer ?? value.follows_viewer),
    followedByViewer: toBooleanValue(value.followedByViewer ?? value.followed_by_viewer),
    isPrivate: toBooleanValue(value.isPrivate ?? value.is_private),
    isVerified: toBooleanValue(value.isVerified ?? value.is_verified),
  };
};

const subjectFromActor = (actor: EngagementActor): EngagementSubject => ({
  userId: actor.userId,
  username: actor.username,
  fullName: actor.username,
  followsViewer: false,
  followedByViewer: false,
  isPrivate: false,
  isVerified: false,
});

const postFromUnknown = (value: unknown, index: number, now: number): PostEngagementSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const post = value as ImportPost;
  const mediaId = toStringValue(post.mediaId) ?? `import-post-${index + 1}`;
  const observedAt = toNumberValue(post.observedAt, now);

  return postSnapshotFromResponses(
    mediaId,
    observedAt,
    post.likedByResponse ?? post.likedBy ?? [],
    post.commentedByResponse ?? post.commentedBy ?? [],
  );
};

const storyFromUnknown = (value: unknown, index: number, now: number): StoryEngagementSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const story = value as ImportStory;
  const storyId = toStringValue(story.storyId) ?? `import-story-${index + 1}`;
  const observedAt = toNumberValue(story.observedAt, now);

  return storySnapshotFromResponses(
    storyId,
    observedAt,
    story.viewedByResponse ?? story.viewedBy ?? [],
    story.reactedByResponse ?? story.reactedBy ?? [],
  );
};

const profileObservationFromUnknown = (
  value: unknown,
  index: number,
  now: number,
): ProfileObservationSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const observation = value as ImportProfileObservation;

  return {
    sourceId: toStringValue(observation.sourceId) ?? `import-profile-observation-${index + 1}`,
    observedAt: toNumberValue(observation.observedAt, now),
    observedUsers: actorsFromUnknown(observation.observedUsers),
  };
};

const getObservedAtValues = (
  posts: readonly PostEngagementSnapshot[],
  stories: readonly StoryEngagementSnapshot[],
  profileObservations: readonly ProfileObservationSnapshot[],
): readonly number[] => [
  ...posts.map(post => post.observedAt),
  ...stories.map(story => story.observedAt),
  ...profileObservations.map(observation => observation.observedAt),
];

const buildSampleWindow = (
  payloadWindow: unknown,
  posts: readonly PostEngagementSnapshot[],
  stories: readonly StoryEngagementSnapshot[],
  profileObservations: readonly ProfileObservationSnapshot[],
): EngagementSampleWindow => {
  const observedAtValues = getObservedAtValues(posts, stories, profileObservations);
  const observedSince = observedAtValues.length === 0 ? null : Math.min(...observedAtValues);
  const observedUntil = observedAtValues.length === 0 ? null : Math.max(...observedAtValues);

  if (!isRecord(payloadWindow)) {
    return {
      sampledPosts: posts.length,
      sampledStories: stories.length,
      observedSince,
      observedUntil,
    };
  }

  return {
    sampledPosts: toNumberValue(payloadWindow.sampledPosts, posts.length),
    sampledStories: toNumberValue(payloadWindow.sampledStories, stories.length),
    observedSince: payloadWindow.observedSince === null
      ? null
      : toNumberValue(payloadWindow.observedSince, observedSince ?? 0),
    observedUntil: payloadWindow.observedUntil === null
      ? null
      : toNumberValue(payloadWindow.observedUntil, observedUntil ?? 0),
  };
};

export const buildEngagementProfilesFromImport = (
  jsonText: string,
  now = Date.now(),
): EngagementImportResult => {
  const parsed = JSON.parse(jsonText) as unknown;

  if (!isRecord(parsed)) {
    throw new Error('Import payload must be a JSON object.');
  }

  const payload = parsed as ImportPayload;
  const posts = Array.isArray(payload.posts)
    ? payload.posts.map((post, index) => postFromUnknown(post, index, now)).filter((post): post is PostEngagementSnapshot => post !== null)
    : [];
  const stories = Array.isArray(payload.stories)
    ? payload.stories.map((story, index) => storyFromUnknown(story, index, now)).filter((story): story is StoryEngagementSnapshot => story !== null)
    : [];
  const profileObservations = Array.isArray(payload.profileObservations)
    ? payload.profileObservations
      .map((observation, index) => profileObservationFromUnknown(observation, index, now))
      .filter((observation): observation is ProfileObservationSnapshot => observation !== null)
    : [];
  const importedSubjects = Array.isArray(payload.subjects)
    ? payload.subjects.map(subjectFromUnknown).filter((subject): subject is EngagementSubject => subject !== null)
    : [];

  const signals = dedupeEngagementSignals([
    ...collectPostEngagementSignals(posts),
    ...collectStoryEngagementSignals(stories),
    ...collectProfileObservationSignals(profileObservations),
  ]);
  const subjectsByUserId = new Map<string, EngagementSubject>();

  for (const subject of importedSubjects) {
    subjectsByUserId.set(subject.userId, subject);
  }

  for (const signal of signals) {
    if (!subjectsByUserId.has(signal.userId)) {
      subjectsByUserId.set(signal.userId, subjectFromActor(signal));
    }
  }

  const subjects = Array.from(subjectsByUserId.values());
  if (subjects.length === 0) {
    throw new Error('Import payload must include at least one subject or engagement actor.');
  }

  const sampleWindow = buildSampleWindow(payload.sampleWindow, posts, stories, profileObservations);

  return {
    sampleWindow,
    signals,
    profiles: subjects.map(subject => buildEngagementProfile(subject, signals, sampleWindow)),
  };
};
