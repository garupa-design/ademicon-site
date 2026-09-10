// contemplado-scene.jsx — illustrative results list: an outlined finder sweeps the
// rows, locks onto the winning line, reads its three cells, then the message lands.

function clamp3(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp3(a, b, f) { return a + (b - a) * f; }
function seg3(t, t0, t1) {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return Easing.easeInOutCubic((t - t0) / (t1 - t0));
}

const SCR = { w: 840, h: 784 };
const OB = { x: 40, y: 40, w: 760, h: 704 };
const KX = OB.x + 40, KW = OB.w - 80;

const PAD = 44;
const COLS = [
  { x: PAD, w: 250 },
  { x: PAD + 250 + 26, w: 160 },
  { x: PAD + 250 + 26 + 160 + 26, w: 130 },
];
const HEAD_Y = 56;
const ROW0_Y = 104;
const ROW_PITCH = 48;
const PILL_H = 26;
const ROWS = 7;
const TARGET = 2;
const CARD = { y: OB.y + 40, h: OB.h - 80 };

const rowTop = i => ROW0_Y + i * ROW_PITCH;
const FINDER_PAD_X = 16, FINDER_PAD_Y = 15;

function Piece3() {
  const { T, CUES, authoredTotal } = useComposition();
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  // finder wanders the list, then locks onto the target row
  const SEARCH_KF = [
    [0.0, 5], [0.9, 1], [1.6, 1], [2.4, 4], [3.1, 4], [3.9, TARGET],
  ];
  const rel = T - CUES.Procurar;
  let rowPos = SEARCH_KF[0][1];
  if (rel >= SEARCH_KF[SEARCH_KF.length - 1][0]) rowPos = TARGET;
  else if (rel > 0) {
    for (let i = 0; i < SEARCH_KF.length - 1; i++) {
      const [t0, v0] = SEARCH_KF[i], [t1, v1] = SEARCH_KF[i + 1];
      if (rel >= t0 && rel <= t1) { rowPos = v0 === v1 ? v0 : lerp3(v0, v1, seg3(rel, t0, t1)); break; }
    }
  }
  const locked = T >= CUES.Analisar;
  const finderY = rowTop(locked ? TARGET : rowPos) - FINDER_PAD_Y;
  const finderOpacity = T < CUES.Procurar ? seg3(T, CUES.Procurar - 0.4, CUES.Procurar) : 1;

  // on lock the whole row goes light red, then the full row locks in strong red
  const rowLit = seg3(T, CUES.Analisar, CUES.Analisar + 0.35);
  const allStrong = seg3(T, CUES.Analisar + 0.8, CUES.Analisar + 1.2);

  const msgP = seg3(T, CUES.Contemplado, CUES.Contemplado + 0.5);
  const msgY = lerp3(14, 0, msgP);

  const tiltEnabled = tw.tiltEnabled;
  const norm = (rowPos - TARGET) / ROWS;
  const settleP = seg3(T, CUES.Contemplado, CUES.Contemplado + 0.7);
  const tiltX = tiltEnabled ? lerp3(8 - norm * 6, -5, settleP) : 0;
  const tiltY = tiltEnabled ? lerp3(-6 + norm * 10, 11, settleP) : 0;

  const par = tiltEnabled ? (tiltY + 6) / 10 : 0;
  const frontT = `translate(${par * -34}px, ${par * -14}px) scale(${1 + par * 0.13})`;
  const backT = `translate(${par * 28}px, ${par * 11}px) scale(${1 - par * 0.10})`;

  const fade = T > authoredTotal - 0.5 ? 1 - seg3(T, authoredTotal - 0.5, authoredTotal) : 1;

  function pillColor(row, col) {
    if (row !== TARGET || rowLit < 0.01) return 'var(--color-neutral-200)';
    if (allStrong > 0.5) return 'var(--color-accent)';
    return 'var(--color-accent-300)';
  }

  return React.createElement('div', {
    style: { width: 1440, height: 1080, position: 'relative', overflow: 'hidden', background: tw.darkBackdrop ? 'var(--color-neutral-900)' : 'var(--color-bg)', fontFamily: 'Archivo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  },
    React.createElement('div', { style: { perspective: 2000 } },
      React.createElement('div', { style: { width: SCR.w, height: SCR.h, transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`, opacity: fade } },

        React.createElement('div', { style: { position: 'absolute', left: OB.x, top: OB.y, width: OB.w, height: OB.h, background: 'var(--color-neutral-200)', borderRadius: 48, zIndex: 1 } }),
        React.createElement('div', { style: { position: 'absolute', left: OB.x - 60, top: OB.y + 130, width: 90, height: 90, borderRadius: 20, background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
        React.createElement('div', { style: { position: 'absolute', left: OB.x - 130, top: OB.y + OB.h + 10, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
        React.createElement('div', { style: { position: 'absolute', left: OB.x - 88, top: OB.y + OB.h + 10, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),
        React.createElement('div', { style: { position: 'absolute', left: OB.x + OB.w - 60, top: OB.y + OB.h - 230, width: 150, height: 130, borderRadius: 28, border: '2px solid var(--color-neutral-300)', zIndex: 5, transform: frontT } },
          React.createElement('div', { style: { position: 'absolute', left: 26, bottom: 26, width: 46, height: 22, borderRadius: 11, background: 'var(--color-neutral-300)' } })
        ),

        // list card
        React.createElement('div', {
          style: { position: 'absolute', left: KX, top: CARD.y, width: KW, height: CARD.h, background: 'var(--color-bg)', borderRadius: 28, boxShadow: 'var(--shadow-sm)', zIndex: 2 }
        },
          React.createElement('div', { style: { position: 'absolute', left: COLS[1].x, top: HEAD_Y, width: COLS[1].w, textAlign: 'center', fontSize: 22, color: 'var(--color-neutral-600)' } }, 'Grupo'),
          React.createElement('div', { style: { position: 'absolute', left: COLS[2].x, top: HEAD_Y, width: COLS[2].w, textAlign: 'center', fontSize: 22, color: 'var(--color-neutral-600)' } }, 'Cota'),

          Array.from({ length: ROWS }).flatMap((_, r) => COLS.map((c, i) => React.createElement('div', {
            key: `${r}-${i}`,
            style: {
              position: 'absolute', left: c.x, top: rowTop(r), width: c.w, height: PILL_H,
              borderRadius: PILL_H / 2, background: pillColor(r, i),
            }
          }))),

          // finder
          React.createElement('div', {
            style: {
              position: 'absolute', left: COLS[0].x - FINDER_PAD_X, top: finderY,
              width: COLS[2].x + COLS[2].w - COLS[0].x + FINDER_PAD_X * 2,
              height: PILL_H + FINDER_PAD_Y * 2, borderRadius: (PILL_H + FINDER_PAD_Y * 2) / 2,
              border: '3px solid var(--color-accent)', opacity: finderOpacity,
            }
          }),

          React.createElement('div', {
            style: {
              position: 'absolute', left: PAD, top: ROW0_Y + ROWS * ROW_PITCH + 74,
              fontSize: 34, fontWeight: 800, color: 'var(--color-neutral-600)',
              fontFamily: 'Archivo, sans-serif', opacity: msgP, transform: `translateY(${msgY}px)`,
            }
          }, 'Você foi contemplado!')
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

function ContempladoApp() {
  return React.createElement(CompositionStage, { width: 1440, height: 1080, scenes: window.OM_SCENES, playback: window.OM_PLAYBACK, bg: '#F2F2F2' },
    React.createElement(Piece3, null)
  );
}

Object.assign(window, { ContempladoApp });
