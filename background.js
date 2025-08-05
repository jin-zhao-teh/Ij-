chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getRank') {
    chrome.storage.local.get('userRank', (result) => {
      // result is an object, e.g. { userRank: 'some string' }
      sendResponse({ result: result.userRank || '' });
    });
    // Return true to indicate you will send response asynchronously
    return true;
  }
});
