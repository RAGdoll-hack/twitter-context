// Service Workerの起動時に実行されるイベントハンドラ
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Service Workerがアクティブになったときに実行されるイベントハンドラ
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started");
});

// メッセージリスナーを登録
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_OEMBED") {
    (async () => {
      let response = { videoUrl: null };
      try {
        const res = await fetch(
          `https://publish.twitter.com/oembed?url=${encodeURIComponent(
            message.url
          )}`
        );
        const json = await res.json();
        const match = json.html.match(
          /https:\/\/pic\.twitter\.com\/([a-zA-Z0-9]+)/
        );
        if (match) {
          response.videoUrl = `https://pic.twitter.com/${match[1]}`;
        } else if (message.url) {
          // Check if it's a Twitter/X URL
          const twitterMatch = message.url.match(/https?:\/\/(twitter|x)\.com\/([^\/]+)\/status\/(\d+)/);
          if (twitterMatch) {
            const username = twitterMatch[2];
            const statusId = twitterMatch[3];
            response.videoUrl = `https://fxtwitter.com/${username}/status/${statusId}.mp4`;
          }
        }
      } catch (err) {
        console.error("oEmbed fetch failed:", err);
      } finally {
        sendResponse(response);
      }
    })();
    return true; // 非同期応答
  }
});
