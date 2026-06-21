export type EngagementSignalType =
  | 'post_like'
  | 'post_comment'
  | 'story_view'
  | 'story_reaction'
  | 'profile_observation';

export type EngagementRecommendation =
  | 'keep'
  | 'review'
  | 'low_interest'
  | 'possible_muted'
  | 'possible_watcher'
  | 'target_watch';

export type EngagementConfidence = 'low' | 'medium' | 'high';

export interface EngagementSignal {
  readonly userId: string;
  readonly username: string;
  readonly type: EngagementSignalType;
  readonly observedAt: number;
  readonly sourceId: string;
}

export interface EngagementSubject {
  readonly userId: string;
  readonly username: string;
  readonly fullName: string;
  readonly followsViewer: boolean;
  readonly followedByViewer: boolean;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
}

export interface EngagementProfile extends EngagementSubject {
  readonly postLikes: number;
  readonly postComments: number;
  readonly storyViews: number;
  readonly storyReactions: number;
  readonly profileObservations: number;
  readonly sampledPosts: number;
  readonly sampledStories: number;
  readonly lastInteractionAt: number | null;
  readonly score: number;
  readonly confidence: EngagementConfidence;
  readonly recommendation: EngagementRecommendation;
  readonly reasons: readonly string[];
}

export interface EngagementSampleWindow {
  readonly sampledPosts: number;
  readonly sampledStories: number;
  readonly observedSince: number | null;
  readonly observedUntil: number | null;
}

export interface TargetUserInvestigation {
  readonly username: string;
  readonly signals: readonly EngagementSignal[];
  readonly followsViewer: boolean | null;
  readonly followedByViewer: boolean | null;
  readonly confidence: EngagementConfidence;
  readonly summary: string;
}
