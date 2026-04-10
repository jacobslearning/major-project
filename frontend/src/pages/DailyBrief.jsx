import React, { useEffect, useState } from "react";
import axios from "axios";

const RSS_URL =
  "https://corsproxy.io/?url=https://www.conflicts.app/api/v1/rss/briefs";
const QUERY_PARAMS = {};

function parseBriefsFromXML(xmlString) {
  const parser = new window.DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const items = Array.from(xml.getElementsByTagName("item"));
  return items.map((item) => {
    let content = "";
    const contentNodes = item.getElementsByTagName("content:encoded");
    if (contentNodes.length > 0) {
      content = contentNodes[0].textContent;
    }
    return {
      title: item.getElementsByTagName("title")[0]?.textContent,
      link: item.getElementsByTagName("link")[0]?.textContent,
      pubDate: item.getElementsByTagName("pubDate")[0]?.textContent,
      description: item.getElementsByTagName("description")[0]?.textContent,
      content,
      guid: item.getElementsByTagName("guid")[0]?.textContent,
    };
  });
}

const DailyBrief = () => {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get(RSS_URL, {
        headers: { Accept: "application/rss+xml" },
        params: QUERY_PARAMS,
        responseType: "text",
      })
      .then((res) => {
        const briefs = parseBriefsFromXML(res.data);
        setBriefs(briefs);
      })
      .catch(async (err) => {
        axios
          .get("http://localhost:8000/daily-brief/")
          .then((res) => {
            const briefs = parseBriefsFromXML(res.data);
            setBriefs(briefs);
          })
          .catch((err) => console.error(err));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="daily-brief-container">
        <div className="loading">Loading daily briefs...</div>
      </div>
    );
  if (error)
    return (
      <div className="daily-brief-container">
        <div className="error">{error}</div>
      </div>
    );

  const mainBrief = briefs[0];
  const keyBriefs = briefs.slice(1, 6);
  // maybe show other daily briefings somewhere? recent 5 is stored in keyBriefs
  let displayDate = "";
  if (mainBrief?.pubDate) {
    const dateObj = new Date(mainBrief.pubDate);
    displayDate = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    displayDate +=
      " | " +
      dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="daily-brief-container">
      <div className="brief-header">
        <div className="brief-title">DAILY INTELLIGENCE BRIEF</div>
        <div className="brief-subtitle">OPERATION EPIC FURY / ROARING LION</div>
        <div className="brief-date">{displayDate}</div>
      </div>

      <div className="brief-section">
        <div
          className="brief-summary styled-html"
          dangerouslySetInnerHTML={{
            __html:
              mainBrief?.content ||
              mainBrief?.description ||
              "No summary available.",
          }}
        />
      </div>
    </div>
  );
};

export default DailyBrief;
