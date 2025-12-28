import { heroStats } from '../data';

const Hero = ({ onLaunchApp }) => {
  const handleLearnMore = (e) => {
    e.preventDefault();
    const featuresSection = document.querySelector('#features');
    if (featuresSection) {
      const offsetTop = featuresSection.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            Unlock Liquidity with <span className="gradient-text">Liquidnation</span>
          </h1>
          <p className="hero-description">
            The premier decentralized protocol for collateralized lending and borrowing. 
            Access instant liquidity without selling your assets.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary btn-large" onClick={onLaunchApp}>Get Started</button>
            <button className="btn-secondary btn-large" onClick={handleLearnMore}>Learn More</button>
          </div>
          <div className="hero-stats">
            {heroStats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
