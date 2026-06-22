import React from 'react';

interface NotSearchingProps {
  onScan?: () => void;
  onEngagementPreview?: () => void;
}

export const NotSearching = ({ onScan, onEngagementPreview }: NotSearchingProps) => (
  <section className='launch-screen'>
    <div className='launch-copy'>
      <span className='eyebrow'>Private Instagram audit</span>
      <h1>Review weak signals before you act.</h1>
      <p>
        Start with follow-back status today, then layer in post likes, story views,
        mute candidates, and top supporter ranking as the tool grows.
      </p>
      <div className='launch-actions'>
        <button className='run-scan' onClick={onScan}>
          Run Follow Audit
        </button>
        <button className='copy-list' onClick={onEngagementPreview}>
          Preview Engagement
        </button>
        <span className='launch-note'>Runs in this browser session only</span>
      </div>
    </div>
    <div className='launch-panel' aria-hidden='true'>
      <div className='scan-orbit'>
        <span />
        <span />
        <span />
      </div>
      <div className='signal-card primary'>
        <span>Ready</span>
        <strong>0%</strong>
      </div>
      <div className='signal-card'>
        <span>Protected list</span>
        <strong>Safeguards</strong>
      </div>
      <div className='signal-card accent'>
        <span>Action mode</span>
        <strong>Manual first</strong>
      </div>
    </div>
  </section>
);
