const Header = ({ fromDate, toDate, setFromDate, setToDate }) => {
  const today = new Date().toISOString().split("T")[0];

  const handleReset = () => {
    setFromDate("");
    setToDate(today);
  };

  return (
    <header className="header">
      <h1>Overseas Incident Monitoring</h1>

      <div className="filters">
        <label>
          From:
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>

        <label>
          To:
          <input
            type="date"
            value={toDate}
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
