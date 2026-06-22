const INSTAGRAM_HOST = 'https://www.instagram.com/';

chrome.action.onClicked.addListener(async tab => {
  if (tab.id === undefined || tab.url === undefined || !tab.url.startsWith(INSTAGRAM_HOST)) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      sessionStorage.setItem('engagement_guard_start_mode', 'engagement');
    },
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['dist.js'],
  });
});
