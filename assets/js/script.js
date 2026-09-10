/* ============================================================
   Ademicon — Home
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $  = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(s));

  const brl = (v, casas) => {
    const d = casas === undefined ? 2 : casas;
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const brlCurto = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const soNumeros = (s) => Number(String(s).replace(/\D/g, '')) / 100;

  /* Pinta o preenchimento do range (Chrome/Safari usam --fill) */
  function pintaRange(input) {
    const min = Number(input.min), max = Number(input.max), val = Number(input.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', pct + '%');
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {

      /* ================= MENU MOBILE ================= */
      const navToggle = $('#navToggle');
      const navMobile = $('#navMobile');
      if (navToggle && navMobile) {
        navToggle.addEventListener('click', function () {
          const aberto = !navMobile.hidden;
          navMobile.hidden = aberto;
          navToggle.setAttribute('aria-expanded', String(!aberto));
        });
        $$('a', navMobile).forEach((a) => a.addEventListener('click', function () {
          navMobile.hidden = true;
          navToggle.setAttribute('aria-expanded', 'false');
        }));
      }

      /* ================= HERO — SIMULE SEU CONSÓRCIO ================= */
      const PRODUTOS_HERO = {
        imovel:  { min: 80000, max: 1273442.29, valor: 676721.15, prazo: 200 },
        veiculo: { min: 30000, max: 500000,     valor: 180000,    prazo: 60  },
        servico: { min: 5000,  max: 100000,     valor: 30000,     prazo: 36  }
      };

      const heroProduto = $('#heroProduto');
      const heroRange   = $('#heroRange');
      const heroInput   = $('#heroValorInput');
      const heroLabel   = $('#heroValorLabel');
      const heroMin     = $('#heroMin');
      const heroMax     = $('#heroMax');
      const heroSeg     = $('#heroSegmented');
      let heroModo = 'credito';

      function heroLimites() {
        const p = PRODUTOS_HERO[heroProduto ? heroProduto.value : 'imovel'];
        if (heroModo === 'parcela') {
          return { min: p.min / p.prazo, max: p.max / p.prazo, valor: p.valor / p.prazo };
        }
        return { min: p.min, max: p.max, valor: p.valor };
      }

      function heroAplica(novoValor) {
        if (!heroRange) return;
        const l = heroLimites();
        const valor = novoValor === undefined ? Number(heroRange.value) : novoValor;
        const v = Math.min(l.max, Math.max(l.min, valor));
        heroRange.min = l.min;
        heroRange.max = l.max;
        heroRange.step = 'any';
        heroRange.value = v;
        if (heroInput) heroInput.value = brl(v);
        if (heroMin) heroMin.textContent = brl(l.min);
        if (heroMax) heroMax.textContent = brl(l.max);
        if (heroLabel) heroLabel.textContent = heroModo === 'parcela' ? 'Valor da Parcela' : 'Valor do Crédito';
        pintaRange(heroRange);
      }

      if (heroRange) {
        heroRange.addEventListener('input', function () {
          if (heroInput) heroInput.value = brl(Number(heroRange.value));
          pintaRange(heroRange);
        });
      }
      if (heroInput) {
        heroInput.addEventListener('input', function () {
          const cursor = heroInput.value;
          heroInput.value = brl(soNumeros(cursor));
        });
        heroInput.addEventListener('blur', function () {
          heroAplica(soNumeros(heroInput.value));
        });
      }
      if (heroProduto) {
        heroProduto.addEventListener('change', function () {
          heroAplica(heroLimites().valor);
        });
      }
      if (heroSeg) {
        $$('.seg-btn', heroSeg).forEach((btn) => btn.addEventListener('click', function () {
          $$('.seg-btn', heroSeg).forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          heroModo = btn.dataset.mode;
          heroAplica(heroLimites().valor);
        }));
      }
      heroAplica(heroLimites().valor);

      /* ================= COMO FUNCIONA — SLIDER AUTOMÁTICO ================= */
      /* Cada etapa tem um vídeo (Claude Design) de 10s. O timer da aba dura o
         mesmo tempo do vídeo: a barrinha vermelha começa cheia e vai diminuindo,
         e ao zerar troca de etapa. */
      const steps = $('#steps');
      if (steps) {
        const DURACAO = 10000;
        const slides = $$('.step', steps);
        const tabs   = $$('.step-tab', steps);
        const frames = $$('.step-video', steps);
        let atual = 0;
        let timer = null;
        let pausado = false;
        let carregou = false;

        steps.style.setProperty('--step-duration', DURACAO + 'ms');

        /* Carrega os três vídeos de uma vez quando a seção se aproxima da tela. */
        function carregaVideos() {
          if (carregou) return;
          carregou = true;
          frames.forEach(function (f) {
            if (!f.src && f.dataset.src) {
              f.src = f.dataset.src;
              f.addEventListener('load', function () {
                f.closest('.step-img').classList.add('has-video');
              }, { once: true });
            }
          });
        }

        /* Volta o vídeo da etapa ativa para o começo (tecla "0" do runtime). */
        function reiniciaVideo(i) {
          const f = frames[i];
          if (!f || !f.src) return;
          try {
            const w = f.contentWindow;
            if (!w) return;
            w.dispatchEvent(new w.KeyboardEvent('keydown', { key: '0', code: 'Digit0', bubbles: true }));
          } catch (e) { /* iframe ainda carregando */ }
        }

        function mostra(i) {
          atual = (i + slides.length) % slides.length;

          slides.forEach((s2, k) => s2.classList.toggle('is-active', k === atual));

          tabs.forEach((t, k) => {
            t.classList.remove('is-active', 'is-done', 'is-running');
            const barra = $('i', t);
            if (barra) { barra.style.transition = 'none'; barra.style.width = ''; }
            if (k < atual) t.classList.add('is-done');
          });

          const ativa = tabs[atual];
          ativa.classList.add('is-active');
          const barra = $('i', ativa);
          if (barra) { void barra.offsetWidth; barra.style.transition = ''; }
          requestAnimationFrame(() => ativa.classList.add('is-running'));

          reiniciaVideo(atual);
          agenda();
        }

        function agenda() {
          clearTimeout(timer);
          if (pausado) return;
          timer = setTimeout(() => mostra(atual + 1), DURACAO);
        }

        tabs.forEach((t) => t.addEventListener('click', function () {
          mostra(Number(t.dataset.goto));
        }));

        /* Pausa quando a seção sai da tela; carrega os vídeos ao se aproximar. */
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                carregaVideos();
                pausado = false;
                if (!timer) mostra(atual);
              } else {
                pausado = true;
                clearTimeout(timer);
                timer = null;
              }
            });
          }, { threshold: 0.2, rootMargin: '300px 0px' }).observe(steps);
        } else {
          carregaVideos();
        }

        mostra(0);
      }

      /* ================= LANCES ================= */
      const lances = $('#lances');
      if (lances) {
        const pills = $$('.pill', lances);
        const cards = $$('.lance', lances);
        pills.forEach((p) => p.addEventListener('click', function () {
          const i = Number(p.dataset.lance);
          pills.forEach((x) => x.classList.toggle('is-active', x === p));
          cards.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.lance) === i));
          p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }));
      }

      /* ================= SIMULADOR CONSÓRCIO x EMPRÉSTIMO ================= */
      // Consórcio: taxa de administração de 0,12% ao mês sobre o crédito (sem juros).
      // Empréstimo: 10,5% ao ano compostos -> 0,875% ao mês (Price).
      const TAXA_ADM_MES   = 0.0012;
      const JUROS_ANO      = 0.105;
      const JUROS_MES      = JUROS_ANO / 12;

      const PRODUTOS_COMP = {
        imoveis:  { min: 80000, max: 1500000, step: 10000, valor: 600000, pMin: 24, pMax: 240, pStep: 6, prazo: 60 },
        veiculos: { min: 20000, max: 500000,  step: 5000,  valor: 120000, pMin: 12, pMax: 100, pStep: 2, prazo: 60 },
        servicos: { min: 5000,  max: 150000,  step: 1000,  valor: 30000,  pMin: 6,  pMax: 60,  pStep: 6, prazo: 36 }
      };

      const comp = $('#comparador');
      if (comp) {
        const compValor    = $('#compValor');
        const compPrazo    = $('#compPrazo');
        const compValorOut = $('#compValorOut');
        const compPrazoOut = $('#compPrazoOut');
        const outConsTotal = $('#outConsorcioTotal');
        const outConsMes   = $('#outConsorcioMes');
        const outEmpTotal  = $('#outEmprestimoTotal');
        const outEmpMes    = $('#outEmprestimoMes');
        const outEconomia  = $('#outEconomia');
        const tabs         = $$('.comp-tab', comp);
        let editando = null; // campo que o usuário está digitando agora

        /* Cola o campo no dot: desloca a caixa do centro até o thumb,
           sem deixar que ela ultrapasse as pontas da barra. */
        function posicionaOutput(range, out) {
          const W = range.clientWidth;
          const OW = out.offsetWidth;
          if (!W || !OW) return;
          const min = Number(range.min), max = Number(range.max);
          const pct = max > min ? (Number(range.value) - min) / (max - min) : 0;
          const thumb = 8 + (W - 16) * pct;   // centro do dot, relativo à barra
          let dx = thumb - W / 2;             // a caixa nasce centralizada

          // pode passar das pontas da barra, mas não pode sair do card
          const caixa = comp.getBoundingClientRect();
          const barra = range.getBoundingClientRect();
          const folga = 8;
          const centro = barra.left + W / 2;
          const paraEsquerda = (centro - OW / 2) - (caixa.left + folga);
          const paraDireita  = (caixa.right - folga) - (centro + OW / 2);
          dx = Math.min(Math.max(0, paraDireita), Math.max(-Math.max(0, paraEsquerda), dx));

          out.style.setProperty('--dx', dx.toFixed(1) + 'px');
        }

        function calcula() {
          const credito = Number(compValor.value);
          const n       = Number(compPrazo.value);

          const totalConsorcio = credito * (1 + TAXA_ADM_MES * n);
          const mesConsorcio   = totalConsorcio / n;

          const i = JUROS_MES;
          const mesEmprestimo   = credito * i / (1 - Math.pow(1 + i, -n));
          const totalEmprestimo = mesEmprestimo * n;

          const economia = Math.max(0, totalEmprestimo - totalConsorcio);

          if (editando !== compValorOut) compValorOut.value = brl(credito);
          if (editando !== compPrazoOut) compPrazoOut.value = String(n);
          outConsTotal.textContent = brlCurto(totalConsorcio);
          outConsMes.textContent   = brl(mesConsorcio) + '/mês';
          outEmpTotal.textContent  = brlCurto(totalEmprestimo);
          outEmpMes.textContent    = brl(mesEmprestimo) + '/mês';
          outEconomia.textContent  = brlCurto(economia);

          pintaRange(compValor);
          pintaRange(compPrazo);
          posicionaOutput(compValor, compValorOut);
          posicionaOutput(compPrazo, compPrazoOut);
        }

        /* Campo digitável ligado a um range. `mascara` formata o texto enquanto
           digita; `parse` devolve o número. No blur/Enter o valor é encaixado
           nos limites e no passo do range. */
        function campoEditavel(out, range, mascara, parse) {
          out.addEventListener('focus', function () {
            editando = out;
            out.select();
          });

          out.addEventListener('input', function () {
            editando = out;
            const pos = out.selectionStart;
            const antes = out.value.length;
            if (mascara) {
              out.value = mascara(out.value);
              const depois = out.value.length;
              try { out.setSelectionRange(pos + (depois - antes), pos + (depois - antes)); } catch (e) {}
            }
            const n = parse(out.value);
            if (!isFinite(n)) return;
            const min = Number(range.min), max = Number(range.max);
            range.value = Math.min(max, Math.max(min, n));
            calcula();
          });

          function encerra() {
            const min = Number(range.min), max = Number(range.max);
            const passo = Number(range.step) || 1;
            let n = parse(out.value);
            if (!isFinite(n)) n = Number(range.value);
            n = Math.min(max, Math.max(min, n));
            n = min + Math.round((n - min) / passo) * passo;
            n = Math.min(max, Math.max(min, n));
            range.value = n;
            editando = null;
            calcula();
          }

          out.addEventListener('blur', encerra);
          out.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); out.blur(); }
            if (e.key === 'Escape') { editando = null; calcula(); out.blur(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const passo = Number(range.step) || 1;
              const min = Number(range.min), max = Number(range.max);
              const d = e.key === 'ArrowUp' ? passo : -passo;
              range.value = Math.min(max, Math.max(min, Number(range.value) + d));
              editando = null;
              calcula();
            }
          });
        }

        campoEditavel(compValorOut, compValor, (t) => brl(soNumeros(t)), soNumeros);
        campoEditavel(compPrazoOut, compPrazo, (t) => String(t).replace(/\D/g, ''), (t) => Number(String(t).replace(/\D/g, '')));

        function trocaProduto(chave) {
          const p = PRODUTOS_COMP[chave];
          compValor.min = p.min; compValor.max = p.max; compValor.step = p.step; compValor.value = p.valor;
          compPrazo.min = p.pMin; compPrazo.max = p.pMax; compPrazo.step = p.pStep; compPrazo.value = p.prazo;
          editando = null;
          calcula();
        }

        tabs.forEach((t) => t.addEventListener('click', function () {
          tabs.forEach((x) => x.classList.toggle('is-active', x === t));
          trocaProduto(t.dataset.produto);
        }));

        compValor.addEventListener('input', function () { editando = null; calcula(); });
        compPrazo.addEventListener('input', function () { editando = null; calcula(); });
        window.addEventListener('resize', function () {
          posicionaOutput(compValor, compValorOut);
          posicionaOutput(compPrazo, compPrazoOut);
        });
        calcula();
        // a fonte pode chegar depois e mudar a largura do campo
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            posicionaOutput(compValor, compValorOut);
            posicionaOutput(compPrazo, compPrazoOut);
          });
        }

        const btnBaixar = $('#btnBaixarSimulacao');
        if (btnBaixar) {
          btnBaixar.addEventListener('click', function () {
            const produto = ($('.comp-tab.is-active span', comp) || {}).textContent || '';
            const linhas = [
              'Simulação Ademicon — Consórcio x Empréstimo',
              '===========================================',
              'Produto: ' + produto,
              'Crédito: ' + compValorOut.value,
              'Prazo: ' + compPrazoOut.value + ' meses',
              '',
              'Consórcio Ademicon (sem juros, taxa de admin. média)',
              '  Total: ' + outConsTotal.textContent,
              '  Parcela: ' + outConsMes.textContent,
              '',
              'Empréstimo Bancário (aprox. 10,5% a.a. compostos)',
              '  Total: ' + outEmpTotal.textContent,
              '  Parcela: ' + outEmpMes.textContent,
              '',
              'Economia estimada: ' + outEconomia.textContent,
              '',
              'Valores estimados, sem valor de proposta comercial.'
            ].join('\n');

            const blob = new Blob([linhas], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'simulacao-ademicon.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          });
        }
      }

      /* ================= LARGURA REAL DA VIEWPORT ================= */
      /* 100vw inclui a barra de rolagem; os carrosséis que sangram usam --vw
         para não empurrar a página para os lados. */
      function mediaViewport() {
        document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth + 'px');
      }
      mediaViewport();
      window.addEventListener('resize', mediaViewport);
      window.addEventListener('orientationchange', mediaViewport);

      /* ================= ARRASTAR CARROSSÉIS COM O MOUSE ================= */
      $$('[data-hscroll]').forEach(function (el) {
        let down = false, startX = 0, startScroll = 0, moveu = false;

        el.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch' || e.button !== 0) return;
          down = true; moveu = false;
          startX = e.clientX; startScroll = el.scrollLeft;
        });

        el.addEventListener('pointermove', function (e) {
          if (!down) return;
          const dx = e.clientX - startX;
          if (!moveu && Math.abs(dx) > 4) {
            moveu = true;
            el.classList.add('is-dragging');
            if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
          }
          if (moveu) el.scrollLeft = startScroll - dx;
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
          el.addEventListener(ev, function () {
            down = false;
            el.classList.remove('is-dragging');
          });
        });

        el.addEventListener('click', function (e) {
          if (moveu) { e.preventDefault(); e.stopPropagation(); moveu = false; }
        }, true);

        el.addEventListener('dragstart', function (e) { e.preventDefault(); });
      });

      /* ================= PINTA TODOS OS RANGES NA CARGA ================= */
      $$('.range').forEach(pintaRange);

    } catch (err) {
      console.error('[ademicon-site] erro na inicialização:', err);
    }
  });
})();
