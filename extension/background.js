const INSTAGRAM_HOST = 'https://www.instagram.com/';

chrome.action.onClicked.addListener(async tab => {
  if (tab.id === undefined || tab.url === undefined || !tab.url.startsWith(INSTAGRAM_HOST)) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      document.documentElement.dataset.engagementGuardStartMode = 'engagement_empty';
      sessionStorage.setItem('engagement_guard_start_mode', 'engagement_empty');
    },
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['dist.js'],
  });
});
