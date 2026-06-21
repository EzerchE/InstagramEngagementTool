import React, { ChangeEvent, useState } from 'react';
import { State } from '../model/state';
import {
  assertUnreachable,
  copyEngagementProfilesToClipboard,
  copyListToClipboard,
  exportEngagementProfilesToCSV,
  exportEngagementProfilesToJSON,
  exportToCSV,
  exportToJSON,
  getCurrentPageUsers,
  getUsersForDisplay,
} from '../utils/utils';
import { SettingMenu } from './SettingMenu';
import { SettingIcon } from './icons/SettingIcon';
import { Timings } from '../model/timings';
import { Logo } from './icons/Logo';
import { UserNode } from '../model/user';
import { APP_NAME } from '../constants/constants';
import { getProfilesForEngagementDisplay } from '../utils/engagement-preview';

interface ToolBarProps {
  isActiveProcess: boolean;
  state: State;
  setState: (state: State) => void;
  toggleAllUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleCurrentePageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

export const Toolbar = ({
  isActiveProcess,
  state,
  setState,
  toggleAllUsers,
  toggleCurrentePageUsers,
  currentTimings,
  setTimings,
  whitelistedUsers,
  onWhitelistUpdate,
}: ToolBarProps) => {

  const [setingMenu, setSettingMenu] = useState(false);
  const progressWidth = state.status === 'scanning' || state.status === 'unfollowing'
    ? state.percentage
    : 0;

  return (
    <header className='app-header'>
      {isActiveProcess && (
        <div
          className='progressbar'
          style={{ '--progress-width': `${progressWidth}%` } as React.CSSProperties}
        />
      )}
      <div className='app-header-content'>
        <div
          className='logo'
          onClick={() => {
            if (isActiveProcess) {
              // Avoid resetting state while active process.
              return;
            }
            switch (state.status) {
              case 'initial':
                if (confirm('Go back to Instagram?')) {
                  location.reload();
                }
                break;

              case 'scanning':
              case 'unfollowing':
              case 'engagement':
                setState({
                  status: 'initial',
                });
            }
          }}
        >
          <Logo />
          <div className='logo-text'>
            <span>{APP_NAME}</span>
            <span>Local audit</span>
          </div>
        </div>
        <div className='toolbar-actions'>
          <button
            className='copy-list'
            onClick={() => {
              switch (state.status) {
                case 'scanning':
                  return copyListToClipboard(
                    getUsersForDisplay(
                      state.results,
                      state.whitelistedResults,
                      state.currentTab,
                      state.searchTerm,
                      state.filter,
                    ),
                  );
                case 'engagement':
                  return copyEngagementProfilesToClipboard(
                    getProfilesForEngagementDisplay(state.profiles, state.currentTab, state.searchTerm),
                  );
                case 'initial':
                case 'unfollowing':
                  return;
                default:
                  assertUnreachable(state);
              }
            }}
            disabled={state.status === 'initial'}
          >
            Copy
          </button>
          <button
            className='copy-list'
            title='Export to JSON'
            onClick={() => {
              if (state.status === 'scanning') {
                exportToJSON(getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter));
                return;
              }
              if (state.status === 'engagement') {
                exportEngagementProfilesToJSON(getProfilesForEngagementDisplay(state.profiles, state.currentTab, state.searchTerm));
              }
            }}
            disabled={state.status !== 'scanning' && state.status !== 'engagement'}
          >
            JSON
          </button>
          <button
            className='copy-list'
            title='Export to CSV'
            onClick={() => {
              if (state.status === 'scanning') {
                exportToCSV(getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter));
                return;
              }
              if (state.status === 'engagement') {
                exportEngagementProfilesToCSV(getProfilesForEngagementDisplay(state.profiles, state.currentTab, state.searchTerm));
              }
            }}
            disabled={state.status !== 'scanning' && state.status !== 'engagement'}
          >
            CSV
          </button>
          <button
            className='icon-button'
            type='button'
            title='Settings'
            onClick={() => {
              setSettingMenu(true);
            }}
          >
            <SettingIcon />
          </button>
        </div>
        <div className='toolbar-search'>
          <input
            type='text'
            className='search-bar'
            placeholder='Search users'
            disabled={state.status === 'initial'}
            value={state.status === 'initial' ? '' : state.searchTerm}
            onChange={e => {
              switch (state.status) {
                case 'initial':
                  return;
                case 'scanning':
                  return setState({
                    ...state,
                    searchTerm: e.currentTarget.value,
                  });
                case 'unfollowing':
                  return setState({
                    ...state,
                    searchTerm: e.currentTarget.value,
                  });
                case 'engagement':
                  return setState({
                    ...state,
                    searchTerm: e.currentTarget.value,
                  });
                default:
                  assertUnreachable(state);
              }
            }}
          />
          {state.status === 'scanning' && (
            <label className='select-toggle'>
              <input
                title='Select all on this page'
                type='checkbox'
                // Avoid allowing selection while the scan is incomplete and the visible result set is still moving.
                disabled={state.percentage < 100}
                checked={
                  (() => {
                    const displayed = getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter);
                    const pageUsers = getCurrentPageUsers(displayed, state.page);
                    return pageUsers.length > 0 && pageUsers.every(u => state.selectedResults.some(s => s.id === u.id));
                  })()
                }
                className='toggle-all-checkbox'
                onChange={toggleCurrentePageUsers}
              />
              Page
            </label>
          )}
          {state.status === 'scanning' && (
            <label className='select-toggle'>
              <input
                title='Select all'
                type='checkbox'
                // Avoid allowing selection while the scan is incomplete and the visible result set is still moving.
                disabled={state.percentage < 100}
                checked={
                  (() => {
                    const displayed = getUsersForDisplay(
                      state.results,
                      state.whitelistedResults,
                      state.currentTab,
                      state.searchTerm,
                      state.filter,
                    );
                    return displayed.length > 0 && displayed.every(u => state.selectedResults.some(s => s.id === u.id));
                  })()
                }
                className='toggle-all-checkbox'
                onChange={toggleAllUsers}
              />
              All
            </label>
          )}
        </div>
      </div>
      {(setingMenu) &&
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
          whitelistedUsers={whitelistedUsers}
          onWhitelistUpdate={onWhitelistUpdate}
         />
      }

    </header>
  );
};
