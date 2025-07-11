document.getElementById("helloBtn").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    const activeTabId = activeTab.id;
    chrome.tabs.sendMessage(activeTabId, { type: "require_words" }, (response) => {

      if (chrome.runtime.lastError) {
        console.error("Error sending message to content script:", chrome.runtime.lastError);
        return;
      }

      if (response && response.text) {
        const blob = new Blob([response.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: "known.txt",
          saveAs: true
        });
      } else {
        console.error("No response or text received from content script.");
      }

    });
  });
});
