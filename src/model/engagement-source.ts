export interface EngagementActor {
  readonly userId: string;
  readonly username: string;
}

export interface PostEngagementSnapshot {
  readonly mediaId: string;
  readonly observedAt: number;
  readonly likedBy: readonly EngagementActor[];
  readonly commentedBy: readonly EngagementActor[];
}

export interface StoryEngagementSnapshot {
  readonly storyId: string;
  readonly observedAt: number;
  readonly viewedBy: readonly EngagementActor[];
  readonly reactedBy: readonly EngagementActor[];
}

export interface DirectMessageSnapshot {
  readonly threadId: string;
  readonly observedAt: number;
  readonly sentTo: readonly EngagementActor[];
  readonly receivedFrom: readonly EngagementActor[];
}

export interface ProfileObservationSnapshot {
  readonly sourceId: string;
  readonly observedAt: number;
  readonly observedUsers: readonly EngagementActor[];
}
