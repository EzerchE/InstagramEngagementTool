import { UserNode } from './user';
import { ScanningTab } from './scanning-tab';
import { ScanningFilter } from './scanning-filter';
import { UnfollowLogEntry } from './unfollow-log-entry';
import { UnfollowFilter } from './unfollow-filter';
import { EngagementProfile, EngagementSampleWindow, EngagementSignal } from './engagement';

interface ScanningState {
  readonly status: 'scanning';
  readonly page: number;
  readonly currentTab: ScanningTab;
  readonly searchTerm: string;
  readonly percentage: number;
  readonly results: readonly UserNode[];
  readonly whitelistedResults: readonly UserNode[];
  readonly selectedResults: readonly UserNode[];
  readonly filter: ScanningFilter;
}

interface UnfollowingState {
  readonly status: 'unfollowing';
  readonly searchTerm: string;
  readonly percentage: number;
  readonly selectedResults: readonly UserNode[];
  readonly unfollowLog: readonly UnfollowLogEntry[];
  readonly filter: UnfollowFilter;
}

interface EngagementState {
  readonly status: 'engagement';
  readonly searchTerm: string;
  readonly profiles: readonly EngagementProfile[];
  readonly signals: readonly EngagementSignal[];
  readonly sampleWindow: EngagementSampleWindow;
  readonly currentTab:
    | 'all'
    | 'top_supporters'
    | 'post_likes_most'
    | 'post_likes_least'
    | 'direct_messages_most'
    | 'direct_unanswered'
    | 'story_reactions_most'
    | 'story_reactions_least'
    | 'low_interest'
    | 'known_non_followers';
}

// TODO THIS TYPE OF MULTIPLE STATE NEEDS TO BE SEPARETED IN DIFFERENT FILES ASAP (Global state,unfollowing state, scanning state etc...)
export type State = { readonly status: 'initial' } | ScanningState | UnfollowingState | EngagementState;
