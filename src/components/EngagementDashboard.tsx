import React, { useState } from 'react';
import { State } from '../model/state';
import { getProfilesForEngagementDisplay } from '../utils/engagement-preview';
import { buildEngagementProfilesFromImport } from '../utils/engagement-import';
import { buildTargetUserInvestigation } from '../utils/target-investigation';
import { buildManualStorySnapshot } from '../utils/manual-snapshot';

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

const signalLabel = {
  post_like: 'Post like',
  post_comment: 'Post comment',
  story_view: 'Story view',
  story_reaction: 'Story reaction',
  profile_observation: 'Profile observation',
};

export const EngagementDashboard = ({ state, setState }: EngagementDashboardProps) => {
  const [importText, setImportText] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [storyId, setStoryId] = useState('');
  const [storyViewers, setStoryViewers] = useState('');
  const [storyReactors, setStoryReactors] = useState('');
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
  const isEmptySmokeMode = state.profiles.length === 0 && state.signals.length === 0;

  const topSupporters = state.profiles.filter(profile => profile.recommendation === 'keep').length;
  const possibleMuted = state.profiles.filter(profile => profile.recommendation === 'possible_muted').length;
  const possibleWatchers = state.profiles.filter(profile => profile.recommendation === 'possible_watcher').length;
  const nonFollowerWatchers = state.profiles.filter(profile => profile.relationshipKnown
    && !profile.followsViewer
    && profile.storyViews + profile.storyReactions + profile.postLikes + profile.postComments + profile.profileObservations > 0).length;
  const importJson = (jsonText: string) => {
    try {
      const imported = buildEngagementProfilesFromImport(jsonText);
      setState({
        ...state,
        profiles: imported.profiles,
        signals: imported.signals,
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
  const importManualStorySnapshot = () => {
    const snapshot = buildManualStorySnapshot(storyId, storyViewers, storyReactors);
    const jsonText = JSON.stringify({
      subjects: [
        ...snapshot.viewedBy,
        ...snapshot.reactedBy,
      ],
      stories: [snapshot],
    });

    importJson(jsonText);
    setStoryId('');
    setStoryViewers('');
    setStoryReactors('');
  };
  const targetProfile = state.profiles.find(
    profile => profile.username.toLowerCase() === targetUsername.trim().toLowerCase(),
  );
  const targetInvestigation = targetUsername.trim() === ''
    ? null
    : buildTargetUserInvestigation(
      targetUsername,
      state.signals,
      targetProfile === undefined || !targetProfile.relationshipKnown
        ? undefined
        : {
          followsViewer: targetProfile.followsViewer,
          followedByViewer: targetProfile.followedByViewer,
        },
    );

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
            <p><span>Known non-followers</span><strong>{nonFollowerWatchers}</strong></p>
          </div>
          <div className='target-investigation-panel'>
            <h4>Target Check</h4>
            <p>
              Add a username to check whether imported observations contain interest signals.
            </p>
            <input
              type='text'
              value={targetUsername}
              placeholder='username'
              onChange={event => setTargetUsername(event.currentTarget.value)}
            />
            {targetInvestigation !== null && (
              <div className={`target-investigation-result confidence-${targetInvestigation.confidence}`}>
                <strong>{targetInvestigation.confidence} confidence</strong>
                <p>{targetInvestigation.summary}</p>
                <ul>
                  {targetInvestigation.signals.slice(0, 5).map(signal => (
                    <li key={`${signal.type}:${signal.sourceId}:${signal.observedAt}`}>
                      {signalLabel[signal.type]} · {signal.sourceId}
                    </li>
                  ))}
                  {targetInvestigation.signals.length === 0 && (
                    <li>No observed imported signal yet.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <p className='engagement-note'>
            {isEmptySmokeMode
              ? 'Step 1: paste story viewers below. Step 2: use Target Check or tabs. We do not auto-read Instagram yet.'
              : 'This dashboard uses imported/manual snapshots. Relationship unknown means we have not matched followers yet.'}
          </p>
          <div className='manual-snapshot-panel'>
            <h4>1. Add Story Viewers</h4>
            <p>
              Open your active story viewer list in Instagram, then paste visible usernames here.
              This only records that these users viewed that story.
            </p>
            <input
              type='text'
              value={storyId}
              placeholder='story label, optional'
              onChange={event => setStoryId(event.currentTarget.value)}
            />
            <textarea
              value={storyViewers}
              placeholder='viewer usernames, for example:&#10;username1&#10;username2&#10;@username3'
              onChange={event => setStoryViewers(event.currentTarget.value)}
            />
            <textarea
              value={storyReactors}
              placeholder='reaction usernames, optional'
              onChange={event => setStoryReactors(event.currentTarget.value)}
            />
            <button
              type='button'
              className='button-secondary'
              onClick={importManualStorySnapshot}
              disabled={storyViewers.trim() === '' && storyReactors.trim() === ''}
            >
              Add Story Snapshot
            </button>
          </div>
          <div className='engagement-import-panel'>
            <h4>Advanced JSON Import</h4>
            <p>
              Optional: paste a full JSON fixture for posts, comments, stories, and known relationships.
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
        <section className='engagement-flow-guide'>
          <div>
            <span className='eyebrow'>Current test mode</span>
            <h2>Manual story snapshot first</h2>
            <p>
              This screen does not scrape Instagram automatically yet. Paste story viewers from an active
              story, then the dashboard scores only the evidence you imported.
            </p>
          </div>
          <ol>
            <li><strong>Paste viewers</strong><span>Use the left “Add Story Viewers” box.</span></li>
            <li><strong>Review signals</strong><span>Story views appear as imported evidence.</span></li>
            <li><strong>Match later</strong><span>Follower status stays unknown until relationship import.</span></li>
          </ol>
        </section>
        <nav className='tabs-container'>
          {([
            ['all', 'All'],
            ['top_supporters', 'Top supporters'],
            ['low_interest', 'Low interest'],
            ['possible_muted', 'Possible muted'],
            ['possible_watchers', 'Watchers'],
            ['non_follower_watchers', 'Known non-followers'],
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
                {!profile.relationshipKnown && (
                  <span className='fs-medium'>Relationship unknown</span>
                )}
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
        {profilesForDisplay.length === 0 && (
          <article className='result-item engagement-empty-state'>
            <h2>No engagement data yet</h2>
            <p>
              Start with the left panel: paste usernames into Add Story Viewers and click Add Story Snapshot.
              The first result will prove the pipeline works without unfollowing or muting anyone.
            </p>
          </article>
        )}
      </article>
    </section>
  );
};
