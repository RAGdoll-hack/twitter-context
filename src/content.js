// oEmbed経由で動画URLを取得（background.js経由でfetch）
const getVideoUrlFromOEmbed = (tweetUrl) => {
  console.log("-2");
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "GET_OEMBED", url: tweetUrl },
        (response) => {
          console.log("レスポンス（from background）:", response); // ← これで呼ばれているか確認
          // 応答がない場合や通信エラーの場合はnullを返す
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            resolve(null);
            return;
          }
          resolve(response?.videoUrl || null);
        }
      );
    } catch (err) {
      console.error("Failed to send message to background:", err);
      resolve(null);
    }
  });
};

// ツイートデータを受け取るリスナー
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_TWEETS") {
    (async () => {
      try {
        // ページ上にツイートが存在するか確認
        const tweets = Array.from(
          document.querySelectorAll('article[data-testid="tweet"]')
        );

        if (tweets.length === 0) {
          console.log("No tweets found on the page");
          sendResponse({ tweets: [] });
          return;
        }

        const extracted = await Promise.all(
          tweets.map(async (article) => {
            try {
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
            } catch (err) {
              console.error("Error processing tweet:", err);
              // エラーが発生した場合でも処理を続行するため、nullを返す
              return null;
            }
          })
        );

        // nullの要素を除外し、必要な属性を持つツイートのみをフィルタリング
        const validTweets = extracted
          .filter(item => item !== null)
          .filter(item => item.datetime && item.text);

        sendResponse({
          tweets: validTweets,
        });
      } catch (err) {
        console.error("Error in content script:", err);
        // エラーが発生した場合でも必ず応答を返す
        sendResponse({ tweets: [] });
      }
    })();

    return true; // 非同期応答を明示
  }
});
