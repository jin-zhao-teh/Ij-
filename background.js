chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getRank") {
    chrome.storage.local.get("userRank", (result) => {
      sendResponse({ result: result.userRank || "" });
    });
    return true;
  } else if (request.action === "injectScript") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: [request.file],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }
          sendResponse({ results });
        }
      );
    });
    return true;
  }
});
