document.getElementById("fetch").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { type: "GET_TWEETS" }, (response) => {
    const area = document.getElementById("result");
    try {
      if (!response) {
        console.error("Error: No response received");
        area.value = "Error: No response received from the content script.";
        return;
      }
      if (!response.tweets) {
        console.error("Error: No tweets in response", response);
        area.value = "Error: No tweets found in the response.";
        return;
      }
      area.value = JSON.stringify(response.tweets, null, 2);  // インデント付きJSON
    } catch (err) {
      console.error("Error handling response:", err);
      area.value = "Error processing response: " + err.message;
    }
  });
});
