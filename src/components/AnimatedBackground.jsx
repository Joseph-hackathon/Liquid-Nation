import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const themeRef = useRef('dark');
  const shapesRef = useRef([]);
  const mouseRef = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set canvas size
    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resizeCanvas();

    // Get current theme
    const getCurrentTheme = () => {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    };
    themeRef.current = getCurrentTheme();

    // Create particles
    const createParticles = () => {
      const particles = [];
      const particleCount = Math.min(60, Math.floor((width * height) / 12000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.4 + 0.5,
          baseOpacity: Math.random() * 0.4 + 0.5
        });
      }
      return particles;
    };

    // Create floating geometric shapes
    const createShapes = () => {
      const shapes = [];
      const shapeCount = 10;
      
      for (let i = 0; i < shapeCount; i++) {
        shapes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 80 + 50,
          rotation: Math.random() * Math.PI * 2,
          type: Math.random() > 0.5 ? 'square' : 'triangle',
          opacity: 0.15,
          baseOpacity: 0.15,
          scale: 1
        });
      }
      return shapes;
    };

    particlesRef.current = createParticles();
    const shapes = createShapes();
    shapesRef.current = shapes;

    // Get theme colors
    const getColors = () => {
      const isDark = themeRef.current === 'dark';
      return {
        particle: isDark ? 'rgba(29, 211, 215, 1)' : 'rgba(11, 79, 114, 0.8)',
        line: isDark ? 'rgba(29, 211, 215, 0.4)' : 'rgba(11, 79, 114, 0.3)',
        shape: isDark ? 'rgba(29, 211, 215, 0.2)' : 'rgba(11, 79, 114, 0.15)'
      };
    };

    // Draw particles
    const drawParticles = () => {
      const colors = getColors();
      particlesRef.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    };

    // Draw connections between nearby particles
    const drawConnections = () => {
      const colors = getColors();
      const maxDistance = 150;
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.5;
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.strokeStyle = colors.line;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    };

    // Draw geometric shapes
    const drawShapes = (shapes) => {
      const colors = getColors();
      shapes.forEach(shape => {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        ctx.scale(shape.scale, shape.scale);
        ctx.globalAlpha = shape.opacity;
        ctx.strokeStyle = colors.shape;
        ctx.lineWidth = 3;

        if (shape.type === 'square') {
          ctx.strokeRect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -shape.size / 2);
          ctx.lineTo(shape.size / 2, shape.size / 2);
          ctx.lineTo(-shape.size / 2, shape.size / 2);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      });
    };

    // Update particles
    const updateParticles = () => {
      particlesRef.current.forEach(particle => {
        // Mouse interaction
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 200;
          
          if (distance < maxDistance) {
            // Repel particles away from mouse and brighten them
            const force = (1 - distance / maxDistance) * 0.8;
            particle.x -= (dx / distance) * force;
            particle.y -= (dy / distance) * force;
            // Increase opacity on hover
            particle.opacity = Math.min(1, particle.baseOpacity + (1 - distance / maxDistance) * 0.5);
          } else {
            // Reset to base opacity when not near mouse
            particle.opacity = particle.baseOpacity;
          }
        } else {
          particle.opacity = particle.baseOpacity;
        }

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around screen
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
      });

      // Update shapes on mouse hover
      shapesRef.current.forEach(shape => {
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = mouseRef.current.x - shape.x;
          const dy = mouseRef.current.y - shape.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 250;
          
          if (distance < maxDistance) {
            // Scale up and brighten shapes near mouse
            const proximity = 1 - distance / maxDistance;
            shape.scale = 1 + proximity * 0.3;
            shape.opacity = shape.baseOpacity + proximity * 0.2;
          } else {
            // Reset to base values
            shape.scale = 1;
            shape.opacity = shape.baseOpacity;
          }
        } else {
          shape.scale = 1;
          shape.opacity = shape.baseOpacity;
        }
      });
    };

    // Animation loop
    const animateCanvas = () => {
      ctx.clearRect(0, 0, width, height);
      
      updateParticles();
      drawShapes(shapesRef.current);
      drawConnections();
      drawParticles();
      
      animationRef.current = requestAnimationFrame(animateCanvas);
    };

    // Animate shapes with anime.js
    shapesRef.current.forEach((shape, index) => {
      // Rotate shapes continuously
      animate(shape, {
        rotation: `+=${Math.PI * 2}`,
        duration: 20000 + index * 2000,
        ease: 'linear',
        loop: true
      });

      // Move shapes around
      animate(shape, {
        x: [shape.x, Math.random() * width, shape.x],
        y: [shape.y, Math.random() * height, shape.y],
        duration: 30000 + index * 2000,
        ease: 'inOut(sine)',
        loop: true
      });
    });

    // Start animation
    animateCanvas();

    // Handle window resize
    const handleResize = () => {
      resizeCanvas();
      particlesRef.current = createParticles();
    };

    // Handle theme changes
    const handleThemeChange = () => {
      themeRef.current = getCurrentTheme();
    };

    // Handle mouse move
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    // Observe theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'auto'
      }}
    />
  );
};

export default AnimatedBackground;
