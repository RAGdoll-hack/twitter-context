console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("-1");
  if (message.type === "GET_OEMBED") {
    (async () => {
      let response = { videoUrl: null };
        console.log("0");
      try {
        console.log("1");
        const res = await fetch(
          `https://publish.twitter.com/oembed?url=${encodeURIComponent(
            message.url
          )}`
        );
        console.log("2");
        const json = await res.json();
        const match = json.html.match(
          /https:\/\/pic\.twitter\.com\/([a-zA-Z0-9]+)/
        );
        if (match) {
          response.videoUrl = `https://pic.twitter.com/${match[1]}`;
        }
      } catch (err) {
        console.error("oEmbed fetch failed:", err);
      } finally {
        sendResponse(response); // 必ず応答を返す
      }
    })();
    return true; // 非同期応答
  }
});
