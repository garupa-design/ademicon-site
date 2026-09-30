/* ============================================================
   Ademicon — dobra "A Ademicon está em todo Brasil"
   Filtro Estado > Cidade > lojas + globo 3D (three.js r128) que gira
   até a seleção. Dados: assets/js/lojas-data.js (gerado de data/ademicon-lojas.csv)
   Geometria do globo: assets/js/globo-geo.js (gerado por scripts/build-globo-geo.py)
   three.js e a geometria só carregam quando a dobra se aproxima da tela.
   ============================================================ */
(function () {
  'use strict';

  const BASE = (function () {
    const s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/[^/]*$/, '') : 'assets/js/';
  })();
  const THREE_SRC = BASE + 'vendor/three.min.js';
  const GEO_SRC = BASE + 'globo-geo.js?v=20260929a';

  const PIN_SVG = '<svg class="ic ic-20" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const escapa = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function carregaScript(src) {
    return new Promise(function (ok, erro) {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = ok; s.onerror = function () { erro(new Error('falha ao carregar ' + src)); };
      document.head.appendChild(s);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const secao = document.getElementById('lojas');
    const DADOS = window.ADEMICON_LOJAS;
    if (!secao || !DADOS) return;

    try {
      const selEstado = document.getElementById('lojasEstado');
      const selCidade = document.getElementById('lojasCidade');
      const contagem = document.getElementById('lojasContagem');
      const lista = document.getElementById('lojasLista');
      const resumo = document.getElementById('lojasResumo');
      const btnGeo = document.getElementById('lojasGeo');
      const areaGlobo = document.getElementById('lojasGlobo');

      /* ---------- índices ---------- */
      const porUf = {};
      const todasCidades = [];
      DADOS.forEach(function (e) {
        porUf[e.uf] = e;
        e.total = 0;
        e.cidades.forEach(function (c) { c.uf = e.uf; c.estado = e; e.total += c.lojas.length; todasCidades.push(c); });
      });
      const brasil = DADOS.filter((e) => !e.exterior);
      const exterior = DADOS.filter((e) => e.exterior);

      /* ---------- resumo a partir dos dados ---------- */
      const nBr = brasil.reduce((s, e) => s + e.total, 0);
      const nEstados = brasil.filter((e) => e.uf !== 'DF').length;
      const temDf = !!porUf.DF;
      const nExt = exterior.reduce((s, e) => s + e.total, 0);
      const txtLojas = nBr % 100 === 0 ? nBr + ' lojas' : 'mais de ' + Math.floor(nBr / 100) * 100 + ' lojas';
      resumo.innerHTML = 'São <strong>' + txtLojas + '</strong> em <strong>' + nEstados + ' estados</strong>' +
        (temDf ? ' e no <strong>Distrito Federal</strong>' : '') +
        (nExt ? ', além de ' + plural(nExt, 'loja', 'lojas') + ' nos Estados Unidos' : '') +
        '. Encontre a Ademicon mais próxima de você.';

      /* ---------- selects ---------- */
      brasil.forEach(function (e) {
        const o = document.createElement('option');
        o.value = e.uf; o.textContent = e.nome;
        selEstado.appendChild(o);
      });
      if (exterior.length) {
        const g = document.createElement('optgroup');
        g.label = 'Fora do Brasil';
        exterior.forEach(function (e) {
          const o = document.createElement('option');
          o.value = e.uf; o.textContent = e.nome;
          g.appendChild(o);
        });
        selEstado.appendChild(g);
      }

      let sel = { uf: '', cidade: null };
      let globo = null;

      function preencheCidades(e) {
        selCidade.innerHTML = '';
        if (!e) {
          selCidade.disabled = true;
          selCidade.add(new Option('Selecione o estado', ''));
          return;
        }
        selCidade.disabled = false;
        if (e.cidades.length > 1) selCidade.add(new Option('Todas as cidades', ''));
        e.cidades.forEach((c) => selCidade.add(new Option(c.nome, c.nome)));
      }

      function linkMapa(loja, c) {
        const onde = c.estado.exterior ? c.nome + ', ' + c.uf + ', USA' : c.nome + ' - ' + c.uf;
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Ademicon ' + loja + ', ' + onde);
      }

      // Dentro da cidade, "São Paulo Berrini" aparece só como "Berrini"
      function nomeCurto(loja, c) {
        const p = c.nome + ' ';
        return loja.toLowerCase().indexOf(p.toLowerCase()) === 0 && loja.length > p.length ? loja.slice(p.length) : loja;
      }

      function itemLoja(loja, c) {
        return '<li class="loja-item">' + PIN_SVG +
          '<span class="loja-nome">' + escapa(nomeCurto(loja, c)) + '</span>' +
          '<a class="loja-link" href="' + linkMapa(loja, c) + '" target="_blank" rel="noopener" aria-label="Ver endereço da loja ' + escapa(loja) + ' no Google Maps">ver endereço</a></li>';
      }

      function renderLista() {
        const e = porUf[sel.uf];
        contagem.classList.remove('is-erro');
        if (!e) {
          contagem.textContent = 'Escolha um estado para ver as lojas.';
          lista.innerHTML = '';
          return;
        }
        let html = '';
        if (sel.cidade) {
          const c = sel.cidade;
          contagem.innerHTML = '<strong>' + plural(c.lojas.length, 'loja', 'lojas') + '</strong> em ' + escapa(c.nome) + ', ' + c.uf;
          c.lojas.forEach((l) => { html += itemLoja(l, c); });
        } else {
          contagem.innerHTML = escapa(e.nome) + ': <strong>' + plural(e.total, 'loja', 'lojas') + '</strong> em ' + plural(e.cidades.length, 'cidade', 'cidades');
          e.cidades.forEach(function (c) {
            html += '<li class="lojas-cidade-sep">' + escapa(c.nome) + ' (' + c.lojas.length + ')</li>';
            c.lojas.forEach((l) => { html += itemLoja(l, c); });
          });
        }
        lista.innerHTML = html;
        lista.scrollTop = 0;
      }

      function aplica(uf, cidadeNome) {
        const e = porUf[uf] || null;
        if (sel.uf !== uf) preencheCidades(e);
        let c = null;
        if (e) {
          if (cidadeNome) c = e.cidades.find((x) => x.nome === cidadeNome) || null;
          else if (e.cidades.length === 1) c = e.cidades[0];
        }
        sel = { uf: e ? uf : '', cidade: c };
        selEstado.value = sel.uf;
        selCidade.value = c ? c.nome : '';
        renderLista();
        if (globo) globo.foco(sel);
      }

      selEstado.addEventListener('change', () => aplica(selEstado.value, null));
      selCidade.addEventListener('change', () => aplica(sel.uf, selCidade.value || null));

      /* ---------- minha localização ---------- */
      if (!('geolocation' in navigator)) btnGeo.hidden = true;
      btnGeo.addEventListener('click', function () {
        btnGeo.disabled = true;
        navigator.geolocation.getCurrentPosition(function (pos) {
          btnGeo.disabled = false;
          const la = pos.coords.latitude, lo = pos.coords.longitude, R = Math.PI / 180;
          let melhor = null, dist = Infinity;
          todasCidades.forEach(function (c) {
            const a = Math.sin((c.lat - la) * R / 2) ** 2 + Math.cos(la * R) * Math.cos(c.lat * R) * Math.sin((c.lon - lo) * R / 2) ** 2;
            if (a < dist) { dist = a; melhor = c; }
          });
          if (melhor) aplica(melhor.uf, melhor.nome);
        }, function () {
          btnGeo.disabled = false;
          contagem.textContent = 'Não foi possível acessar sua localização. Escolha o estado e a cidade acima.';
          contagem.classList.add('is-erro');
        }, { timeout: 10000, maximumAge: 600000 });
      });

      renderLista();

      /* ---------- globo: carrega quando a dobra se aproxima ---------- */
      function iniciaGlobo() {
        const p = window.THREE ? Promise.resolve() : carregaScript(THREE_SRC);
        p.then(() => (window.ADEMICON_GLOBO_GEO ? null : carregaScript(GEO_SRC)))
          .then(function () {
            globo = criaGlobo(document.getElementById('lojasGloboCanvas'), areaGlobo, window.ADEMICON_GLOBO_GEO, todasCidades,
              function (c) { aplica(c.uf, c.nome); });
            globo.foco(sel);
          })
          .catch(function (err) {
            console.warn('[ademicon-site] globo indisponível:', err);
            secao.classList.add('sem-globo');
          });
      }
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (ents) {
          if (ents.some((e) => e.isIntersecting)) { io.disconnect(); iniciaGlobo(); }
        }, { rootMargin: '600px 0px' });
        io.observe(secao);
      } else {
        iniciaGlobo();
      }
    } catch (err) {
      console.error('[ademicon-site] erro na dobra de lojas:', err);
    }
  });

  /* ============================================================
     GLOBO
     ============================================================ */
  function criaGlobo(host, area, GEO, cidades, aoEscolher) {
    const T = window.THREE;
    const D = Math.PI / 180;

    const CORES = {
      mundo: new T.Color(0x2c2c2f),
      brasil: new T.Color(0x8e8e93),
      brasilApagado: new T.Color(0x5a5a5f),
      estado: new T.Color(0xEE3124),
      pin: new T.Color(0xEE3124),
      pinApagado: new T.Color(0x8f2a22),
    };

    let visivel = false, rodando = false, ultimo = 0, parado = 0;
    let voltando = false;
    let soltoEm = 0;           // quando o usuário soltou o globo (volta ao foco depois de um tempo)
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
      throw new Error('WebGL indisponível');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    const grupo = new T.Group();
    grupo.rotation.order = 'XYZ';
    scene.add(grupo);

    function vec(lat, lon, r) {
      const la = lat * D, lo = lon * D;
      return new T.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
    }

    /* ---------- esfera base: cinza escuro com borda mais clara, para o globo se destacar do fundo ---------- */
    const base = new T.Mesh(
      new T.SphereGeometry(1, 96, 64),
      new T.ShaderMaterial({
        vertexShader: [
          'varying vec3 vN; varying vec3 vV;',
          'void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }'
        ].join('\n'),
        fragmentShader: [
          'varying vec3 vN; varying vec3 vV;',
          'void main(){ float f = 1.0 - max(dot(vN, vV), 0.0);',
          ' vec3 c = mix(vec3(0.095,0.095,0.10), vec3(0.19,0.19,0.20), pow(f, 3.0));',
          ' gl_FragColor = vec4(c, 1.0); }'
        ].join('\n')
      })
    );
    grupo.add(base);

    /* ---------- glow vermelho ao redor do globo ---------- */
    const atm = new T.Mesh(
      new T.SphereGeometry(1, 64, 48),
      new T.ShaderMaterial({
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: [
          'varying vec3 vN;',
          'void main(){ float i = pow(max(0.0, 0.7 - dot(vN, vec3(0.0,0.0,1.0))), 3.0);',
          ' gl_FragColor = vec4(0.93, 0.19, 0.14, 1.0) * i * 1.2; }'
        ].join('\n'),
        side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
      })
    );
    atm.scale.setScalar(1.18);
    scene.add(atm);

    /* ---------- pontos de terra ---------- */
    const pontos = [];      // [lat, lon, código]
    GEO.linhas.forEach(function (l) {
      const lat = l[0], n = l[1];
      let idx = 0;
      for (let i = 2; i < l.length; i += 3) {
        idx += l[i];
        for (let k = 0; k < l[i + 1]; k++, idx++) pontos.push([lat, -180 + (idx + 0.5) * 360 / n, l[i + 2]]);
      }
    });
    const raioPonto = GEO.passo * D * 0.25;
    const dots = new T.InstancedMesh(new T.CircleGeometry(raioPonto, 6), new T.MeshBasicMaterial({ color: 0xffffff }), pontos.length);
    const dummy = new T.Object3D();
    const idxBrasil = [];
    const codigoBrasil = [];
    pontos.forEach(function (p, i) {
      const v = vec(p[0], p[1], 1.001);
      dummy.position.copy(v);
      dummy.lookAt(v.clone().multiplyScalar(2));
      dummy.updateMatrix();
      dots.setMatrixAt(i, dummy.matrix);
      dots.setColorAt(i, p[2] ? CORES.brasil : CORES.mundo);
      if (p[2]) { idxBrasil.push(i); codigoBrasil.push(GEO.ufs[p[2] - 1]); }
    });
    dots.instanceMatrix.needsUpdate = true;
    grupo.add(dots);

    // cores animadas dos pontos do Brasil
    const corAtual = idxBrasil.map(() => CORES.brasil.clone());
    const corAlvo = idxBrasil.map(() => CORES.brasil.clone());
    let animandoCor = false;

    /* ---------- contornos dos estados ---------- */
    function geometriaContorno(ufs, r) {
      const pos = [];
      ufs.forEach(function (uf) {
        (GEO.contornos[uf] || []).forEach(function (a) {
          for (let i = 0; i + 3 < a.length; i += 2) {
            const p1 = vec(a[i + 1], a[i], r), p2 = vec(a[i + 3], a[i + 2], r);
            pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
          }
        });
      });
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      return g;
    }
    const contornos = new T.LineSegments(geometriaContorno(GEO.ufs, 1.0016),
      new T.LineBasicMaterial({ color: 0x55555a, transparent: true, opacity: 0.55 }));
    grupo.add(contornos);
    const contornoAtivo = new T.LineSegments(new T.BufferGeometry(),
      new T.LineBasicMaterial({ color: 0xEE3124, transparent: true, opacity: 0.95 }));
    grupo.add(contornoAtivo);

    /* ---------- pins das cidades ---------- */
    const pins = new T.InstancedMesh(new T.CircleGeometry(1, 24), new T.MeshBasicMaterial({ color: 0xffffff }), cidades.length);
    const pinPos = [];
    cidades.forEach(function (c, i) {
      const v = vec(c.lat, c.lon, 1.0028);
      pinPos.push(v);
      const r = 0.0034 + 0.0013 * Math.sqrt(c.lojas.length);
      dummy.position.copy(v);
      dummy.lookAt(v.clone().multiplyScalar(2));
      dummy.scale.setScalar(r);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
      pins.setColorAt(i, CORES.pin);
    });
    dummy.scale.setScalar(1);
    pins.instanceMatrix.needsUpdate = true;
    grupo.add(pins);

    /* ---------- marcador da cidade escolhida ----------
       Desenhado por último e sem teste de profundidade, então fica acima de todos os
       outros pins e pontos (os três são transparentes para ficarem na mesma fila de desenho). Quando a cidade vai para trás do globo (arrastando), some. */
    const marcador = new T.Object3D();
    marcador.visible = false;
    grupo.add(marcador);
    const halo = new T.Mesh(new T.CircleGeometry(1, 40),
      new T.MeshBasicMaterial({ color: 0xEE3124, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false }));
    const aro = new T.Mesh(new T.CircleGeometry(1, 40),
      new T.MeshBasicMaterial({ color: 0xEE3124, transparent: true, depthTest: false, depthWrite: false }));
    const miolo = new T.Mesh(new T.CircleGeometry(1, 40),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false }));
    [halo, aro, miolo].forEach(function (m, i) { m.renderOrder = 100 + i; marcador.add(m); });
    const posMarcador = new T.Vector3();

    /* ---------- câmera / rotação ---------- */
    // distância da câmera ao centro do globo (raio 1): menor = mais zoom
    const ZOOM = { brasil: 3.3, estadoMin: 2.4, estadoMax: 3.0, cidade: 2.05, exterior: 2.6 };
    const cur = { rx: 0, ry: 0, d: 6 };
    const alvo = { rx: 0, ry: 0, d: 3.9 };
    let focoAtual = null;

    function miraEm(lat, lon, d) {
      alvo.rx = lat * D;
      alvo.ry = -lon * D;
      while (alvo.ry - cur.ry > Math.PI) alvo.ry -= 2 * Math.PI;
      while (alvo.ry - cur.ry < -Math.PI) alvo.ry += 2 * Math.PI;
      alvo.d = d;
    }

    function aplicaFoco() {
      const s = focoAtual || { uf: '', cidade: null };
      if (s.cidade) {
        miraEm(s.cidade.lat, s.cidade.lon, ZOOM.cidade);
      } else if (s.uf && GEO.centros[s.uf]) {
        const c = GEO.centros[s.uf];
        miraEm(c[0], c[1], Math.min(ZOOM.estadoMax, Math.max(ZOOM.estadoMin, 2.2 + c[2] * 0.045)));
      } else if (s.uf) {  // fora do Brasil: média das cidades
        const cs = cidades.filter((c) => c.uf === s.uf);
        const la = cs.reduce((a, c) => a + c.lat, 0) / cs.length, lo = cs.reduce((a, c) => a + c.lon, 0) / cs.length;
        miraEm(la, lo, ZOOM.exterior);
      } else {
        miraEm(-14.5, -52.5, ZOOM.brasil);
      }
    }

    function foco(s) {
      focoAtual = s;
      soltoEm = 0; voltando = false;
      aplicaFoco();

      // pontos do estado
      idxBrasil.forEach(function (_, k) {
        corAlvo[k].copy(!s.uf ? CORES.brasil : codigoBrasil[k] === s.uf ? CORES.estado : CORES.brasilApagado);
      });
      animandoCor = true;

      // contorno
      contornoAtivo.geometry.dispose();
      contornoAtivo.geometry = s.uf ? geometriaContorno([s.uf], 1.002) : new T.BufferGeometry();

      // pins
      cidades.forEach(function (c, i) {
        pins.setColorAt(i, (!s.uf || c.uf === s.uf) ? CORES.pin : CORES.pinApagado);
      });
      pins.instanceColor.needsUpdate = true;

      // marcador
      if (s.cidade) {
        const v = vec(s.cidade.lat, s.cidade.lon, 1.0028);
        marcador.position.copy(v);
        // orientação em coordenadas do grupo (lookAt usaria coordenadas do mundo, já girado)
        marcador.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), v.clone().normalize());
        const r = Math.max(0.0075, 0.0034 + 0.0013 * Math.sqrt(s.cidade.lojas.length));
        miolo.scale.setScalar(r * 0.95);
        aro.scale.setScalar(r * 1.35);
        halo.scale.setScalar(r * 2.2);
        marcador.visible = true;
      } else {
        marcador.visible = false;
      }
      acorda();
    }

    // começa girado e chega no Brasil quando a dobra aparece
    miraEm(-14.5, -52.5, ZOOM.brasil);
    cur.rx = alvo.rx + 0.35; cur.ry = alvo.ry + 1.9; cur.d = 5.6;
    if (reduzMovimento) { cur.rx = alvo.rx; cur.ry = alvo.ry; cur.d = alvo.d; }

    /* ---------- tamanho ---------- */
    let largura = 1, altura = 1;
    const grade = area.closest('.lojas-grid') || area.parentElement;
    let centroX = 0.5;   // posição horizontal do centro do globo no canvas (0..1)
    function redimensiona() {
      largura = host.clientWidth || 1; altura = host.clientHeight || 1;
      renderer.setSize(largura, altura, false);
      camera.aspect = largura / altura;
      // Desktop: o canvas cobre a dobra inteira e o globo fica centrado a 66% do container
      // (à direita do texto). Mobile: centrado.
      const fundo = getComputedStyle(area).position === 'absolute';
      if (fundo) {
        const rg = grade.getBoundingClientRect(), rh = host.getBoundingClientRect();
        centroX = (rg.left - rh.left + rg.width * 0.66) / largura;
      } else {
        centroX = 0.5;
      }
      area.style.setProperty('--globo-cx', (centroX * 100) + '%');
      camera.setViewOffset(largura, altura, (0.5 - centroX) * largura, 0, largura, altura);
      camera.updateProjectionMatrix();
      acorda();
    }
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(redimensiona); ro.observe(host); ro.observe(grade); }
    else window.addEventListener('resize', redimensiona);
    redimensiona();

    /* ---------- arrastar / escolher ---------- */
    let arrastando = false, moveu = false, px = 0, py = 0, sx = 0, sy = 0, vx = 0, vy = 0;
    const VOLTA_MS = 1200;       // espera depois de soltar o globo antes de voltar à seleção

    function velocidadeArrasto() { return 0.0026 * (cur.d - 1) / 2.4 * (560 / Math.max(altura, 300)); }

    host.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      arrastando = true; moveu = false; voltando = false;
      px = sx = e.clientX; py = sy = e.clientY; vx = vy = 0;
      if (e.pointerType !== 'touch') { try { host.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    host.addEventListener('pointermove', function (e) {
      if (!arrastando) { hover(e); return; }
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      if (!moveu && Math.hypot(e.clientX - sx, e.clientY - sy) > 5) {
        moveu = true;
        host.classList.add('is-dragging');
        area.classList.add('is-usado');
        esconde();
      }
      if (!moveu) return;
      const k = velocidadeArrasto();
      vx = dx * k; vy = e.pointerType === 'touch' ? 0 : dy * k;
      cur.ry += vx; cur.rx = Math.max(-1.3, Math.min(1.3, cur.rx + vy));
      alvo.rx = cur.rx; alvo.ry = cur.ry;
      acorda();
    });
    function solta(e) {
      if (!arrastando) return;
      arrastando = false;
      host.classList.remove('is-dragging');
      if (!moveu && e && e.type === 'pointerup') {
        const c = escolhe(e.clientX, e.clientY, e.pointerType === 'touch' ? 26 : 16);
        if (c) { aoEscolher(c); return; }
      }
      if (moveu) soltoEm = performance.now();
    }
    host.addEventListener('pointerup', solta);
    host.addEventListener('pointercancel', solta);
    host.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') { esconde(); } });

    const tooltip = document.getElementById('lojasTooltip');
    const tmp = new T.Vector3();
    function escolhe(cx, cy, raio) {
      const rect = host.getBoundingClientRect();
      const x = cx - rect.left, y = cy - rect.top;
      grupo.updateMatrixWorld();
      let melhor = null, dMin = raio * raio;
      for (let i = 0; i < pinPos.length; i++) {
        tmp.copy(pinPos[i]).applyMatrix4(grupo.matrixWorld);
        if (tmp.z < 0.25) continue;                 // atrás do globo
        tmp.project(camera);
        const sxp = (tmp.x + 1) / 2 * largura, syp = (1 - tmp.y) / 2 * altura;
        const d2 = (sxp - x) ** 2 + (syp - y) ** 2;
        if (d2 < dMin) { dMin = d2; melhor = cidades[i]; melhor._px = sxp; melhor._py = syp; }
      }
      return melhor;
    }
    function hover(e) {
      if (e.pointerType === 'touch') return;
      const c = escolhe(e.clientX, e.clientY, 14);
      host.classList.toggle('is-pointer', !!c);
      if (!c) { esconde(); return; }
      tooltip.innerHTML = '<strong>' + escapa(c.nome) + ', ' + c.uf + '</strong><span>' + plural(c.lojas.length, 'loja', 'lojas') + '</span>';
      tooltip.style.left = (host.offsetLeft + c._px) + 'px';
      tooltip.style.top = (host.offsetTop + c._py) + 'px';
      tooltip.hidden = false;
    }
    function esconde() { tooltip.hidden = true; host.classList.remove('is-pointer'); }

    /* ---------- laço de animação (só roda com a dobra visível) ---------- */
    function acorda() { parado = 0; if (visivel && !rodando && !document.hidden) { rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); } }

    function quadro(agora) {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;

      // inércia depois de soltar
      if (!arrastando && (Math.abs(vx) > 1e-5 || Math.abs(vy) > 1e-5)) {
        cur.ry += vx; cur.rx = Math.max(-1.3, Math.min(1.3, cur.rx + vy));
        alvo.rx = cur.rx; alvo.ry = cur.ry;
        vx *= 0.92; vy *= 0.92;
      }
      // volta a centralizar a seleção
      if (soltoEm && !arrastando && agora - soltoEm > VOLTA_MS) { soltoEm = 0; vx = vy = 0; voltando = true; aplicaFoco(); }

      // a volta para a seleção é mais rápida que as trocas de estado/cidade
      const a = reduzMovimento ? 1 : 1 - Math.exp(-dt * (voltando ? 6.5 : 3.6));
      const dRx = alvo.rx - cur.rx, dRy = alvo.ry - cur.ry, dD = alvo.d - cur.d;
      cur.rx += dRx * a; cur.ry += dRy * a; cur.d += dD * a;
      if (voltando && Math.abs(dRx) + Math.abs(dRy) < 2e-3) voltando = false;
      grupo.rotation.x = cur.rx; grupo.rotation.y = cur.ry;

      // globo sempre inteiro na largura em telas estreitas
      const ajuste = Math.max(1, 0.95 / camera.aspect);
      camera.position.set(0, 0, 1 + (cur.d - 1) * ajuste);
      camera.lookAt(0, 0, 0);

      // cores dos pontos
      if (animandoCor) {
        let falta = false;
        const k = reduzMovimento ? 1 : 1 - Math.exp(-dt * 6);
        for (let i = 0; i < idxBrasil.length; i++) {
          const c = corAtual[i], t = corAlvo[i];
          c.r += (t.r - c.r) * k; c.g += (t.g - c.g) * k; c.b += (t.b - c.b) * k;
          if (Math.abs(t.r - c.r) + Math.abs(t.g - c.g) + Math.abs(t.b - c.b) > 0.004) falta = true;
          else c.copy(t);
          dots.setColorAt(idxBrasil[i], c);
        }
        dots.instanceColor.needsUpdate = true;
        animandoCor = falta;
      }

      // marcador só aparece com a cidade na face visível do globo
      if (marcador.visible) {
        grupo.updateMatrixWorld();
        marcador.getWorldPosition(posMarcador);
        const frente = posMarcador.z > 0.12;
        halo.visible = aro.visible = miolo.visible = frente;
      }

      renderer.render(scene, camera);

      const emMovimento = Math.abs(dRx) + Math.abs(dRy) + Math.abs(dD) > 1e-4 || animandoCor || arrastando ||
        Math.abs(vx) > 1e-5 || soltoEm;
      parado = emMovimento ? 0 : parado + 1;
      if (visivel && !document.hidden && parado < 10) requestAnimationFrame(quadro);
      else rodando = false;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        visivel = ents[0].isIntersecting;
        if (visivel) acorda();
      }, { threshold: 0.05 }).observe(host);
    } else {
      visivel = true;
    }
    document.addEventListener('visibilitychange', acorda);
    acorda();

    return { foco: foco };
  }
})();
