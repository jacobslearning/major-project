const Header = () => {
  return (
    <header className="header">
      <h1>Overseas Incident Monitoring</h1>

      <div className="filters">
        <label>
          From:
          <input type="date" />
        </label>

        <label>
          To:
          <input type="date" />
        </label>
      </div>
    </header>
  );
};

export default Header;
