document.addEventListener('DOMContentLoaded', () => {
  // Load stats from chrome.storage
  chrome.storage.local.get(['bestLevel', 'bestScore', 'totalGames'], (data) => {
    document.getElementById('bestLevel').textContent = data.bestLevel || 1;
    document.getElementById('bestScore').textContent = data.bestScore || 0;
    document.getElementById('totalGames').textContent = data.totalGames || 0;
  });

  document.getElementById('playBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('game.html') });
    window.close();
  });
});
