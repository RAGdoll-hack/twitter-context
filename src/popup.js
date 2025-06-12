document.getElementById("fetch").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { type: "GET_TWEETS" }, (response) => {
    const area = document.getElementById("result");
    area.value = JSON.stringify(response.tweets, null, 2);  // インデント付きJSON
  });
});
