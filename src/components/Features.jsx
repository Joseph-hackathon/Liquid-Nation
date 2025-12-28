import { features } from '../data';

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <h2 className="section-title">Why Choose Liquidnation?</h2>
        <p className="section-subtitle">Built for the decentralized future of finance</p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
