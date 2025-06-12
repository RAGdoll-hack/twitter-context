// oEmbed経由で動画URLを取得（background.js経由でfetch）
const getVideoUrlFromOEmbed = (tweetUrl) => {
  console.log("-2");
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_OEMBED", url: tweetUrl },
      (response) => {
        console.log("レスポンス（from background）:", response); // ← これで呼ばれているか確認
        resolve(response?.videoUrl || null);
      }
    );
  });
};

// ツイートデータを受け取るリスナー
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_TWEETS") {
    (async () => {
      const tweets = Array.from(
        document.querySelectorAll('article[data-testid="tweet"]')
      );

      const extracted = await Promise.all(
        tweets.map(async (article) => {
          // 種類（通常・リツイート・引用）
          const svgPaths = article.querySelectorAll("svg path");
          const isRetweet = Array.from(svgPaths).some((path) =>
            path.getAttribute("d")?.startsWith("M4.75 3.79l4.603 4.3")
          );
          const isQuoteTweet =
            article.querySelector('div[role="link"]') !== null;

          let type = "tweet";
          if (isRetweet) {
            type = "retweet";
          } else if (isQuoteTweet) {
            type = "quote_tweet";
          }

          // 各種基本情報
          const timeTag = article.querySelector("time");
          const textTag = article.querySelector('[data-testid="tweetText"]');
          const datetime = timeTag?.getAttribute("datetime") || null;
          const tweetUrl = timeTag?.closest("a")?.href || null;
          const username =
            article.querySelector('div[dir="ltr"] span')?.textContent || null;
          const displayName =
            article.querySelector('[data-testid="User-Name"] span')
              ?.textContent || null;

          // 画像URL抽出（pbs.twimg.com のみ対象）
          const imgTags = article.querySelectorAll("img");
          const imageUrls = Array.from(imgTags)
            .map((img) => img.getAttribute("src"))
            .filter((src) => src?.includes("pbs.twimg.com/media"));

          // oEmbed経由で動画URL取得
          let videoUrl = null;
          if (tweetUrl) {
            try {
              videoUrl = await getVideoUrlFromOEmbed(tweetUrl);
            } catch (e) {
              console.error("background fetch error", e);
            }
          }

          return {
            type,
            user: displayName || null,
            username: username || null,
            text: textTag?.textContent || null,
            datetime,
            url: tweetUrl,
            images: imageUrls,
            video: videoUrl,
          };
        })
      );

      sendResponse({
        tweets: extracted.filter((item) => item.datetime && item.text),
      });
    })();

    return true; // 非同期応答を明示
  }
});
