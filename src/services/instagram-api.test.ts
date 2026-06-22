import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMediaCommentsUrl,
  buildMediaLikersUrl,
  fetchPostEngagementSnapshot,
  fetchReadOnlyPostEngagementScan,
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
  const stubBrowserGlobals = () => {
    vi.stubGlobal('document', {
      cookie: 'ds_user_id=viewer-1; csrftoken=csrf-1',
    });
    vi.stubGlobal('location', {
      href: 'https://www.instagram.com/',
    });
  };

  it('fetches post liker and commenter resources into a snapshot', async () => {
    stubBrowserGlobals();
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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://www.instagram.com/api/media/media-1/likers/',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'x-csrftoken': 'csrf-1',
          'x-ig-app-id': '936619743392459',
          'x-requested-with': 'XMLHttpRequest',
        }),
        referrer: 'https://www.instagram.com/',
      }),
    );
    expect(snapshot).toEqual({
      mediaId: 'media-1',
      observedAt: 1700000000000,
      likedBy: [{ userId: '1', username: 'liker.one' }],
      commentedBy: [{ userId: '2', username: 'commenter.one' }],
    });
  });

  it('fetches story viewer and reaction resources into a snapshot', async () => {
    stubBrowserGlobals();
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
    stubBrowserGlobals();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({ users: [] }));

    await expect(fetchPostEngagementSnapshot({
      mediaId: 'media-1',
      likedByUrl: 'https://www.instagram.com/api/media/media-1/likers/',
      commentedByUrl: 'https://www.instagram.com/api/media/media-1/comments/',
    })).rejects.toThrow('429');
  });

  it('builds read-only post engagement scan payload from following and media pages', async () => {
    stubBrowserGlobals();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        data: {
          user: {
            edge_follow: {
              count: 1,
              page_info: { has_next_page: false, end_cursor: '' },
              edges: [
                {
                  node: {
                    id: 'subject-1',
                    username: 'subject.one',
                    full_name: 'Subject One',
                    profile_pic_url: 'subject.jpg',
                    is_private: false,
                    is_verified: false,
                    followed_by_viewer: true,
                    follows_viewer: true,
                    requested_by_viewer: false,
                    reel: {
                      id: 'subject-1',
                      expiring_at: 0,
                      has_pride_media: false,
                      latest_reel_media: 0,
                      seen: null,
                      owner: {
                        __typename: 'GraphUser',
                        id: 'subject-1',
                        profile_pic_url: 'subject.jpg',
                        username: 'subject.one',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ pk: 'media-1' }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        users: [{ id: 'subject-1', username: 'subject.one' }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        users: [{ id: 'commenter-1', username: 'commenter.one' }],
      }));

    const payload = await fetchReadOnlyPostEngagementScan({
      maxMedia: 1,
      maxFollowingPages: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(payload.subjects).toHaveLength(1);
    expect(payload.posts).toEqual([
      {
        mediaId: 'media-1',
        observedAt: expect.any(Number),
        likedBy: [{ userId: 'subject-1', username: 'subject.one' }],
        commentedBy: [{ userId: 'commenter-1', username: 'commenter.one' }],
      },
    ]);
    expect(payload.sampleWindow.sampledPosts).toBe(1);
  });

  it('builds media engagement endpoint urls', () => {
    expect(buildMediaLikersUrl('media-1')).toBe('https://www.instagram.com/api/v1/media/media-1/likers/');
    expect(buildMediaCommentsUrl('media-1')).toBe(
      'https://www.instagram.com/api/v1/media/media-1/comments/?can_support_threading=true',
    );
  });

  it('blocks mutating unfollow actions by default', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
    });

    await expect(unfollowUser('user-1')).rejects.toThrow('disabled by default');
  });
});
