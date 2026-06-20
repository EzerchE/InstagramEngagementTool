import React, { useRef, useState } from 'react';
import { UserNode } from '../model/user';
import { exportWhitelist, importWhitelist, clearWhitelist, mergeWhitelists } from '../utils/whitelist-manager';

interface WhitelistManagerProps {
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

export const WhitelistManager = ({ whitelistedUsers, onWhitelistUpdate }: WhitelistManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    exportWhitelist(whitelistedUsers);
    setMessage({ type: 'success', text: `Exported ${whitelistedUsers.length} users successfully` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
return;
}

    importWhitelist(
      file,
      importedUsers => {
        let finalUsers: readonly UserNode[];

        if (importMode === 'merge') {
          finalUsers = mergeWhitelists(whitelistedUsers, importedUsers);
          const newUsersCount = finalUsers.length - whitelistedUsers.length;
          setMessage({
            type: 'success',
            text: `Merged successfully! Added ${newUsersCount} new users (${importedUsers.length} imported, ${importedUsers.length - newUsersCount} duplicates skipped)`,
          });
        } else {
          finalUsers = importedUsers;
          setMessage({
            type: 'success',
            text: `Replaced whitelist with ${importedUsers.length} users`,
          });
        }

        onWhitelistUpdate(finalUsers);
        setTimeout(() => setMessage(null), 5000);
      },
      errorMessage => {
        setMessage({ type: 'error', text: errorMessage });
        setTimeout(() => setMessage(null), 5000);
      },
    );

    // Reset file input
    event.currentTarget.value = '';
  };

  const handleClear = () => {
    clearWhitelist();
    onWhitelistUpdate([]);
    setMessage({ type: 'success', text: 'Whitelist cleared successfully' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className='whitelist-manager'>
      <div className='whitelist-header'>
        <h4>Protected Accounts</h4>
        <span className='whitelist-count'>
          {whitelistedUsers.length} {whitelistedUsers.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {message && (
        <div className={`whitelist-message ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className='whitelist-actions'>
        <button
          className='btn btn-export'
          onClick={handleExport}
          disabled={whitelistedUsers.length === 0}
          title={whitelistedUsers.length === 0 ? 'No users to export' : 'Export protected accounts to JSON file'}
        >
          Export protected list
        </button>

        <div className='import-section'>
          <div className='import-mode'>
            <label>
              <input
                type='radio'
                name='importMode'
                value='merge'
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Merge (add to existing)
            </label>
            <label>
              <input
                type='radio'
                name='importMode'
                value='replace'
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace (overwrite)
            </label>
          </div>

          <button
            className='btn btn-import'
            onClick={handleImportClick}
            title='Import protected accounts from JSON file'
          >
            Import protected list
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='.json'
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <button
          className='btn btn-clear'
          onClick={handleClear}
          disabled={whitelistedUsers.length === 0}
          title={whitelistedUsers.length === 0 ? 'Protected list is empty' : 'Clear protected account data'}
        >
          Clear protected list
        </button>
      </div>

      <div className='whitelist-info'>
        <p className='info-text'>
          <strong>Tip:</strong> Export protected accounts before large reviews.
          These accounts stay out of action queues.
        </p>
      </div>
    </div>
  );
};
