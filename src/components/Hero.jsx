import { heroStats } from '../data';
import AnimatedBackground from './AnimatedBackground';

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
      <AnimatedBackground />
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            Trade Across Chains with<br />
            <span className="gradient-text">Liquid Nation</span>
          </h1>
          <p className="hero-description">
            The premier decentralized P2P exchange for seamless cross-chain trading. 
            Swap assets directly with peers across multiple blockchain networks.
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
