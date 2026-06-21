import { describe, expect, it } from 'vitest';
import { EngagementSignal } from '../model/engagement';
import { buildTargetUserInvestigation } from './target-investigation';

const signal = (username: string, type: EngagementSignal['type']): EngagementSignal => ({
  userId: `${username}-id`,
  username,
  type,
  sourceId: `${username}-${type}`,
  observedAt: 1700000000000,
});

describe('buildTargetUserInvestigation', () => {
  it('finds a target user by username without requiring follow relationship data', () => {
    const investigation = buildTargetUserInvestigation(
      'Target.User',
      [
        signal('target.user', 'post_like'),
        signal('other.user', 'story_view'),
      ],
    );

    expect(investigation.username).toBe('target.user');
    expect(investigation.signals).toHaveLength(1);
    expect(investigation.confidence).toBe('medium');
  });

  it('raises confidence when target signals and relationship data are both available', () => {
    const investigation = buildTargetUserInvestigation(
      'target.user',
      [
        signal('target.user', 'post_like'),
        signal('target.user', 'story_view'),
        signal('target.user', 'story_reaction'),
      ],
      {
        followsViewer: false,
        followedByViewer: false,
      },
    );

    expect(investigation.confidence).toBe('high');
    expect(investigation.summary).toContain('3');
  });

  it('keeps confidence low when there is no observed evidence', () => {
    const investigation = buildTargetUserInvestigation('missing.user', []);

    expect(investigation.signals).toEqual([]);
    expect(investigation.confidence).toBe('low');
  });
});
