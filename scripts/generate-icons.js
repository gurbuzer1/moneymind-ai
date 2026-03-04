const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const PRIMARY = '#6C63FF';
const BG_COLOR = '#1A1A2E';
const WHITE = '#FFFFFF';

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Gradient circle
  const gradient = ctx.createRadialGradient(center, center, size * 0.1, center, center, size * 0.4);
  gradient.addColorStop(0, '#8B85FF');
  gradient.addColorStop(1, PRIMARY);
  ctx.beginPath();
  ctx.arc(center, center, size * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Dollar sign
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${size * 0.32}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', center, center);

  // AI sparkle dots (top-right)
  const dotSize = size * 0.025;
  const sparklePositions = [
    [center + size * 0.28, center - size * 0.28],
    [center + size * 0.35, center - size * 0.22],
    [center + size * 0.22, center - size * 0.35],
  ];
  ctx.fillStyle = '#00D09C';
  sparklePositions.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();
  });

  // Small ring accent
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  ctx.arc(center, center, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(__dirname, '..', 'assets', filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function generateAdaptiveIcon(size, filename, isForeground) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  if (isForeground) {
    // Transparent background, just the icon content
    ctx.clearRect(0, 0, size, size);

    // Circle
    const gradient = ctx.createRadialGradient(center, center, size * 0.05, center, center, size * 0.25);
    gradient.addColorStop(0, '#8B85FF');
    gradient.addColorStop(1, PRIMARY);
    ctx.beginPath();
    ctx.arc(center, center, size * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Dollar
    ctx.fillStyle = WHITE;
    ctx.font = `bold ${size * 0.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', center, center);

    // Sparkle
    ctx.fillStyle = '#00D09C';
    const dotSize = size * 0.015;
    [[center + size * 0.18, center - size * 0.18],
     [center + size * 0.22, center - size * 0.14],
     [center + size * 0.14, center - size * 0.22]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, size, size);
  }

  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(__dirname, '..', 'assets', filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function generateSplash(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const cx = width / 2;
  const cy = height / 2;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Circle
  const iconSize = Math.min(width, height) * 0.15;
  const gradient = ctx.createRadialGradient(cx, cy - 30, iconSize * 0.1, cx, cy - 30, iconSize);
  gradient.addColorStop(0, '#8B85FF');
  gradient.addColorStop(1, PRIMARY);
  ctx.beginPath();
  ctx.arc(cx, cy - 30, iconSize, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Dollar
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${iconSize * 0.9}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy - 30);

  // App name
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${iconSize * 0.4}px Arial`;
  ctx.fillText('MoneyMind AI', cx, cy + iconSize + 20);

  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(__dirname, '..', 'assets', filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated ${filename} (${width}x${height})`);
}

// Generate all assets
generateIcon(1024, 'icon.png');
generateSplash(200, 200, 'splash-icon.png');
generateAdaptiveIcon(1024, 'android-icon-foreground.png', true);
generateAdaptiveIcon(1024, 'android-icon-background.png', false);
generateAdaptiveIcon(1024, 'android-icon-monochrome.png', true);
generateIcon(48, 'favicon.png');

console.log('\nAll icons generated!');
