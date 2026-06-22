import { User } from '../model/user';
import { PostEngagementSnapshot, StoryEngagementSnapshot } from '../model/engagement-source';
import { MUTATING_ACTIONS_ENABLED_STORAGE_KEY } from '../constants/constants';
import {
  postSnapshotFromResponses,
  storySnapshotFromResponses,
} from '../utils/instagram-engagement-adapters';

const FOLLOWING_QUERY_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8';
const INSTAGRAM_GRAPHQL_URL = 'https://www.instagram.com/graphql/query/';

interface FollowingResponse {
  readonly data: {
    readonly user: {
      readonly edge_follow: User;
    };
  };
}

export interface PostEngagementRequest {
  readonly mediaId: string;
  readonly likedByUrl: string;
  readonly commentedByUrl: string;
  readonly observedAt?: number;
}

export interface StoryEngagementRequest {
  readonly storyId: string;
  readonly viewedByUrl: string;
  readonly reactedByUrl: string;
  readonly observedAt?: number;
}

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) {
    return null;
  }
  return parts.pop()!.split(';').shift()!;
};

const requireCookie = (name: string): string => {
  const value = getCookie(name);
  if (value === null) {
    throw new Error(`${name} cookie is missing`);
  }
  return value;
};

const fetchInstagramJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram resource: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
};

export const buildFollowingPageUrl = (nextCursor?: string): string => {
  const variables = {
    id: requireCookie('ds_user_id'),
    include_reel: true,
    fetch_mutual: false,
    first: 24,
    ...(nextCursor === undefined ? {} : { after: nextCursor }),
  };

  const params = new URLSearchParams({
    query_hash: FOLLOWING_QUERY_HASH,
    variables: JSON.stringify(variables),
  });

  return `${INSTAGRAM_GRAPHQL_URL}?${params.toString()}`;
};

export const fetchFollowingPage = async (nextCursor?: string): Promise<User> => {
  const data = await fetchInstagramJson(buildFollowingPageUrl(nextCursor)) as FollowingResponse;
  return data.data.user.edge_follow;
};

export const fetchPostEngagementSnapshot = async (
  request: PostEngagementRequest,
): Promise<PostEngagementSnapshot> => {
  const [likedByResponse, commentedByResponse] = await Promise.all([
    fetchInstagramJson(request.likedByUrl),
    fetchInstagramJson(request.commentedByUrl),
  ]);

  return postSnapshotFromResponses(
    request.mediaId,
    request.observedAt ?? Date.now(),
    likedByResponse,
    commentedByResponse,
  );
};

export const fetchStoryEngagementSnapshot = async (
  request: StoryEngagementRequest,
): Promise<StoryEngagementSnapshot> => {
  const [viewedByResponse, reactedByResponse] = await Promise.all([
    fetchInstagramJson(request.viewedByUrl),
    fetchInstagramJson(request.reactedByUrl),
  ]);

  return storySnapshotFromResponses(
    request.storyId,
    request.observedAt ?? Date.now(),
    viewedByResponse,
    reactedByResponse,
  );
};

export const unfollowUser = async (userId: string): Promise<void> => {
  if (localStorage.getItem(MUTATING_ACTIONS_ENABLED_STORAGE_KEY) !== 'true') {
    throw new Error('Mutating Instagram actions are disabled by default.');
  }

  const csrftoken = requireCookie('csrftoken');
  const response = await fetch(`https://www.instagram.com/web/friendships/${userId}/unfollow/`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-csrftoken': csrftoken,
    },
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to unfollow user ${userId}: ${response.status}`);
  }
};
