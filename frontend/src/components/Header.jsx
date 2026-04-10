const Header = ({ fromDate, toDate, setFromDate, setToDate }) => {
  const today = new Date();
  const todayString = today.toLocaleDateString("en-GB");
  const timeString = today.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateTimeString = `${todayString} ${timeString}`;

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const twoMonthsAgoString = twoMonthsAgo.toISOString().split("T")[0];

  const handleReset = () => {
    setFromDate(twoMonthsAgoString);
    setToDate(todayString);
  };

  return (
    <header className="header">
      <div className="header-date">{dateTimeString}</div>
      <div style={{ flex: 1 }} />
      <div className="filters">
        <label>
          From:
          <input
            type="date"
            value={fromDate || ""}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          To:
          <input
            type="date"
            value={toDate || ""}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button className="reset-button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </header>
  );
};

export default Header;
