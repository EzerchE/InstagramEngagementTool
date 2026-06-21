import {
  EngagementActor,
  PostEngagementSnapshot,
  StoryEngagementSnapshot,
} from '../model/engagement-source';

interface RawActor {
  readonly id?: unknown;
  readonly userId?: unknown;
  readonly pk?: unknown;
  readonly user_id?: unknown;
  readonly username?: unknown;
  readonly user?: RawActor;
  readonly node?: RawActor;
}

interface RawEdge {
  readonly node?: RawActor;
}

interface RawActorContainer {
  readonly users?: unknown;
  readonly edges?: unknown;
  readonly data?: unknown;
  readonly viewers?: unknown;
  readonly likers?: unknown;
  readonly commenters?: unknown;
  readonly reactions?: unknown;
  readonly items?: unknown;
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

const actorFromRaw = (raw: unknown): EngagementActor | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const actor = raw as RawActor;
  const nestedActor = actor.user ?? actor.node;

  if (nestedActor !== undefined) {
    return actorFromRaw(nestedActor);
  }

  const userId = toStringValue(actor.userId ?? actor.id ?? actor.pk ?? actor.user_id);
  const username = toStringValue(actor.username);

  if (userId === null || username === null) {
    return null;
  }

  return { userId, username };
};

const actorsFromUnknown = (value: unknown): readonly EngagementActor[] => {
  if (Array.isArray(value)) {
    return value
      .map(actorFromRaw)
      .filter((actor): actor is EngagementActor => actor !== null);
  }

  if (!isRecord(value)) {
    return [];
  }

  const container = value as RawActorContainer;

  if (Array.isArray(container.edges)) {
    return actorsFromUnknown(container.edges.map(edge => (edge as RawEdge).node ?? edge));
  }

  const candidates = [
    container.users,
    container.data,
    container.viewers,
    container.likers,
    container.commenters,
    container.reactions,
    container.items,
  ];

  for (const candidate of candidates) {
    const actors = actorsFromUnknown(candidate);
    if (actors.length > 0) {
      return actors;
    }
  }

  const singleActor = actorFromRaw(value);
  return singleActor === null ? [] : [singleActor];
};

export const postSnapshotFromResponses = (
  mediaId: string,
  observedAt: number,
  likedByResponse: unknown,
  commentedByResponse: unknown,
): PostEngagementSnapshot => ({
  mediaId,
  observedAt,
  likedBy: actorsFromUnknown(likedByResponse),
  commentedBy: actorsFromUnknown(commentedByResponse),
});

export const storySnapshotFromResponses = (
  storyId: string,
  observedAt: number,
  viewedByResponse: unknown,
  reactedByResponse: unknown,
): StoryEngagementSnapshot => ({
  storyId,
  observedAt,
  viewedBy: actorsFromUnknown(viewedByResponse),
  reactedBy: actorsFromUnknown(reactedByResponse),
});
