import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DinoEmotion = 'idle' | 'surprised' | 'pain' | 'happy' | 'angry';
type GamePhase = 'intro' | 'playing' | 'reacting' | 'win' | 'lose';

interface Tooth {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  isUpper: boolean;
  isCavity: boolean;
  pulled: boolean;
  wobble: number;       // radians offset for wobble animation
  pullOffset: number;   // pixels pulled so far
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  life: number; maxLife: number;
  size: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PULL_THRESHOLD = 60;   // px drag needed to complete pull
const REACTION_DURATION = 1200; // ms to show reaction before allowing next action

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DinoToothGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase: 'intro' as GamePhase,
    emotion: 'idle' as DinoEmotion,
    teeth: [] as Tooth[],
    particles: [] as Particle[],
    selectedTooth: null as Tooth | null,
    touchStartY: 0,
    touchStartX: 0,
    touchStartTime: 0,
    isDragging: false,
    reactionTimer: 0,
    frame: 0,
    level: 1,
    // angry animation
    shakeOffset: 0,
    tableFlip: 0,
    // win animation
    winStars: 0,
    // breath animation
    breathScale: 1,
  });
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // ─── Build teeth for a level ────────────────────────────────────────────────

  const buildTeeth = useCallback((canvasW: number, canvasH: number): Tooth[] => {
    const mouthCenterX = canvasW / 2;
    const mouthCenterY = canvasH * 0.54;
    const mouthW = canvasW * 0.44;
    const toothW = 36;
    const toothH = 44;
    const gap = 6;

    const upperCount = 5;
    const lowerCount = 4;
    const cavityIndex = Math.floor(Math.random() * (upperCount + lowerCount));

    const teeth: Tooth[] = [];
    let id = 0;

    // Upper teeth (hang down from top jaw)
    const upperStartX = mouthCenterX - ((upperCount * (toothW + gap)) / 2) + gap / 2;
    const upperY = mouthCenterY - 14;
    for (let i = 0; i < upperCount; i++) {
      teeth.push({
        id: id++,
        x: upperStartX + i * (toothW + gap),
        y: upperY,
        w: toothW,
        h: toothH,
        isUpper: true,
        isCavity: id - 1 === cavityIndex,
        pulled: false,
        wobble: 0,
        pullOffset: 0,
      });
    }

    // Lower teeth (point up from bottom jaw)
    const lowerStartX = mouthCenterX - ((lowerCount * (toothW + gap)) / 2) + gap / 2;
    const lowerY = mouthCenterY + 14 - toothH + 10;
    for (let i = 0; i < lowerCount; i++) {
      teeth.push({
        id: id++,
        x: lowerStartX + i * (toothW + gap),
        y: lowerY,
        w: toothW,
        h: toothH,
        isUpper: false,
        isCavity: id - 1 === cavityIndex,
        pulled: false,
        wobble: 0,
        pullOffset: 0,
      });
    }

    return teeth;
  }, []);

  // ─── Particle helpers ────────────────────────────────────────────────────────

  const spawnParticles = useCallback((
    x: number, y: number, colors: string[], count: number, speed: number,
  ) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * (0.5 + Math.random()),
        vy: Math.sin(angle) * speed * (0.5 + Math.random()) - speed * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        size: 6 + Math.random() * 8,
      });
    }
  }, []);

  // ─── Draw dinosaur ───────────────────────────────────────────────────────────

  const drawDino = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    emotion: DinoEmotion,
    frame: number,
    shakeOffset: number,
    tableFlip: number,
  ) => {
    ctx.save();
    ctx.translate(cx + shakeOffset, cy);

    const breathY = Math.sin(frame * 0.03) * 2;
    ctx.translate(0, breathY);

    // ── Body / head ──
    const bodyColor = '#5DBB63';
    const darkGreen = '#3d8c42';
    const belly = '#A8D8A8';

    // Head (large circle)
    const headR = 90;
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = darkGreen;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Belly patch
    ctx.beginPath();
    ctx.ellipse(0, 20, 55, 45, 0, 0, Math.PI * 2);
    ctx.fillStyle = belly;
    ctx.fill();

    // ── Spikes on top ──
    const spikeColor = '#3d8c42';
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI * 0.75 + i * (Math.PI * 0.5 / 4);
      const bx = Math.cos(angle) * headR;
      const by = Math.sin(angle) * headR;
      const tx = Math.cos(angle) * (headR + 22 - i * 3);
      const ty = Math.sin(angle) * (headR + 22 - i * 3);
      ctx.beginPath();
      ctx.moveTo(bx - 6, by);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + 6, by);
      ctx.fillStyle = spikeColor;
      ctx.fill();
    }

    // ── Eyes ──
    const eyeOffsetX = 28;
    const eyeY = -28;

    // White of eyes
    if (emotion === 'angry') {
      // Angry: slanted eyebrows, red tint
      const drawAngryEye = (ex: number) => {
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 20, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffe0e0';
        ctx.fill();
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // pupil (squinting)
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + 2, 9, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        // angry eyebrow
        const bdir = ex > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(ex - 14, eyeY - 18);
        ctx.lineTo(ex + 14 * bdir, eyeY - 12);
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      };
      drawAngryEye(-eyeOffsetX);
      drawAngryEye(eyeOffsetX);
    } else if (emotion === 'happy') {
      // Happy: arc eyes (closed smile)
      const drawHappyEye = (ex: number) => {
        ctx.beginPath();
        ctx.arc(ex, eyeY, 16, Math.PI, Math.PI * 2);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.stroke();
        // shine
        ctx.beginPath();
        ctx.arc(ex + 6, eyeY - 8, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      };
      drawHappyEye(-eyeOffsetX);
      drawHappyEye(eyeOffsetX);
    } else {
      // Normal / surprised / pain eyes
      const pupilSize = emotion === 'surprised' ? 13 : emotion === 'pain' ? 10 : 11;
      const eyeScale = emotion === 'surprised' ? 1.3 : 1;

      const drawNormalEye = (ex: number) => {
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 20 * eyeScale, 18 * eyeScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // pupil
        const py = emotion === 'pain' ? eyeY + 4 : eyeY;
        ctx.beginPath();
        ctx.arc(ex, py, pupilSize, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        // shine
        ctx.beginPath();
        ctx.arc(ex + 6, py - 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      };
      drawNormalEye(-eyeOffsetX);
      drawNormalEye(eyeOffsetX);

      // Pain: X-X eyes
      if (emotion === 'pain') {
        const drawX = (ex: number) => {
          ctx.strokeStyle = '#cc0000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - 8, eyeY - 8);
          ctx.lineTo(ex + 8, eyeY + 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex + 8, eyeY - 8);
          ctx.lineTo(ex - 8, eyeY + 8);
          ctx.stroke();
        };
        drawX(-eyeOffsetX);
        drawX(eyeOffsetX);
      }
    }

    // ── Nostrils ──
    ctx.fillStyle = darkGreen;
    ctx.beginPath();
    ctx.ellipse(-12, -8, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -8, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── Cheek blush (happy) ──
    if (emotion === 'happy') {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ff9999';
      ctx.beginPath();
      ctx.ellipse(-52, 10, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(52, 10, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Sweat drop (pain) ──
    if (emotion === 'pain' || emotion === 'surprised') {
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(55, -15, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(55, -10);
      ctx.lineTo(51, 0);
      ctx.lineTo(59, 0);
      ctx.closePath();
      ctx.fill();
    }

    // ── Angry steam ──
    if (emotion === 'angry') {
      const steamAnim = Math.sin(frame * 0.15) * 3;
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const sx of [-50, 50]) {
        ctx.beginPath();
        ctx.moveTo(sx, -70);
        ctx.quadraticCurveTo(sx + steamAnim, -90, sx, -110);
        ctx.stroke();
      }
    }

    // ── Table flip (angry) ──
    if (tableFlip > 0) {
      const angle = (tableFlip * Math.PI) / 2;
      ctx.save();
      ctx.translate(60, 60);
      ctx.rotate(angle);
      // Simple table shape
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-30, -5, 60, 8);
      ctx.fillRect(-22, 3, 8, 20);
      ctx.fillRect(14, 3, 8, 20);
      ctx.restore();

      // Emoji-style text
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.fillText('(╯°□°）╯', 30, 90);
    }

    ctx.restore();
  }, []);

  // ─── Draw a single tooth ─────────────────────────────────────────────────────

  const drawTooth = useCallback((
    ctx: CanvasRenderingContext2D,
    tooth: Tooth,
    isSelected: boolean,
    frame: number,
  ) => {
    if (tooth.pulled) return;

    const wobbleX = Math.sin(frame * 0.2 + tooth.id) * (tooth.wobble * 8);
    const pullDir = tooth.isUpper ? 1 : -1;
    const px = tooth.x + wobbleX;
    const py = tooth.y + tooth.pullOffset * pullDir;

    ctx.save();
    ctx.translate(px + tooth.w / 2, py + tooth.h / 2);

    // Glow for selected
    if (isSelected) {
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 16;
    }

    // Tooth body
    const toothGrad = ctx.createLinearGradient(-tooth.w / 2, 0, tooth.w / 2, 0);
    toothGrad.addColorStop(0, '#f0f0f0');
    toothGrad.addColorStop(0.4, '#ffffff');
    toothGrad.addColorStop(1, '#d8d8d8');

    roundRect(ctx, -tooth.w / 2, -tooth.h / 2, tooth.w, tooth.h, 10);
    ctx.fillStyle = toothGrad;
    ctx.fill();
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Root at connecting end
    const rootH = 10;
    if (tooth.isUpper) {
      ctx.fillStyle = '#e0c8b0';
      roundRect(ctx, -tooth.w / 2 + 6, -tooth.h / 2 - rootH + 2, tooth.w - 12, rootH, 4);
      ctx.fill();
    } else {
      ctx.fillStyle = '#e0c8b0';
      roundRect(ctx, -tooth.w / 2 + 6, tooth.h / 2 - 2, tooth.w - 12, rootH, 4);
      ctx.fill();
    }

    // Cavity mark
    if (tooth.isCavity) {
      ctx.fillStyle = '#5c3317';
      ctx.beginPath();
      ctx.ellipse(2, 4, 7, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d1f0a';
      ctx.beginPath();
      ctx.ellipse(2, 4, 4, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Crack lines
      ctx.strokeStyle = '#5c3317';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, 2); ctx.lineTo(4, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 2); ctx.lineTo(0, 7);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }, []);

  // ─── Draw mouth area ─────────────────────────────────────────────────────────

  const drawMouth = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    teeth: Tooth[],
    selectedTooth: Tooth | null,
    emotion: DinoEmotion,
    frame: number,
  ) => {
    const mouthW = 210;
    const mouthH = emotion === 'happy' ? 60 : emotion === 'angry' ? 80 : 70;

    // Outer mouth border
    ctx.save();
    ctx.translate(cx, cy);

    // Jaw shape
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW / 2 + 8, mouthH / 2 + 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3d8c42';
    ctx.fill();

    // Mouth interior
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();

    // Tongue
    ctx.beginPath();
    ctx.ellipse(0, mouthH / 2 - 18, 55, 22, 0, 0, Math.PI);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    // Tongue crease
    ctx.beginPath();
    ctx.moveTo(0, mouthH / 2 - 36);
    ctx.lineTo(0, mouthH / 2 - 4);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw teeth (over mouth)
    for (const t of teeth) {
      drawTooth(ctx, t, t === selectedTooth, frame);
    }
  }, [drawTooth]);

  // ─── Main render ─────────────────────────────────────────────────────────────

  const render = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const dt = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    s.frame++;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#e0f7fa');
    bg.addColorStop(1, '#b2ebf2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative dots
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 8; i++) {
      const bx = (Math.sin(i * 1.3) * 0.5 + 0.5) * W;
      const by = (Math.cos(i * 0.9) * 0.5 + 0.5) * H;
      ctx.beginPath();
      ctx.arc(bx, by, 20 + i * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const dinoCX = W / 2;
    const dinoCY = H * 0.38;
    const mouthCY = H * 0.54;

    // Update game state
    if (s.phase === 'reacting') {
      s.reactionTimer -= dt;
      if (s.reactionTimer <= 0) {
        s.phase = 'playing';
        s.emotion = 'idle';
        s.selectedTooth = null;
        // Decay wobble
        for (const t of s.teeth) t.wobble *= 0.9;
      }
    }

    if (s.phase === 'lose') {
      s.tableFlip = Math.min(s.tableFlip + dt * 0.002, 1);
      s.shakeOffset = Math.sin(s.frame * 0.4) * (10 * (1 - s.tableFlip * 0.5));
    } else {
      s.shakeOffset *= 0.8;
    }

    // Draw dino
    drawDino(ctx, dinoCX, dinoCY, s.emotion, s.frame, s.shakeOffset, s.tableFlip);

    // Draw mouth + teeth (only in playing phases)
    if (s.phase !== 'intro' && s.phase !== 'win' && s.phase !== 'lose') {
      drawMouth(ctx, W / 2, mouthCY, s.teeth, s.selectedTooth, s.emotion, s.frame);
    } else if (s.phase === 'win' || s.phase === 'lose') {
      // Show closed mouth
      ctx.save();
      ctx.translate(W / 2, mouthCY - 20);
      if (s.phase === 'win') {
        // Big smile arc
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI);
        ctx.strokeStyle = '#3d8c42';
        ctx.lineWidth = 5;
        ctx.stroke();
      } else {
        // Wavy angry mouth
        ctx.beginPath();
        ctx.moveTo(-50, 10);
        ctx.quadraticCurveTo(-20, -10, 0, 10);
        ctx.quadraticCurveTo(20, 30, 50, 10);
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Particles
    s.particles = s.particles.filter(p => p.life > 0);
    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life -= 0.018;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── UI overlays ──

    if (s.phase === 'intro') {
      // Title card
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, W * 0.08, H * 0.66, W * 0.84, 160, 24);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(W * 0.075)}px Arial Rounded MT Bold, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('🦷 幫恐龍拔牙！', W / 2, H * 0.72);

      ctx.font = `${Math.round(W * 0.045)}px Arial`;
      ctx.fillStyle = '#ffe082';
      ctx.fillText('找到蛀牙，拔掉它！', W / 2, H * 0.79);

      // Start button
      const btnY = H * 0.84;
      const btnH = 56;
      const btnW = 180;
      ctx.fillStyle = '#ffeb3b';
      roundRect(ctx, W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 28);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = `bold ${Math.round(W * 0.055)}px Arial`;
      ctx.fillText('開始遊戲 ▶', W / 2, btnY + 9);
    }

    if (s.phase === 'playing' || s.phase === 'reacting') {
      // Instruction banner at top
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, W * 0.05, 16, W * 0.9, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.round(W * 0.038)}px Arial`;
      ctx.textAlign = 'center';
      if (s.phase === 'reacting' && s.selectedTooth) {
        ctx.fillText('找到蛀牙了嗎？往外拉就能拔掉！', W / 2, 44);
      } else {
        ctx.fillText('點擊牙齒 → 滑動拔牙！', W / 2, 44);
      }
    }

    if (s.phase === 'win') {
      s.winStars += 0.04;
      // Stars around dino
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + s.winStars;
        const sx = W / 2 + Math.cos(a) * 120;
        const sy = H * 0.38 + Math.sin(a) * 100;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', sx, sy);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, W * 0.08, H * 0.68, W * 0.84, 170, 28);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(W * 0.08)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('🎉 太厲害了！', W / 2, H * 0.76);
      ctx.font = `${Math.round(W * 0.045)}px Arial`;
      ctx.fillStyle = '#ffe082';
      ctx.fillText('恐龍說謝謝你！', W / 2, H * 0.83);

      // Next level button
      const btnY = H * 0.895;
      ctx.fillStyle = '#4caf50';
      roundRect(ctx, W / 2 - 90, btnY - 28, 180, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(W * 0.05)}px Arial`;
      ctx.fillText('再玩一次！', W / 2, btnY + 9);
    }

    if (s.phase === 'lose') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, W * 0.08, H * 0.68, W * 0.84, 170, 28);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(W * 0.072)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('😤 恐龍生氣了！', W / 2, H * 0.76);
      ctx.font = `${Math.round(W * 0.042)}px Arial`;
      ctx.fillStyle = '#ffcdd2';
      ctx.fillText('那不是蛀牙，再試一次！', W / 2, H * 0.83);

      const btnY = H * 0.895;
      ctx.fillStyle = '#ef5350';
      roundRect(ctx, W / 2 - 90, btnY - 28, 180, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(W * 0.05)}px Arial`;
      ctx.fillText('再試一次！', W / 2, btnY + 9);
    }

    animRef.current = requestAnimationFrame(render);
  }, [drawDino, drawMouth]);

  // ─── Init & resize ────────────────────────────────────────────────────────────

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    s.teeth = buildTeeth(canvas.width / dpr, canvas.height / dpr);
    s.particles = [];
    s.phase = 'playing';
    s.emotion = 'idle';
    s.selectedTooth = null;
    s.isDragging = false;
    s.shakeOffset = 0;
    s.tableFlip = 0;
    s.winStars = 0;
  }, [buildTeeth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      // Setting .width/.height resets the canvas transform, so re-apply scale each time
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    animRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [render]);

  // ─── Hit test ────────────────────────────────────────────────────────────────

  const hitTooth = useCallback((x: number, y: number): Tooth | null => {
    const s = stateRef.current;
    const padding = 8;
    for (const t of s.teeth) {
      if (t.pulled) continue;
      if (
        x >= t.x - padding && x <= t.x + t.w + padding &&
        y >= t.y - padding && y <= t.y + t.h + padding
      ) {
        return t;
      }
    }
    return null;
  }, []);

  const hitButton = useCallback((x: number, y: number): 'start' | 'retry' | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const s = stateRef.current;
    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);

    if (s.phase === 'intro') {
      const btnY = H * 0.84;
      if (Math.abs(x - W / 2) < 90 && Math.abs(y - btnY) < 28) return 'start';
    }
    if (s.phase === 'win' || s.phase === 'lose') {
      const btnY = H * 0.895;
      if (Math.abs(x - W / 2) < 90 && Math.abs(y - btnY) < 28) return 'retry';
    }
    return null;
  }, []);

  // ─── Touch handlers ───────────────────────────────────────────────────────────

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const btn = hitButton(x, y);
    if (btn === 'start') { initGame(); return; }
    if (btn === 'retry') {
      s.phase = 'playing';
      s.emotion = 'idle';
      s.teeth = buildTeeth(
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1),
      );
      s.particles = [];
      s.selectedTooth = null;
      s.isDragging = false;
      s.shakeOffset = 0;
      s.tableFlip = 0;
      s.winStars = 0;
      return;
    }

    if (s.phase !== 'playing') return;

    s.touchStartX = x;
    s.touchStartY = y;
    s.touchStartTime = Date.now();
    s.isDragging = false;

    const tooth = hitTooth(x, y);
    if (tooth) {
      s.selectedTooth = tooth;
    }
  }, [getCanvasPos, hitButton, hitTooth, initGame, buildTeeth]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    if (!s.selectedTooth || s.phase !== 'playing') return;

    const touch = e.touches[0];
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    const dy = y - s.touchStartY;

    // Determine if dragging in the correct pull direction
    const tooth = s.selectedTooth;
    // Upper teeth: pull upward (dy < 0); lower teeth: pull downward (dy > 0)
    const pullDelta = tooth.isUpper ? -dy : dy;

    if (pullDelta > 5) {
      s.isDragging = true;
      tooth.pullOffset = Math.min(pullDelta, PULL_THRESHOLD + 20);
      tooth.wobble = Math.min(pullDelta / PULL_THRESHOLD, 1);

      if (pullDelta >= PULL_THRESHOLD) {
        // Complete the pull
        tooth.pulled = true;
        s.selectedTooth = null;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = canvas.width / (window.devicePixelRatio || 1);
        const H = canvas.height / (window.devicePixelRatio || 1);
        const cx = tooth.x + tooth.w / 2;
        const cy = tooth.y + tooth.h / 2;

        if (tooth.isCavity) {
          s.phase = 'win';
          s.emotion = 'happy';
          spawnParticles(W / 2, H * 0.5, ['#ffeb3b','#4caf50','#e91e63','#2196f3','#ff9800'], 30, 12);
        } else {
          s.phase = 'lose';
          s.emotion = 'angry';
          s.tableFlip = 0;
          spawnParticles(cx, cy, ['#ff5722','#f44336','#ff9800'], 20, 8);
        }
      }
    }
  }, [getCanvasPos, spawnParticles]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const s = stateRef.current;

    if (s.isDragging) {
      // If dragged but not enough to pull, reset pullOffset
      if (s.selectedTooth && !s.selectedTooth.pulled) {
        s.selectedTooth.pullOffset = 0;
        s.selectedTooth.wobble = 0.3;
      }
      s.isDragging = false;
      return;
    }

    // Short tap — show reaction
    if (s.selectedTooth && s.phase === 'playing') {
      const tooth = s.selectedTooth;
      if (tooth.isCavity) {
        s.emotion = 'pain';
      } else {
        s.emotion = 'surprised';
      }
      s.phase = 'reacting';
      s.reactionTimer = REACTION_DURATION;
      // Small wobble
      tooth.wobble = 0.5;
    } else {
      s.selectedTooth = null;
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-cyan-100 overflow-hidden touch-none select-none">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
