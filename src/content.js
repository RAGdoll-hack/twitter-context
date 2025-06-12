// oEmbed経由で動画URLを取得（background.js経由でfetch）
const getVideoUrlFromOEmbed = (tweetUrl) => {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "GET_OEMBED", url: tweetUrl },
        (response) => {
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
        const tweets = Array.from(
          document.querySelectorAll('article[data-testid="tweet"]')
        );

        if (tweets.length === 0) {
          console.log("No tweets found on the page");
          sendResponse({ tweets: { tweet: [], retweet: [], quote_tweet: [] } });
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

              const timeTag = article.querySelector("time");
              const textTag = article.querySelector(
                '[data-testid="tweetText"]'
              );
              const datetime = timeTag?.getAttribute("datetime") || null;
              const tweetUrl = timeTag?.closest("a")?.href || null;
              const displayName =
                article.querySelector('[data-testid="User-Name"] span')
                  ?.textContent || null;

              const imgTags = article.querySelectorAll("img");
              const imageUrls = Array.from(imgTags)
                .map((img) => img.getAttribute("src"))
                .filter((src) => src?.includes("pbs.twimg.com/media"));

              let videoUrl = null;
              if (tweetUrl) {
                const hasVideo =
                  article.querySelector('[data-testid="videoComponent"]') !==
                  null;

                if (hasVideo) {
                  try {
                    videoUrl = await getVideoUrlFromOEmbed(tweetUrl);
                  } catch (e) {
                    console.error("background fetch error", e);
                  }
                }
              }

              return {
                type,
                user: displayName || null,
                text: textTag?.textContent || null,
                datetime,
                url: tweetUrl,
                images: imageUrls,
                video: videoUrl,
              };
            } catch (err) {
              console.error("Error processing tweet:", err);
              return null;
            }
          })
        );

        const validTweets = extracted
          .filter((item) => item !== null)
          .filter((item) => item.datetime && item.text);

        // 分類してレスポンス
        const grouped = {
          tweet: [],
          retweet: [],
          quote_tweet: [],
        };

        for (const tweet of validTweets) {
          if (tweet && grouped[tweet.type]) {
            grouped[tweet.type].push(tweet);
          }
        }

        sendResponse({ tweets: grouped });
      } catch (err) {
        console.error("Error in content script:", err);
        sendResponse({ tweets: { tweet: [], retweet: [], quote_tweet: [] } });
      }
    })();

    return true;
  }
});
