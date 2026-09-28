import React, { useEffect, useRef } from 'react';

interface Sparkle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swaySpeed: number;
  swayAmount: number;
  swayOffset: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
  type: 'star4' | 'star8' | 'diamond' | 'circle';
}

const COLORS = [
  '#EC4899', // Vibrant Rose Pink
  '#F472B6', // Soft Pink Sparkle
  '#F43F5E', // Vivid Rose
  '#F9A8D4', // Pastel Pink
  '#FCE7F3', // Soft Blush Glow
  '#FFB6C1', // Light Pink
  '#FFFFFF', // Diamond White
];

export const SparklesOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Create sparkles pool
    const particleCount = Math.min(Math.floor(window.innerWidth / 20), 65);
    const sparkles: Sparkle[] = [];

    const createSparkle = (initialY = -20): Sparkle => {
      const types: Sparkle['type'][] = ['star4', 'star8', 'diamond', 'circle'];
      return {
        x: Math.random() * width,
        y: initialY === -20 ? Math.random() * -height : initialY,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 1.2 + 0.6,
        swaySpeed: Math.random() * 0.02 + 0.008,
        swayAmount: Math.random() * 1.5 + 0.5,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        opacity: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.04 + 0.015,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: types[Math.floor(Math.random() * types.length)],
      };
    };

    for (let i = 0; i < particleCount; i++) {
      // Distribute initial sparkles vertically across screen height for immediate visual richness
      sparkles.push(createSparkle(Math.random() * height));
    }

    let frame = 0;

    const draw4PointStar = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        const innerAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(innerAngle) * (size * 0.25), Math.sin(innerAngle) * (size * 0.25));
      }
      ctx.closePath();
      ctx.fill();
    };

    const draw8PointStar = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const radius = i % 2 === 0 ? size : size * 0.35;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawDiamond = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.moveTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
    };

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      sparkles.forEach((s) => {
        // Move sparkle downward
        s.y += s.speedY;
        s.swayOffset += s.swaySpeed;
        s.x += Math.sin(s.swayOffset) * s.swayAmount;
        s.rotation += s.rotationSpeed;

        // Reset if sparkle reaches bottom of screen
        if (s.y > height + 20) {
          s.y = -20;
          s.x = Math.random() * width;
        }
        if (s.x < -20) s.x = width + 20;
        if (s.x > width + 20) s.x = -20;

        // Twinkle (alpha pulsing)
        const alpha = Math.max(
          0.1,
          Math.min(
            1,
            s.opacity + Math.sin(frame * s.twinkleSpeed + s.twinkleOffset) * 0.35
          )
        );

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;

        // Soft glow around sparkle
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.size * 1.5;

        switch (s.type) {
          case 'star4':
            draw4PointStar(ctx, s.size);
            break;
          case 'star8':
            draw8PointStar(ctx, s.size);
            break;
          case 'diamond':
            drawDiamond(ctx, s.size);
            break;
          case 'circle':
          default:
            ctx.beginPath();
            ctx.arc(0, 0, s.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  );
};

export default SparklesOverlay;
