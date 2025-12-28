const CTA = ({ onLaunchApp }) => {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <h2>Ready to start trading cross-chain?</h2>
          <p>Join thousands of traders already using Liquid Nation</p>
          <button className="btn-primary btn-large" onClick={onLaunchApp}>Launch App Now</button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
