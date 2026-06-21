import { User } from '../model/user';

const FOLLOWING_QUERY_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8';
const INSTAGRAM_GRAPHQL_URL = 'https://www.instagram.com/graphql/query/';

interface FollowingResponse {
  readonly data: {
    readonly user: {
      readonly edge_follow: User;
    };
  };
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
  const response = await fetch(buildFollowingPageUrl(nextCursor), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch following page: ${response.status}`);
  }

  const data = await response.json() as FollowingResponse;
  return data.data.user.edge_follow;
};

export const unfollowUser = async (userId: string): Promise<void> => {
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
