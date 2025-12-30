import React, { useRef } from 'react';
import { steps } from '../data';

const StepCard = ({ step }) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  return (
    <div 
      className="step"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="step-number">{step.number}</div>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
    </div>
  );
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple steps to trade across chains</p>
        <div className="steps">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <StepCard step={step} index={index} />
              {index < steps.length - 1 && <div className="step-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
