import React, { useState } from 'react';
import { State } from '../model/state';
import { getProfilesForEngagementDisplay } from '../utils/engagement-preview';
import { buildEngagementProfilesFromImport } from '../utils/engagement-import';

interface EngagementDashboardProps {
  readonly state: State;
  readonly setState: (state: State) => void;
}

const recommendationLabel = {
  keep: 'Top supporter',
  review: 'Review',
  low_interest: 'Low interest',
  possible_muted: 'Possible muted',
  possible_watcher: 'Possible watcher',
  target_watch: 'Target watch',
};

export const EngagementDashboard = ({ state, setState }: EngagementDashboardProps) => {
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<
    { readonly type: 'success' | 'error'; readonly text: string } | null
  >(null);

  if (state.status !== 'engagement') {
    return null;
  }

  const profilesForDisplay = getProfilesForEngagementDisplay(
    state.profiles,
    state.currentTab,
    state.searchTerm,
  );

  const topSupporters = state.profiles.filter(profile => profile.recommendation === 'keep').length;
  const possibleMuted = state.profiles.filter(profile => profile.recommendation === 'possible_muted').length;
  const possibleWatchers = state.profiles.filter(profile => profile.recommendation === 'possible_watcher').length;
  const importJson = (jsonText: string) => {
    try {
      const imported = buildEngagementProfilesFromImport(jsonText);
      setState({
        ...state,
        profiles: imported.profiles,
        sampleWindow: imported.sampleWindow,
        currentTab: 'all',
        searchTerm: '',
      });
      setImportText('');
      setImportMessage({
        type: 'success',
        text: `Imported ${imported.profiles.length} profiles from fixture JSON.`,
      });
    } catch (error) {
      setImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  };

  return (
    <section className='workspace-layout engagement-workspace'>
      <aside className='app-sidebar'>
        <div className='sidebar-content'>
          <div className='panel-heading'>
            <span>Engagement</span>
            <strong>{state.profiles.length}</strong>
          </div>
          <div className='sidebar-summary'>
            <h4>Sample Window</h4>
            <div className='summary-grid'>
              <div className='summary-item'>
                <span>Posts</span>
                <strong>{state.sampleWindow.sampledPosts}</strong>
              </div>
              <div className='summary-item'>
                <span>Stories</span>
                <strong>{state.sampleWindow.sampledStories}</strong>
              </div>
              <div className='summary-item'>
                <span>Confidence</span>
                <strong>{state.profiles[0]?.confidence ?? 'low'}</strong>
              </div>
            </div>
          </div>
          <div className='sidebar-stats metric-stack'>
            <p><span>Top supporters</span><strong>{topSupporters}</strong></p>
            <p><span>Possible muted</span><strong>{possibleMuted}</strong></p>
            <p><span>Possible watchers</span><strong>{possibleWatchers}</strong></p>
          </div>
          <p className='engagement-note'>
            Preview uses fixture snapshots only. It does not call Instagram endpoints or infer mute/stalk status as fact.
          </p>
          <div className='engagement-import-panel'>
            <h4>Fixture Import</h4>
            <p>
              Paste normalized snapshots or raw response pairs for posts/stories. This recalculates the dashboard locally.
            </p>
            <textarea
              value={importText}
              placeholder='{"subjects":[],"posts":[],"stories":[]}'
              onChange={event => setImportText(event.currentTarget.value)}
            />
            <div className='engagement-import-actions'>
              <button
                type='button'
                className='button-secondary'
                onClick={() => importJson(importText)}
                disabled={importText.trim() === ''}
              >
                Import JSON
              </button>
              <label className='button-secondary file-import-label'>
                File
                <input
                  type='file'
                  accept='application/json,.json'
                  onChange={async event => {
                    const file = event.currentTarget.files?.[0];
                    if (file === undefined) {
                      return;
                    }
                    importJson(await file.text());
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            {importMessage !== null && (
              <p className={`engagement-import-message ${importMessage.type}`}>
                {importMessage.text}
              </p>
            )}
          </div>
        </div>
      </aside>
      <article className='results-container engagement-results'>
        <nav className='tabs-container'>
          {([
            ['all', 'All'],
            ['top_supporters', 'Top supporters'],
            ['low_interest', 'Low interest'],
            ['possible_muted', 'Possible muted'],
            ['possible_watchers', 'Watchers'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type='button'
              className={`tab ${state.currentTab === tab ? 'tab-active' : ''}`}
              onClick={() => setState({ ...state, currentTab: tab })}
            >
              {label}
            </button>
          ))}
        </nav>
        {profilesForDisplay.map(profile => (
          <article className='result-item engagement-profile' key={profile.userId}>
            <div className='engagement-profile-main'>
              <div>
                <a
                  className='fs-xlarge'
                  target='_blank'
                  href={`/${profile.username}`}
                  rel='noreferrer'
                >
                  {profile.username}
                </a>
                <span className='fs-medium'>{profile.fullName}</span>
              </div>
              <span className={`recommendation-pill recommendation-${profile.recommendation}`}>
                {recommendationLabel[profile.recommendation]}
              </span>
            </div>
            <div className='engagement-score'>
              <strong>{profile.score}</strong>
              <span>/100</span>
            </div>
            <dl className='engagement-metrics'>
              <div><dt>Likes</dt><dd>{profile.postLikes}</dd></div>
              <div><dt>Comments</dt><dd>{profile.postComments}</dd></div>
              <div><dt>Story views</dt><dd>{profile.storyViews}</dd></div>
              <div><dt>Story reacts</dt><dd>{profile.storyReactions}</dd></div>
            </dl>
            <p className='engagement-reason'>{profile.reasons.join(' ')}</p>
          </article>
        ))}
      </article>
    </section>
  );
};
