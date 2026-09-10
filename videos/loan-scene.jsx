// loan-scene.jsx — illustrative loan-request "screen" object.
// The screen sits tilted in 3D space and flips over to reveal the confirmation.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, f) { return a + (b - a) * f; }
function seg(t, t0, t1) {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return Easing.easeInOutCubic((t - t0) / (t1 - t0));
}
function pulse(t, tc, dur) { return clamp(1 - Math.abs(t - tc) / dur, 0, 1); }
function fmtInt(v) { return Math.round(v).toLocaleString('pt-BR'); }

const SCREEN = { w: 840, h: 784 };
const OUTER = { x: 40, y: 40, w: 760, h: 704 };
const CARD_X = OUTER.x + 40, CARD_W = OUTER.w - 80;
const CARD1 = { y: OUTER.y + 70, h: 200 };
const CARD2 = { y: CARD1.y + CARD1.h + 32, h: 200 };
const CARD3 = { y: CARD2.y + CARD2.h + 32, h: 100 };

const TRACK_X0 = CARD_X + 40, TRACK_X1 = CARD_X + CARD_W - 40;
const TRACK_W = TRACK_X1 - TRACK_X0;
const CREDIT_MIN = 50000, CREDIT_MAX = 200000, CREDIT_DEFAULT = 100000, CREDIT_TARGET = 130000;
const PARC_MIN = 500, PARC_MAX = 3000, PARC_DEFAULT = 1500, PARC_TARGET = 1150;
const trackFrac = (v, min, max) => (v - min) / (max - min);
const handleXFor = f => TRACK_X0 + f * TRACK_W;

const CREDIT_TRACK_Y = CARD1.y + 150;
const PARCELA_TRACK_Y = CARD2.y + 150;
const BUTTON_CENTER = { x: CARD_X + CARD_W / 2, y: CARD3.y + CARD3.h / 2 };

function CheckBadge() {
  return React.createElement('div', {
    style: { width: 84, height: 84, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }
  },
    React.createElement('svg', { width: 34, height: 28, viewBox: '0 0 30 24' },
      React.createElement('path', { d: 'M2 12 L11 21 L28 2', stroke: 'var(--color-bg)', strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })
    )
  );
}

function SliderCard({ y, h, label1, label2, value, fmt, trackFracVal, dragging }) {
  const handleX = handleXFor(trackFracVal);
  return React.createElement('div', {
    style: { position: 'absolute', left: CARD_X, top: y, width: CARD_W, height: h, background: 'var(--color-bg)', borderRadius: 28, boxShadow: 'var(--shadow-sm)', zIndex: 2 }
  },
    React.createElement('div', { style: { position: 'absolute', left: 40, top: 42, fontSize: 20, lineHeight: '28px', color: 'color-mix(in srgb, var(--color-text) 62%, transparent)', fontFamily: 'Archivo, sans-serif' } }, label1),
    React.createElement('div', { style: { position: 'absolute', left: 40, top: 70, fontSize: 20, lineHeight: '28px', color: 'color-mix(in srgb, var(--color-text) 62%, transparent)', fontFamily: 'Archivo, sans-serif' } }, label2),
    React.createElement('div', { style: { position: 'absolute', right: 40, top: 36, fontSize: 40, fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'Archivo, sans-serif' } }, fmt(value)),
    React.createElement('div', { style: { position: 'absolute', left: TRACK_X0 - CARD_X, top: 150, width: TRACK_W, height: 8, borderRadius: 4, background: 'var(--color-neutral-300)' } }),
    React.createElement('div', { style: { position: 'absolute', left: handleX - CARD_X - 14, top: 150 - 10, width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      React.createElement('div', { style: { width: 12, height: 12, borderRadius: '50%', background: 'var(--color-bg)', opacity: dragging, transform: `scale(${0.4 + 0.6 * dragging})` } })
    )
  );
}

function Piece() {
  const { T, CUES, authoredTotal } = useComposition();
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  const grab1 = CUES.AjustarCredito + 0.6, dragEnd1 = grab1 + 1.0;
  const grab2 = CUES.AjustarParcela + 0.6, dragEnd2 = grab2 + 0.9;
  const clickT = CUES.Clicar + 0.7;

  const creditValue = T < grab1 ? CREDIT_DEFAULT
    : T < dragEnd1 ? lerp(CREDIT_DEFAULT, CREDIT_TARGET, seg(T, grab1, dragEnd1))
    : T < CUES.Flip ? CREDIT_TARGET
    : CREDIT_DEFAULT;
  const parcValue = T < grab2 ? PARC_DEFAULT
    : T < dragEnd2 ? lerp(PARC_DEFAULT, PARC_TARGET, seg(T, grab2, dragEnd2))
    : T < CUES.Flip ? PARC_TARGET
    : PARC_DEFAULT;

  const creditFrac = trackFrac(creditValue, CREDIT_MIN, CREDIT_MAX);
  const parcFrac = trackFrac(parcValue, PARC_MIN, PARC_MAX);

  const creditHandlePt = { x: handleXFor(trackFrac(CREDIT_DEFAULT, CREDIT_MIN, CREDIT_MAX)), y: CREDIT_TRACK_Y };
  const creditHandleEndPt = { x: handleXFor(trackFrac(CREDIT_TARGET, CREDIT_MIN, CREDIT_MAX)), y: CREDIT_TRACK_Y };
  const parcHandlePt = { x: handleXFor(trackFrac(PARC_DEFAULT, PARC_MIN, PARC_MAX)), y: PARCELA_TRACK_Y };
  const parcHandleEndPt = { x: handleXFor(trackFrac(PARC_TARGET, PARC_MIN, PARC_MAX)), y: PARCELA_TRACK_Y };

  // the handle shows a white core only while it is being dragged
  const drag1 = seg(T, grab1 - 0.2, grab1) - seg(T, dragEnd1 + 0.15, dragEnd1 + 0.45);
  const drag2 = seg(T, grab2 - 0.2, grab2) - seg(T, dragEnd2 + 0.15, dragEnd2 + 0.45);

  const buttonScale = 1 - 0.04 * pulse(T, clickT, 0.18);
  const clickPulse = pulse(T, clickT, 0.4);

  // 3D flip: 0 -> 180 during Flip, hold, 180 -> 360 during FlipBack
  const flipAngle = T < CUES.Flip ? 0
    : T < CUES.Concluido ? lerp(0, 180, seg(T, CUES.Flip, CUES.Concluido))
    : T < CUES.FlipBack ? 180
    : lerp(180, 360, seg(T, CUES.FlipBack, authoredTotal));

  const tiltEnabled = tw.tiltEnabled;
  const tiltX = tiltEnabled ? 9 : 0;
  // persistent perspective shift: pulling slider 1 right tips the right side back;
  // pulling slider 2 left tips the left side back — and it stays there, it doesn't spring back.
  const tiltYOffset = tiltEnabled ? seg(T, grab1, dragEnd1) * 12 - seg(T, grab2, dragEnd2) * 18 : 0;
  const tiltY = tiltEnabled ? -6 + tiltYOffset : 0;

  function faceFor(angle) {
    const a = ((angle % 360) + 360) % 360;
    if (a <= 90) return { isBack: false, disp: a };
    if (a <= 270) return { isBack: true, disp: a - 180 };
    return { isBack: false, disp: a - 360 };
  }
  const { isBack, disp: faceDisp } = faceFor(flipAngle);

  // decoration parallax: outline shapes ride in front of the card, filled shapes
  // sit behind it, and both drift + resize as the card's point of view shifts.
  const par = tiltEnabled ? (tiltY + 6) / 10 : 0;
  const frontT = `translate(${par * -34}px, ${par * -14}px) scale(${1 + par * 0.13})`;
  const backT = `translate(${par * 28}px, ${par * 11}px) scale(${1 - par * 0.10})`;

  return React.createElement('div', {
    style: { width: 1440, height: 1080, position: 'relative', overflow: 'hidden', background: tw.darkBackdrop ? 'var(--color-neutral-900)' : 'var(--color-bg)', fontFamily: 'Archivo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  },
    React.createElement('div', { style: { perspective: 2000 } },
      React.createElement('div', { style: { width: SCREEN.w, height: SCREEN.h, transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)` } },
        React.createElement('div', { style: { position: 'relative', width: SCREEN.w, height: SCREEN.h, transform: `rotateY(${faceDisp}deg)` } },

          !isBack && React.createElement(React.Fragment, null,
            React.createElement('div', { style: { position: 'absolute', left: OUTER.x, top: OUTER.y, width: OUTER.w, height: OUTER.h, background: 'var(--color-neutral-200)', borderRadius: 48, zIndex: 1 } }),
            React.createElement('div', { style: { position: 'absolute', left: OUTER.x - 130, top: OUTER.y + 40, width: 130, height: 150, borderRadius: 28, border: '2px solid var(--color-neutral-300)', zIndex: 5, transform: frontT } },
              React.createElement('div', { style: { position: 'absolute', left: 26, bottom: 26, width: 32, height: 32, borderRadius: '50%', background: 'var(--color-neutral-300)' } })
            ),
            React.createElement('div', { style: { position: 'absolute', left: OUTER.x + OUTER.w - 62, top: OUTER.y - 28, width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--color-neutral-400)', zIndex: 5, transform: frontT } }),
            React.createElement('div', { style: { position: 'absolute', left: OUTER.x + OUTER.w - 24, top: OUTER.y - 28, width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--color-neutral-400)', zIndex: 5, transform: frontT } }),
            React.createElement('div', { style: { position: 'absolute', left: OUTER.x + OUTER.w - 40, top: OUTER.y + OUTER.h - 70, width: 80, height: 80, borderRadius: 20, background: 'var(--color-neutral-300)', zIndex: 0, transform: backT } }),

            React.createElement(SliderCard, { y: CARD1.y, h: CARD1.h, label1: 'Escolha', label2: 'seu Crédito', value: creditValue, fmt: fmtInt, trackFracVal: creditFrac, dragging: drag1 }),
            React.createElement(SliderCard, { y: CARD2.y, h: CARD2.h, label1: 'Escolha', label2: 'sua Parcela', value: parcValue, fmt: fmtInt, trackFracVal: parcFrac, dragging: drag2 }),

            React.createElement('div', {
              style: {
                position: 'absolute', left: CARD_X, top: CARD3.y, width: CARD_W, height: CARD3.h,
                background: 'var(--color-bg)', borderRadius: 28, boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${buttonScale})`, zIndex: 2,
              }
            },
              React.createElement('div', { style: { fontSize: 30, color: 'color-mix(in srgb, var(--color-text) 68%, transparent)', fontFamily: 'Archivo, sans-serif', fontWeight: 600 } }, 'Solicitar Crédito')
            ),

            clickPulse > 0.02 && React.createElement('div', {
              style: {
                position: 'absolute', left: BUTTON_CENTER.x - 44 * (1 + clickPulse * 0.5), top: BUTTON_CENTER.y - 44 * (1 + clickPulse * 0.5),
                width: 88 * (1 + clickPulse * 0.5), height: 88 * (1 + clickPulse * 0.5), borderRadius: '50%',
                border: '3px solid var(--color-neutral-400)', opacity: clickPulse * 0.7, pointerEvents: 'none',
              }
            })
          ),

          isBack && React.createElement('div', {
            style: {
              position: 'absolute', left: OUTER.x, top: OUTER.y, width: OUTER.w, height: OUTER.h,
              background: 'var(--color-neutral-200)', borderRadius: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }
          },
            React.createElement('div', { style: { textAlign: 'center', padding: '0 60px' } },
              React.createElement(CheckBadge, null),
              React.createElement('div', { style: { fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--color-text)' } }, 'Solicitação enviada'),
              React.createElement('div', { style: { fontSize: 18, color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', marginTop: 12, lineHeight: 1.4 } }, 'Retornaremos em breve com sua proposta.')
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

function LoanSimApp() {
  return React.createElement(CompositionStage, { width: 1440, height: 1080, scenes: window.OM_SCENES, playback: window.OM_PLAYBACK, bg: '#F2F2F2' },
    React.createElement(Piece, null)
  );
}

Object.assign(window, { LoanSimApp });
