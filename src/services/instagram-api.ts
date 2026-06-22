import { User } from '../model/user';
import { EngagementSubject } from '../model/engagement';
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

interface OwnMediaPageResponse {
  readonly items?: readonly unknown[];
}

export interface InstagramMediaSummary {
  readonly mediaId: string;
}

export interface ReadOnlyPostEngagementScanPayload {
  readonly subjects: readonly EngagementSubject[];
  readonly posts: readonly PostEngagementSnapshot[];
  readonly sampleWindow: {
    readonly sampledPosts: number;
    readonly sampledStories: number;
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

const buildInstagramHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'x-asbd-id': '129477',
    'x-ig-app-id': '936619743392459',
    'x-requested-with': 'XMLHttpRequest',
  };
  const csrftoken = getCookie('csrftoken');

  if (csrftoken !== null) {
    headers['x-csrftoken'] = csrftoken;
  }

  return headers;
};

const fetchInstagramJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: buildInstagramHeaders(),
    referrer: location.href,
  });

  if (!response.ok) {
    const resource = new URL(url, location.href);
    throw new Error(`Failed to fetch Instagram resource: ${response.status} ${resource.pathname}`);
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

const userNodeToSubject = (user: User['edges'][number]['node']): EngagementSubject => ({
  userId: user.id,
  username: user.username,
  fullName: user.full_name,
  relationshipKnown: true,
  followsViewer: user.follows_viewer,
  followedByViewer: user.followed_by_viewer,
  isPrivate: user.is_private,
  isVerified: user.is_verified,
});

const mediaSummaryFromUnknown = (value: unknown): InstagramMediaSummary | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const media = value as Record<string, unknown>;
  const mediaId = media.pk ?? media.id;

  if (typeof mediaId !== 'string' && typeof mediaId !== 'number') {
    return null;
  }

  return { mediaId: String(mediaId) };
};

export const buildOwnMediaPageUrl = (count: number): string =>
  `https://www.instagram.com/api/v1/feed/user/${requireCookie('ds_user_id')}/?count=${count}`;

export const buildMediaLikersUrl = (mediaId: string): string =>
  `https://www.instagram.com/api/v1/media/${mediaId}/likers/`;

export const buildMediaCommentsUrl = (mediaId: string): string =>
  `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true`;

export const fetchOwnMediaPage = async (count: number): Promise<readonly InstagramMediaSummary[]> => {
  const data = await fetchInstagramJson(buildOwnMediaPageUrl(count)) as OwnMediaPageResponse;

  return (data.items ?? [])
    .map(mediaSummaryFromUnknown)
    .filter((media): media is InstagramMediaSummary => media !== null);
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

export const fetchReadOnlyPostEngagementScan = async (
  options: {
    readonly maxMedia?: number;
    readonly maxFollowingPages?: number;
  } = {},
): Promise<ReadOnlyPostEngagementScanPayload> => {
  const maxMedia = options.maxMedia ?? 6;
  const maxFollowingPages = options.maxFollowingPages ?? 2;
  const subjectsByUserId = new Map<string, EngagementSubject>();
  let nextCursor: string | undefined;

  for (let page = 0; page < maxFollowingPages; page += 1) {
    const followingPage = await fetchFollowingPage(nextCursor);
    for (const edge of followingPage.edges) {
      subjectsByUserId.set(edge.node.id, userNodeToSubject(edge.node));
    }

    if (!followingPage.page_info.has_next_page) {
      break;
    }
    nextCursor = followingPage.page_info.end_cursor;
  }

  const media = await fetchOwnMediaPage(maxMedia);
  const selectedMedia = media.slice(0, maxMedia);
  const posts: PostEngagementSnapshot[] = [];

  for (const mediaItem of selectedMedia) {
    posts.push(await fetchPostEngagementSnapshot({
      mediaId: mediaItem.mediaId,
      likedByUrl: buildMediaLikersUrl(mediaItem.mediaId),
      commentedByUrl: buildMediaCommentsUrl(mediaItem.mediaId),
    }));
  }

  return {
    subjects: Array.from(subjectsByUserId.values()),
    posts,
    sampleWindow: {
      sampledPosts: selectedMedia.length,
      sampledStories: 0,
    },
  };
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
