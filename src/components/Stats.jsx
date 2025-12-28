const Stats = () => {
  const stats = [
    { value: "$2.5B+", label: "Total Value Locked" },
    { value: "50,000+", label: "Active Users" },
    { value: "125,000+", label: "Total Loans" },
    { value: "98.5%", label: "Loan Repayment Rate" },
    { value: "4.5%", label: "Avg. Interest Rate" },
    { value: "15+", label: "Supported Chains" }
  ];

  return (
    <section id="stats" className="stats-section">
      <div className="container">
        <h2 className="section-title">Protocol Statistics</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-card-value">{stat.value}</div>
              <div className="stat-card-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
