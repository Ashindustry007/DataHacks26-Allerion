import React, { useRef, useEffect } from 'react';

const PollenBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Mouse state attached to window to easily capture position without blocking DOM clicks
    let mouse = { x: null, y: null, radius: 120 };
    const handleMouseMove = (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    const colors = [
      'rgba(250, 204, 21, 0.7)', // Yellow
      'rgba(74, 222, 128, 0.6)', // Teal
      'rgba(251, 146, 60, 0.6)', // Orange
      'rgba(220, 38, 38, 0.4)'   // Red
    ];

    let particlesArray = [];
    const numberOfParticles = Math.min(Math.floor(window.innerWidth / 4), 300);

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.5 + 0.5;
        // The weight/density decides how fast it scatters away from the cursor
        this.density = (Math.random() * 20) + 5; 
        
        // Natural wind drift
        this.baseVx = (Math.random() - 0.5) * 0.8; 
        this.baseVy = (Math.random() - 0.5) * 0.8 + 0.2; // Slight gravity/updraft bias
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        
        // Add subtle glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
      }
      
      update() {
        // Reset velocity gradually back to base drift using friction
        this.vx += (this.baseVx - this.vx) * 0.05;
        this.vy += (this.baseVy - this.vy) * 0.05;

        // Mouse collision detection
        if (mouse.x !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            // Force direction pushes the particle AWAY from the mouse
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let force = (mouse.radius - distance) / mouse.radius;
            
            // Adjust the actual speed burst based on density
            let directionX = (forceDirectionX * force * this.density) * -1;
            let directionY = (forceDirectionY * force * this.density) * -1;
            
            this.vx += directionX;
            this.vy += directionY;
          }
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen boundaries seamlessly
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.y > canvas.height + 10) this.y = -10;
        if (this.y < -10) this.y = canvas.height + 10;
      }
    }

    const init = () => {
      particlesArray = [];
      for (let i = 0; i < numberOfParticles; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
      }
    };

    init();

    const animate = () => {
      // Use clearRect to maintain the deeply dark UI background uninhibited
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      // Pointer events none ensures clicks bleed through the canvas to buttons below
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-70" 
    />
  );
};

export default PollenBackground;
