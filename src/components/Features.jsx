const Features = () => {
  const features = [
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#667eea" strokeWidth="2"/>
          <path d="M24 12V24L32 28" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Instant Loans",
      description: "Access liquidity in seconds with our streamlined lending protocol"
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="12" y="12" width="24" height="24" rx="4" stroke="#667eea" strokeWidth="2"/>
          <path d="M24 20V28M20 24H28" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Flexible Collateral",
      description: "Support for multiple asset types including NFTs and tokens"
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 12L32 20L24 28L16 20L24 12Z" stroke="#667eea" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M24 28L32 36L24 44L16 36L24 28Z" stroke="#667eea" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Decentralized",
      description: "Non-custodial protocol with full user control over assets"
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="24" r="6" stroke="#667eea" strokeWidth="2"/>
          <circle cx="30" cy="24" r="6" stroke="#667eea" strokeWidth="2"/>
          <path d="M24 18V30" stroke="#667eea" strokeWidth="2"/>
        </svg>
      ),
      title: "Fair Rates",
      description: "Competitive interest rates driven by market dynamics"
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 12L12 24L24 36L36 24L24 12Z" stroke="#667eea" strokeWidth="2"/>
          <path d="M24 20L20 24L24 28L28 24L24 20Z" stroke="#667eea" strokeWidth="2"/>
        </svg>
      ),
      title: "Secure Smart Contracts",
      description: "Audited by leading security firms for maximum protection"
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="12" y="16" width="24" height="20" rx="2" stroke="#667eea" strokeWidth="2"/>
          <path d="M16 16V12C16 8 20 8 24 8C28 8 32 8 32 12V16" stroke="#667eea" strokeWidth="2"/>
        </svg>
      ),
      title: "Protected Deposits",
      description: "Insurance fund to protect lenders and borrowers"
    }
  ];

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
