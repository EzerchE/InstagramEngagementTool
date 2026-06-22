import { describe, expect, it } from 'vitest';
import { buildManualStorySnapshot, parseUsernameList } from './manual-snapshot';

describe('manual snapshot helpers', () => {
  it('parses pasted usernames from mixed separators', () => {
    expect(parseUsernameList('@Alpha, beta\nalpha; gamma\t')).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('builds story snapshots from pasted viewer and reaction usernames', () => {
    const snapshot = buildManualStorySnapshot(
      'story-1',
      'viewer.one\nviewer.two',
      '@viewer.two',
      1700000000000,
    );

    expect(snapshot).toEqual({
      storyId: 'story-1',
      observedAt: 1700000000000,
      viewedBy: [
        { userId: 'viewer.one', username: 'viewer.one' },
        { userId: 'viewer.two', username: 'viewer.two' },
      ],
      reactedBy: [
        { userId: 'viewer.two', username: 'viewer.two' },
      ],
    });
  });
});
