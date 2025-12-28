import { protocolStats } from '../data';

const Stats = () => {
  return (
    <section id="stats" className="stats-section">
      <div className="container">
        <h2 className="section-title">Protocol Statistics</h2>
        <div className="stats-grid">
          {protocolStats.map((stat, index) => (
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
