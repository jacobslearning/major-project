import React, { useState, useEffect } from "react";
import s from "../styles/LiveFeed.module.css";
const API_KEY = process.env.REACT_APP_API_KEY;

const channels = {
  Europe: [
    {
      name: "Sky News",
      channelId: "UCoMdktPbSTixAyNGwb-UYkQ",
      country: "UK",
      accent: "#ff5e5e",
    },
    {
      name: "BBC News",
      channelId: "UC16niRr50-MSBwiO3YDb3RA",
      country: "UK",
      accent: "#ff5e5e",
    },
    {
      name: "France 24",
      channelId: "UCCCPCZNChQdGa9EkATeye4g",
      country: "France",
      accent: "#00afff",
    },
    {
      name: "France 24 EN",
      channelId: "UCQfwfsi5VrQ8yKZ-UWmAEFg",
      country: "France",
      accent: "#00afff",
    },
  ],
  "North America": [
    {
      name: "CNN",
      channelId: "UCupvZG-5ko_eiXAupbDfxWw",
      country: "USA",
      accent: "#ff5e5e",
    },
    {
      name: "Fox News",
      channelId: "UCJg9wBPyKMNA5sRDnvzmkdg",
      country: "USA",
      accent: "#00afff",
    },
  ],
  "Latin America": [
    {
      name: "CNN Brazil",
      channelId: "UCvdwhh_fDyWccR42-rReZLw",
      country: "Brazil",
      accent: "#00afff",
    },
    {
      name: "Record News",
      channelId: "UCuiLR4p6wQ3xLEm15pEn1Xw",
      country: "Brazil",
      accent: "#ff5e5e",
    },
  ],
  Asia: [
    {
      name: "TBS News Dig",
      channelId: "UC6AG81pAkf6Lbi_1VC5NmPA",
      country: "🇯Japan",
      accent: "#ff5e5e",
    },
    {
      name: "ANN News",
      channelId: "UCGCZAYq5Xxojl_tSXcVJhiQ",
      country: "Japan",
      accent: "#00afff",
    },
  ],
  "Middle East": [
    {
      name: "Al Arabiya",
      channelId: "UCahpxixMCwoANAftn6IxkTg",
      country: "KSA",
      accent: "#00afff",
    },
    {
      name: "Al Jazeera EN",
      channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg",
      country: "Qatar",
      accent: "#ff5e5e",
    },
  ],
  Africa: [
    {
      name: "Africanews",
      channelId: "UC1_E8NeF5QHY2dtdLRBCCLA",
      country: "Africa",
      accent: "#00afff",
    },
  ],
  Oceania: [
    {
      name: "ABC News AU",
      channelId: "UCVgO39Bk5sMo66-6o6Spn6Q",
      country: "Australia",
      accent: "#00afff",
    },
  ],
};

const allChannels = Object.values(channels).flat();

export default function LiveFeed() {
  const [selected, setSelected] = useState(allChannels[0]);
  const [openRegion, setOpenRegion] = useState("Europe");
  const [videoId, setVideoId] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [channelStatus, setChannelStatus] = useState({});

  useEffect(() => {
    async function fetchLiveVideo() {
      setLoading(true);
      setVideoId(null);
      setIsLive(true);

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${selected.channelId}&eventType=live&type=video&key=${API_KEY}`,
        );

        const data = await res.json();

        if (!data.items || data.items.length === 0) {
          setIsLive(false);
          setLoading(false);
          setChannelStatus((prev) => ({
            ...prev,
            [selected.name]: false,
          }));
          return;
        }

        const videoIds = data.items.map((item) => item.id.videoId).join(",");
        // if multiple live streams, choose highest viewer count
        const detailsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoIds}&key=${API_KEY}`,
        );

        const detailsData = await detailsRes.json();

        let streams = detailsData.items;

        streams = streams.filter(
          (v) => v.snippet.liveBroadcastContent === "live",
        );

        if (streams.length === 0) {
          setIsLive(false);
          setLoading(false);
          setChannelStatus((prev) => ({
            ...prev,
            [selected.name]: false,
          }));
          return;
        }

        streams.sort((a, b) => {
          const viewersA = Number(
            a.liveStreamingDetails?.concurrentViewers || 0,
          );
          const viewersB = Number(
            b.liveStreamingDetails?.concurrentViewers || 0,
          );

          if (viewersA !== viewersB) return viewersB - viewersA;

          return (
            new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)
          );
        });

        setVideoId(streams[0].id);
        setChannelStatus((prev) => ({
          ...prev,
          [selected.name]: true,
        }));
      } catch (err) {
        console.error("YouTube error:", err);
        setIsLive(false);
      }

      setLoading(false);
    }

    fetchLiveVideo();
  }, [selected]);

  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : null;

  return (
    <div className={s.root}>
      <div className={s.layout}>
        <aside className={s.sidebar}>
          <div className={s.sidebarTop}>
            <span className={s.liveDot} />
            <span className={s.sidebarLabel}>LIVE CHANNELS</span>
          </div>

          {Object.entries(channels).map(([region, chs]) => {
            const isOpen = openRegion === region;
            const hasActive = chs.some((c) => c.name === selected.name);
            return (
              <div key={region}>
                <button
                  className={s.regionBtn}
                  style={{
                    color: isOpen || hasActive ? "#fff" : "#888",
                  }}
                  onClick={() => setOpenRegion(isOpen ? null : region)}
                >
                  <span className={s.regionLabel}>{region}</span>
                  <span className={s.chevron}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {(isOpen || hasActive) && (
                  <div>
                    {chs.map((ch) => {
                      const active = ch.name === selected.name;
                      const status = channelStatus[ch.name];
                      return (
                        <button
                          key={ch.name}
                          className={s.chanBtn}
                          style={{
                            background: active ? "#1e2026" : "transparent",
                            borderLeft: `3px solid ${active ? "#ff5e5e" : "transparent"}`,
                          }}
                          onClick={() => setSelected(ch)}
                        >
                          <div className={s.chanRow}>
                            <div>
                              <div
                                className={s.chanName}
                                style={{
                                  color: active ? "#fff" : "#ccc",
                                }}
                              >
                                {ch.name}
                              </div>
                              <div className={s.chanCountry}>{ch.country}</div>
                            </div>
                            <span
                              className={s.liveBadge}
                              style={{
                                background: active
                                  ? status === false
                                    ? "#444"
                                    : "#ff5e5e"
                                  : "#2a2a2a",
                                color: active ? "#fff" : "#555",
                              }}
                            >
                              ●{" "}
                              {status === undefined
                                ? "…"
                                : status
                                  ? "LIVE"
                                  : "OFFLINE"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        <main className={s.main}>
          <div className={s.playerBar}>
            <div className={s.playerMeta}>
              <span
                className={s.liveTag}
                style={{
                  background: isLive ? "#ff5e5e" : "#444",
                  color: "#fff",
                }}
              >
                ● {loading ? "LOADING" : isLive ? "LIVE" : "OFFLINE"}
              </span>
              <span className={s.playerTitle}>{selected.name}</span>
              <span className={s.playerCountry}>{selected.country}</span>
            </div>
            <div className={s.divider} />
          </div>

          <div className={s.videoWrap}>
            {loading && (
              <div className={s.centerMsg}>Loading live stream...</div>
            )}

            {!loading && !isLive && (
              <div className={s.centerMsg}>No live stream available</div>
            )}

            {!loading && isLive && videoId && (
              <iframe
                key={videoId}
                src={embedSrc}
                title={`${selected.name} Live`}
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className={s.iframe}
              />
            )}
          </div>

          <div className={s.strip}>
            {allChannels.map((ch) => {
              const active = ch.name === selected.name;
              return (
                <button
                  key={ch.name}
                  onClick={() => setSelected(ch)}
                  className={s.stripBtn}
                  style={{
                    color: active ? "#fff" : "#555",
                    borderBottom: `2px solid ${active ? "#ff5e5e" : "transparent"}`,
                  }}
                >
                  {ch.name}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
