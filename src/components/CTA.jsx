const CTA = ({ onLaunchApp }) => {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <h2>Ready to unlock your liquidity?</h2>
          <p>Join thousands of users already using Liquid Nation</p>
          <button className="btn-primary btn-large" onClick={onLaunchApp}>Launch App Now</button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
