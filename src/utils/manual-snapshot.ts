import { StoryEngagementSnapshot } from '../model/engagement-source';

const normalizeUsername = (value: string): string =>
  value
    .trim()
    .replace(/^@/, '')
    .toLowerCase();

export const parseUsernameList = (text: string): readonly string[] => {
  const seen = new Set<string>();
  const usernames: string[] = [];

  for (const rawEntry of text.split(/[\n,;\t ]+/)) {
    const username = normalizeUsername(rawEntry);
    if (username === '' || seen.has(username)) {
      continue;
    }

    seen.add(username);
    usernames.push(username);
  }

  return usernames;
};

export const buildManualStorySnapshot = (
  storyId: string,
  viewerUsernamesText: string,
  reactedUsernamesText: string,
  observedAt = Date.now(),
): StoryEngagementSnapshot => ({
  storyId: storyId.trim() === '' ? `manual-story-${observedAt}` : storyId.trim(),
  observedAt,
  viewedBy: parseUsernameList(viewerUsernamesText).map(username => ({
    userId: username,
    username,
  })),
  reactedBy: parseUsernameList(reactedUsernamesText).map(username => ({
    userId: username,
    username,
  })),
});
