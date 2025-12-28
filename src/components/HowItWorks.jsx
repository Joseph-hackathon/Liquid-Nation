import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to get started"
    },
    {
      number: "2",
      title: "Deposit Collateral",
      description: "Lock your assets as collateral for a loan"
    },
    {
      number: "3",
      title: "Borrow",
      description: "Receive funds instantly to your wallet"
    },
    {
      number: "4",
      title: "Repay & Unlock",
      description: "Repay the loan and retrieve your collateral"
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple steps to unlock your liquidity</p>
        <div className="steps">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="step">
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="step-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
