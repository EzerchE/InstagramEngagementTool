import { describe, expect, it } from 'vitest';
import { ScanningFilter } from '../model/scanning-filter';
import { UserNode, Typename } from '../model/user';
import { getUsersForDisplay } from './utils';

const defaultFilter: ScanningFilter = {
  showNonFollowers: true,
  showFollowers: true,
  showVerified: true,
  showPrivate: true,
  showWithOutProfilePicture: true,
};

const createUser = (
  id: string,
  username: string,
  options: {
    readonly fullName?: string;
    readonly followsViewer?: boolean;
    readonly isPrivate?: boolean;
    readonly isVerified?: boolean;
    readonly profilePicUrl?: string;
  } = {},
): UserNode => ({
  id,
  username,
  full_name: options.fullName ?? username,
  profile_pic_url: options.profilePicUrl ?? `https://example.com/${username}.jpg`,
  is_private: options.isPrivate ?? false,
  is_verified: options.isVerified ?? false,
  followed_by_viewer: true,
  follows_viewer: options.followsViewer ?? false,
  requested_by_viewer: false,
  reel: {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: options.profilePicUrl ?? `https://example.com/${username}.jpg`,
      username,
    },
  },
});

describe('getUsersForDisplay', () => {
  it('keeps protected accounts out of the non-whitelisted tab', () => {
    const visibleUser = createUser('1', 'visible.account');
    const protectedUser = createUser('2', 'protected.account');

    const results = getUsersForDisplay(
      [visibleUser, protectedUser],
      [protectedUser],
      'non_whitelisted',
      '',
      defaultFilter,
    );

    expect(results).toEqual([visibleUser]);
  });

  it('shows only protected accounts in the whitelisted tab', () => {
    const visibleUser = createUser('1', 'visible.account');
    const protectedUser = createUser('2', 'protected.account');

    const results = getUsersForDisplay(
      [visibleUser, protectedUser],
      [protectedUser],
      'whitelisted',
      '',
      defaultFilter,
    );

    expect(results).toEqual([protectedUser]);
  });

  it('can isolate accounts that do not follow back', () => {
    const follower = createUser('1', 'follows.back', { followsViewer: true });
    const nonFollower = createUser('2', 'silent.account', { followsViewer: false });

    const results = getUsersForDisplay(
      [follower, nonFollower],
      [],
      'non_whitelisted',
      '',
      {
        ...defaultFilter,
        showFollowers: false,
      },
    );

    expect(results).toEqual([nonFollower]);
  });

  it('searches by username and full name', () => {
    const usernameMatch = createUser('1', 'signal.friend');
    const nameMatch = createUser('2', 'ordinary.account', { fullName: 'Signal Partner' });
    const miss = createUser('3', 'quiet.account', { fullName: 'Quiet Account' });

    const results = getUsersForDisplay(
      [usernameMatch, nameMatch, miss],
      [],
      'non_whitelisted',
      'signal',
      defaultFilter,
    );

    expect(results).toEqual([usernameMatch, nameMatch]);
  });
});
