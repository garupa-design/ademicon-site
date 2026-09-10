// boleto-scene.jsx — illustrative boleto payment screen with a scanning barcode
// and a cursor demo. Same 3D-screen language as the loan simulator animation.

function clamp2(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp2(a, b, f) { return a + (b - a) * f; }
function seg2(t, t0, t1) {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return Easing.easeInOutCubic((t - t0) / (t1 - t0));
}
function pulse2(t, tc, dur) { return clamp2(1 - Math.abs(t - tc) / dur, 0, 1); }

const SCREEN2 = { w: 840, h: 784 };
const OUT = { x: 40, y: 40, w: 760, h: 704 };
const CX = OUT.x + 40, CW = OUT.w - 80;
const DOC = { y: OUT.y + 40, h: 480 };
const PAY = { y: DOC.y + DOC.h + 32, h: 110 };
const BAR = { x: 40, y: 40, w: CW - 80, h: 150 };
const PAY_CENTER = { x: CX + CW / 2, y: PAY.y + PAY.h / 2 };
const IDLE2 = { x: CX + CW - 120, y: OUT.y + 20 };

// deterministic barcode: mix of hairlines and wide blocks, normalized to fit BAR.w
const BARS = (() => {
  let s = 7;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const n = 26, gap = 6, raw = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    raw.push(r < 0.5 ? 4 + rnd() * 4 : r < 0.82 ? 10 + rnd() * 8 : 28 + rnd() * 14);
  }
  const avail = BAR.w - gap * (n - 1);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w * avail / sum);
})();

function Check2() {
  return React.createElement('div', {
    style: { width: 84, height: 84, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }
  },
    React.createElement('svg', { width: 34, height: 28, viewBox: '0 0 30 24' },
      React.createElement('path', { d: 'M2 12 L11 21 L28 2', stroke: 'var(--color-bg)', strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })
    )
  );
}

function Piece2() {
  const { T, CUES, authoredTotal } = useComposition();
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  const scanStart = CUES.Escanear, scanEnd = CUES.Clicar;
  const clickT = CUES.Clicar + 0.8;

  // scan keyframes, relative to scanStart: 0 = bottom of barcode, 1 = top.
  // Rises smoothly, holds a full second, comes back down, holds, repeats.
  const SCAN_KF = [
    [0.0, 0], [0.75, 1], [1.15, 1], [1.9, 0],
    [2.2, 0], [2.95, 1], [3.35, 1], [4.0, 0],
  ];
  const rel = T - scanStart;
  let scanP = 0;
  if (rel <= 0) scanP = 0;
  else if (rel >= SCAN_KF[SCAN_KF.length - 1][0]) scanP = 0;
  else {
    for (let i = 0; i < SCAN_KF.length - 1; i++) {
      const [t0, v0] = SCAN_KF[i], [t1, v1] = SCAN_KF[i + 1];
      if (rel >= t0 && rel <= t1) { scanP = v0 === v1 ? v0 : lerp2(v0, v1, seg2(rel, t0, t1)); break; }
    }
  }
  // 0 = bottom edge, 1 = top edge
  const scanY = BAR.y + 8 + (1 - scanP) * (BAR.h - 16);
  const scanOn = T >= scanStart - 0.2;
  const scanOpacity = T < scanStart ? seg2(T, scanStart - 0.2, scanStart)
    : T < CUES.Flip - 0.25 ? 1
    : T < CUES.Flip ? 1 - seg2(T, CUES.Flip - 0.25, CUES.Flip)
    : 0;

  const valueScale = 1 + 0.06 * pulse2(T, CUES.Clicar, 0.3);
  const btnScale = 1 - 0.04 * pulse2(T, clickT, 0.18);
  const clickPulse = pulse2(T, clickT, 0.4);
  const CENTER_POS = { x: CX + CW / 2 - 80, y: DOC.y + DOC.h - 120 };

  const flipAngle = T < CUES.Flip ? 0
    : T < CUES.Confirmado ? lerp2(0, 180, seg2(T, CUES.Flip, CUES.Confirmado))
    : T < CUES.FlipBack ? 180
    : lerp2(180, 360, seg2(T, CUES.FlipBack, authoredTotal));

  const tiltEnabled = tw.tiltEnabled;
  const tiltX = tiltEnabled ? 9 - scanP * 5 : 0;
  // the card leans with the beam: it eases up as the line rises and settles during each hold
  const tiltY = tiltEnabled ? -6 + (scanP - 0.5) * 16 : 0;

  function faceFor(angle) {
    const a = ((angle % 360) + 360) % 360;
    if (a <= 90) return { isBack: false, disp: a };
    if (a <= 270) return { isBack: true, disp: a - 180 };
    return { isBack: false, disp: a - 360 };
  }
  const { isBack, disp: faceDisp } = faceFor(flipAngle);

  const par = tiltEnabled ? (tiltY + 6) / 10 : 0;
  const frontT = `translate(${par * -34}px, ${par * -14}px) scale(${1 + par * 0.13})`;
  const backT = `translate(${par * 28}px, ${par * 11}px) scale(${1 - par * 0.10})`;

  const grayLine = (w, top, right) => React.createElement('div', {
    key: 'l' + top + w, style: {
      position: 'absolute', top, right: right ? 40 : undefined, left: right ? undefined : 40,
      width: w, height: 14, borderRadius: 7, background: 'var(--color-neutral-200)',
    }
  });

  return React.createElement('div', {
    style: { width: 1440, height: 1080, position: 'relative', overflow: 'hidden', background: tw.darkBackdrop ? 'var(--color-neutral-900)' : 'var(--color-bg)', fontFamily: 'Archivo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  },
    React.createElement('div', { style: { perspective: 2000 } },
      React.createElement('div', { style: { width: SCREEN2.w, height: SCREEN2.h, transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)` } },
        React.createElement('div', { style: { position: 'relative', width: SCREEN2.w, height: SCREEN2.h, transform: `rotateY(${faceDisp}deg)` } },

          !isBack && React.createElement(React.Fragment, null,
            React.createElement('div', { style: { position: 'absolute', left: OUT.x, top: OUT.y, width: OUT.w, height: OUT.h, background: 'var(--color-neutral-200)', borderRadius: 48, zIndex: 1 } }),
            React.createElement('div', { style: { position: 'absolute', left: OUT.x - 130, top: OUT.y - 20, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
            React.createElement('div', { style: { position: 'absolute', left: OUT.x - 88, top: OUT.y - 20, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
            React.createElement('div', { style: { position: 'absolute', left: OUT.x + OUT.w - 40, top: OUT.y + 30, width: 80, height: 80, borderRadius: 20, background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
            React.createElement('div', { style: { position: 'absolute', left: OUT.x - 60, top: OUT.y + OUT.h - 220, width: 130, height: 150, borderRadius: 28, border: '2px solid var(--color-neutral-300)', zIndex: 5, transform: frontT } },
              React.createElement('div', { style: { position: 'absolute', left: 26, bottom: 26, width: 46, height: 22, borderRadius: 11, background: 'var(--color-neutral-300)' } })
            ),

            // boleto document card
            React.createElement('div', {
              style: { position: 'absolute', left: CX, top: DOC.y, width: CW, height: DOC.h, background: 'var(--color-bg)', borderRadius: 28, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', zIndex: 2 }
            },
              // barcode
              React.createElement('div', { style: { position: 'absolute', left: BAR.x, top: BAR.y, width: BAR.w, height: BAR.h, display: 'flex', alignItems: 'stretch', gap: 6 } },
                BARS.map((w, i) => React.createElement('div', { key: i, style: { width: w, flexShrink: 0, background: 'var(--color-neutral-300)' } }))
              ),
              // scan line
              scanOn && scanOpacity > 0.01 && React.createElement('div', {
                style: {
                  position: 'absolute', left: BAR.x - 18, top: scanY, width: BAR.w + 36, height: 8,
                  borderRadius: 4, background: 'var(--color-accent)', opacity: scanOpacity,
                  boxShadow: '0 0 24px color-mix(in srgb, var(--color-accent) 55%, transparent)',
                }
              }),
              // value
              React.createElement('div', {
                style: { position: 'absolute', right: 40, top: BAR.y + BAR.h + 40, fontSize: 46, fontWeight: 800, color: 'var(--color-neutral-600)', fontFamily: 'Archivo, sans-serif', transform: `scale(${valueScale})`, transformOrigin: 'right center' }
              }, 'R$ 1.500'),
              grayLine(320, 330, true),
              grayLine(CW - 80, 366, false),
              grayLine(176, 400, true),
              grayLine(176, 430, true)
            ),

            // pay button
            React.createElement('div', {
              style: {
                position: 'absolute', left: CX, top: PAY.y, width: CW, height: PAY.h,
                background: 'var(--color-bg)', borderRadius: 28, boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${btnScale})`, zIndex: 2,
              }
            },
              React.createElement('div', { style: { fontSize: 32, color: 'var(--color-neutral-600)', fontFamily: 'Archivo, sans-serif', fontWeight: 600 } }, 'Pagar Boleto')
            ),

            clickPulse > 0.02 && React.createElement('div', {
              style: {
                position: 'absolute', left: PAY_CENTER.x - 44 * (1 + clickPulse * 0.5), top: PAY_CENTER.y - 44 * (1 + clickPulse * 0.5),
                width: 88 * (1 + clickPulse * 0.5), height: 88 * (1 + clickPulse * 0.5), borderRadius: '50%',
                border: '3px solid var(--color-neutral-400)', opacity: clickPulse * 0.7, pointerEvents: 'none',
              }
            })
          ),

          isBack && React.createElement('div', {
            style: {
              position: 'absolute', left: OUT.x, top: OUT.y, width: OUT.w, height: OUT.h,
              background: 'var(--color-neutral-200)', borderRadius: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }
          },
            React.createElement('div', { style: { textAlign: 'center', padding: '0 60px' } },
              React.createElement(Check2, null),
              React.createElement('div', { style: { fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--color-text)' } }, 'Pagamento confirmado'),
              React.createElement('div', { style: { fontSize: 18, color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', marginTop: 12, lineHeight: 1.4 } }, 'Seu boleto de R$ 1.500 foi pago.')
            )
          )
        )
      )
    ),

    React.createElement(TweaksPanel, null,
      React.createElement(TweakToggle, { label: 'Motion editor', value: tw.motionEditor, onChange: v => setTweak('motionEditor', v) }),
      React.createElement(TweakToggle, { label: 'Inclinação 3D', value: tw.tiltEnabled, onChange: v => setTweak('tiltEnabled', v) }),
      React.createElement(TweakToggle, { label: 'Fundo escuro', value: tw.darkBackdrop, onChange: v => setTweak('darkBackdrop', v) })
    )
  );
}

function BoletoApp() {
  return React.createElement(CompositionStage, { width: 1440, height: 1080, scenes: window.OM_SCENES, playback: window.OM_PLAYBACK, bg: '#F2F2F2' },
    React.createElement(Piece2, null)
  );
}

Object.assign(window, { BoletoApp });
