import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPostEngagementSnapshot,
  fetchStoryEngagementSnapshot,
  unfollowUser,
} from './instagram-api';

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: async () => body,
  }) as Response;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('instagram-api engagement fetchers', () => {
  it('fetches post liker and commenter resources into a snapshot', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        users: [{ id: '1', username: 'liker.one' }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        users: [{ id: '2', username: 'commenter.one' }],
      }));

    const snapshot = await fetchPostEngagementSnapshot({
      mediaId: 'media-1',
      likedByUrl: 'https://www.instagram.com/api/media/media-1/likers/',
      commentedByUrl: 'https://www.instagram.com/api/media/media-1/comments/',
      observedAt: 1700000000000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://www.instagram.com/api/media/media-1/likers/', {
      credentials: 'include',
    });
    expect(snapshot).toEqual({
      mediaId: 'media-1',
      observedAt: 1700000000000,
      likedBy: [{ userId: '1', username: 'liker.one' }],
      commentedBy: [{ userId: '2', username: 'commenter.one' }],
    });
  });

  it('fetches story viewer and reaction resources into a snapshot', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        viewers: [{ id: '1', username: 'viewer.one' }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        reactions: [{ id: '2', username: 'reactor.one' }],
      }));

    const snapshot = await fetchStoryEngagementSnapshot({
      storyId: 'story-1',
      viewedByUrl: 'https://www.instagram.com/api/stories/story-1/viewers/',
      reactedByUrl: 'https://www.instagram.com/api/stories/story-1/reactions/',
      observedAt: 1700000000000,
    });

    expect(snapshot).toEqual({
      storyId: 'story-1',
      observedAt: 1700000000000,
      viewedBy: [{ userId: '1', username: 'viewer.one' }],
      reactedBy: [{ userId: '2', username: 'reactor.one' }],
    });
  });

  it('fails when an engagement resource request is rejected', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({ users: [] }));

    await expect(fetchPostEngagementSnapshot({
      mediaId: 'media-1',
      likedByUrl: 'https://www.instagram.com/api/media/media-1/likers/',
      commentedByUrl: 'https://www.instagram.com/api/media/media-1/comments/',
    })).rejects.toThrow('429');
  });

  it('blocks mutating unfollow actions by default', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
    });

    await expect(unfollowUser('user-1')).rejects.toThrow('disabled by default');
  });
});
