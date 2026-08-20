/* ============================================================
   CALCULADORA DE VELAS — InsumoVela
   Lógica de la aplicación (JavaScript vanilla)
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     24 · CONFIGURACIÓN CENTRALIZADA (fórmulas, precios, presentaciones)
     --------------------------------------------------------- */
  const CONFIG = {
    formula: {
      // proporciones por cada 1kg de cera
      endurecedorAnimal: 0.10, // 100g / 1000g
      endurecedorVegetal: 0.06, // 60g / 1000g
      esencia: 0.06 // 60cc / 1000g
    },
    presentaciones: {
      cera: { tamano: 1000, unidad: 'kg', label: 'paquete de 1 kg' },
      endurecedorAnimal: { tamano: 100, unidad: 'g', label: 'paquete de 100 g' },
      endurecedorVegetal: { tamano: 100, unidad: 'g', label: 'paquete de 100 g' },
      esencia: { tamano: 60, unidad: 'cc', label: 'frasco de 60 cc' }
    },
    precios: {
      cera: 9900, // por paquete de 1kg
      endurecedorAnimal: 2000, // por paquete de 100g
      endurecedorVegetal: 2500, // por paquete de 100g (editable)
      esencia: 10000, // por frasco de 60cc
      frasco: 1600, // por unidad
      tapa: 1300 // por unidad
    },
    packagingCatalogo: [
      { id: 'caja', label: 'Caja', precioDefault: 800 },
      { id: 'bolsa', label: 'Bolsa', precioDefault: 500 },
      { id: 'etiqueta', label: 'Etiqueta', precioDefault: 200 },
      { id: 'sticker', label: 'Sticker', precioDefault: 150 },
      { id: 'tarjeta', label: 'Tarjeta', precioDefault: 300 },
      { id: 'cinta', label: 'Cinta', precioDefault: 100 },
      { id: 'otro', label: 'Otro', precioDefault: 0 }
    ],
    margenes: [0.30, 0.50, 1.00]
  };

  /* ---------------------------------------------------------
     ESTADO DE LA APP (datos ingresados por la usuaria + resultados)
     --------------------------------------------------------- */
  const state = {
    cantidadVelas: null,
    pesoVela: null, // gramos
    endurecedorTipo: null, // 'animal' | 'vegetal'
    usaEsencia: null, // true | false
    quierePackaging: null, // true | false
    packagingSeleccionado: {}, // { caja: {precio}, etiqueta: {precio}, ... }
    margenSeleccionado: null, // 0.30, 0.50, 1.00
    resultados: {}
  };

  // Orden del flujo (screens)
  const FLOW = [
    'home',
    'cantidad',
    'peso',
    'endurecedor',
    'esencia',
    'packaging-preg',
    'packaging-items', // condicional
    'receta',
    'comprar',
    'costo',
    'venta',
    'final'
  ];

  // Mapeo screen -> etapa de progreso (1..4)
  const STAGE_MAP = {
    'cantidad': 1,
    'peso': 2,
    'endurecedor': 3,
    'esencia': 3,
    'packaging-preg': 3,
    'packaging-items': 3,
    'receta': 4,
    'comprar': 4,
    'costo': 4,
    'venta': 4,
    'final': 4
  };

  let currentIndex = 0;
  let history = [];

  /* ---------------------------------------------------------
     UTILIDADES
     --------------------------------------------------------- */
  function fmtMoney(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }
  function fmtNumber(n, decimals) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtKg(gramos) {
    return fmtNumber(gramos / 1000, 2) + ' kg';
  }
  function fmtG(gramos) {
    return Math.round(gramos) + ' g';
  }
  function fmtCc(cc) {
    return Math.round(cc) + ' cc';
  }
  function ceilDiv(a, b) {
    return Math.ceil(a / b);
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------
     NAVEGACIÓN ENTRE PANTALLAS
     --------------------------------------------------------- */
  function showScreen(name, pushHistory) {
    $all('.screen').forEach(s => s.classList.remove('active'));
    const target = $('.screen[data-screen="' + name + '"]');
    if (target) target.classList.add('active');

    const header = $('#appHeader');
    if (name === 'home') {
      header.hidden = true;
    } else {
      header.hidden = false;
      updateProgress(name);
    }

    if (pushHistory !== false) {
      history.push(name);
    }
    window.scrollTo(0, 0);
  }

  function updateProgress(screenName) {
    const stage = STAGE_MAP[screenName] || 1;
    const pct = (stage / 4) * 100;
    $('#progressFill').style.width = pct + '%';

    $all('.stage').forEach(el => {
      const s = parseInt(el.dataset.stage, 10);
      el.classList.remove('stage-active', 'stage-done');
      if (s === stage) el.classList.add('stage-active');
      else if (s < stage) el.classList.add('stage-done');
    });
  }

  function goBack() {
    if (history.length <= 1) return;
    history.pop(); // pantalla actual
    let prev = history.pop(); // pantalla anterior
    // evitar volver a packaging-items si no corresponde
    if (prev === 'packaging-items' && !state.quierePackaging) {
      prev = history.pop();
    }
    showScreen(prev);
  }

  $('#btnBack').addEventListener('click', goBack);

  /* ---------------------------------------------------------
     PASO 1 · CANTIDAD DE VELAS
     --------------------------------------------------------- */
  const cantidadOptions = $('#cantidadOptions');
  const cantidadCustomField = $('#cantidadCustomField');
  const cantidadCustomInput = $('#cantidadCustomInput');
  const cantidadError = $('#cantidadError');
  const btnCantidadContinuar = $('#btnCantidadContinuar');

  cantidadOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-card');
    if (!btn) return;
    $all('.option-card', cantidadOptions).forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');

    if (btn.dataset.value === 'otro') {
      cantidadCustomField.hidden = false;
      cantidadCustomInput.focus();
      validateCantidadCustom();
    } else {
      cantidadCustomField.hidden = true;
      cantidadError.hidden = true;
      state.cantidadVelas = parseInt(btn.dataset.value, 10);
      btnCantidadContinuar.disabled = false;
    }
  });

  function validateCantidadCustom() {
    const val = parseInt(cantidadCustomInput.value, 10);
    if (!val || val <= 0) {
      state.cantidadVelas = null;
      btnCantidadContinuar.disabled = true;
      cantidadError.hidden = cantidadCustomInput.value === '';
    } else {
      state.cantidadVelas = val;
      btnCantidadContinuar.disabled = false;
      cantidadError.hidden = true;
    }
  }
  cantidadCustomInput.addEventListener('input', validateCantidadCustom);

  btnCantidadContinuar.addEventListener('click', () => showScreen('peso'));

  /* ---------------------------------------------------------
     PASO 2 · PESO DE CADA VELA
     --------------------------------------------------------- */
  const pesoOptions = $('#pesoOptions');
  const pesoCustomField = $('#pesoCustomField');
  const pesoCustomInput = $('#pesoCustomInput');
  const pesoError = $('#pesoError');
  const btnPesoContinuar = $('#btnPesoContinuar');

  pesoOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-card');
    if (!btn) return;
    $all('.option-card', pesoOptions).forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');

    if (btn.dataset.value === 'otro') {
      pesoCustomField.hidden = false;
      pesoCustomInput.focus();
      validatePesoCustom();
    } else {
      pesoCustomField.hidden = true;
      pesoError.hidden = true;
      state.pesoVela = parseInt(btn.dataset.value, 10);
      btnPesoContinuar.disabled = false;
    }
  });

  function validatePesoCustom() {
    const val = parseInt(pesoCustomInput.value, 10);
    if (!val || val <= 0) {
      state.pesoVela = null;
      btnPesoContinuar.disabled = true;
      pesoError.hidden = pesoCustomInput.value === '';
    } else {
      state.pesoVela = val;
      btnPesoContinuar.disabled = false;
      pesoError.hidden = true;
    }
  }
  pesoCustomInput.addEventListener('input', validatePesoCustom);

  btnPesoContinuar.addEventListener('click', () => showScreen('endurecedor'));

  /* ---------------------------------------------------------
     PASO 3 · ENDURECEDOR
     --------------------------------------------------------- */
  const endurecedorOptions = $('#endurecedorOptions');
  const btnEndurecedorContinuar = $('#btnEndurecedorContinuar');

  endurecedorOptions.addEventListener('click', (e) => {
    const card = e.target.closest('.big-choice-card');
    if (!card) return;
    $all('.big-choice-card', endurecedorOptions).forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.endurecedorTipo = card.dataset.value;
    btnEndurecedorContinuar.disabled = false;
  });

  btnEndurecedorContinuar.addEventListener('click', () => showScreen('esencia'));

  /* ---------------------------------------------------------
     PASO 4 · ESENCIA
     --------------------------------------------------------- */
  const esenciaOptions = $('#esenciaOptions');
  const btnEsenciaContinuar = $('#btnEsenciaContinuar');

  esenciaOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-card');
    if (!btn) return;
    $all('.option-card', esenciaOptions).forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    state.usaEsencia = btn.dataset.value === 'si';
    btnEsenciaContinuar.disabled = false;
  });

  btnEsenciaContinuar.addEventListener('click', () => showScreen('packaging-preg'));

  /* ---------------------------------------------------------
     PASO 5 · PACKAGING SI/NO
     --------------------------------------------------------- */
  const packagingPregOptions = $('#packagingPregOptions');
  const btnPackagingPregContinuar = $('#btnPackagingPregContinuar');

  packagingPregOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-card');
    if (!btn) return;
    $all('.option-card', packagingPregOptions).forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    state.quierePackaging = btn.dataset.value === 'si';
    btnPackagingPregContinuar.disabled = false;
  });

  btnPackagingPregContinuar.addEventListener('click', () => {
    if (state.quierePackaging) {
      renderPackagingItems();
      showScreen('packaging-items');
    } else {
      state.packagingSeleccionado = {};
      goToReceta();
    }
  });

  /* ---------------------------------------------------------
     PASO 5b · SELECCIÓN DE ITEMS DE PACKAGING
     --------------------------------------------------------- */
  const packagingItemsList = $('#packagingItemsList');
  const btnPackagingItemsContinuar = $('#btnPackagingItemsContinuar');

  function renderPackagingItems() {
    packagingItemsList.innerHTML = '';
    CONFIG.packagingCatalogo.forEach(item => {
      const selected = !!state.packagingSeleccionado[item.id];
      const row = document.createElement('button');
      row.className = 'check-item' + (selected ? ' selected' : '');
      row.dataset.id = item.id;
      row.innerHTML =
        '<span class="check-box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span class="check-label">' + item.label + '</span>';
      row.addEventListener('click', () => {
        row.classList.toggle('selected');
        if (row.classList.contains('selected')) {
          state.packagingSeleccionado[item.id] = { precio: item.precioDefault, label: item.label };
        } else {
          delete state.packagingSeleccionado[item.id];
        }
      });
      packagingItemsList.appendChild(row);
    });
  }

  btnPackagingItemsContinuar.addEventListener('click', () => goToReceta());

  /* ---------------------------------------------------------
     CÁLCULOS PRINCIPALES (secciones 8, 9, 10, 11, 13-19, 25)
     --------------------------------------------------------- */
  function calcular() {
    const cantidad = state.cantidadVelas;
    const pesoTotalG = cantidad * state.pesoVela; // sección 8

    const ratioEndurecedor = state.endurecedorTipo === 'animal'
      ? CONFIG.formula.endurecedorAnimal
      : CONFIG.formula.endurecedorVegetal;
    const ratioEsencia = state.usaEsencia ? CONFIG.formula.esencia : 0;

    // peso total = cera + endurecedor + esencia => cera*(1+ratioEnd+ratioEsc) = pesoTotal
    const ceraG = pesoTotalG / (1 + ratioEndurecedor + ratioEsencia);
    const endurecedorG = ceraG * ratioEndurecedor;
    const esenciaCc = state.usaEsencia ? ceraG * ratioEsencia : 0;

    const frascos = cantidad;
    const tapas = cantidad;

    // packaging: cantidad de velas x cada item seleccionado
    const packagingCalc = Object.entries(state.packagingSeleccionado).map(([id, data]) => ({
      id, label: data.label, precio: data.precio, cantidad: cantidad, subtotal: data.precio * cantidad
    }));

    // ---- Qué comprar (sección 13) ----
    const presCera = CONFIG.presentaciones.cera;
    const presEndurecedor = state.endurecedorTipo === 'animal'
      ? CONFIG.presentaciones.endurecedorAnimal
      : CONFIG.presentaciones.endurecedorVegetal;
    const presEsencia = CONFIG.presentaciones.esencia;

    const paquetesCera = ceilDiv(ceraG, presCera.tamano);
    const paquetesEndurecedor = ceilDiv(endurecedorG, presEndurecedor.tamano);
    const frascosEsencia = state.usaEsencia ? ceilDiv(esenciaCc, presEsencia.tamano) : 0;

    // ---- Costos (sección 16-17) ----
    const precioEndurecedorPorPaquete = state.endurecedorTipo === 'animal'
      ? CONFIG.precios.endurecedorAnimal
      : CONFIG.precios.endurecedorVegetal;

    const costoCera = paquetesCera * CONFIG.precios.cera;
    const costoEndurecedor = paquetesEndurecedor * precioEndurecedorPorPaquete;
    const costoEsencia = state.usaEsencia ? frascosEsencia * CONFIG.precios.esencia : 0;
    const costoMateriales = costoCera + costoEndurecedor + costoEsencia;

    const costoFrascos = frascos * CONFIG.precios.frasco;
    const costoTapas = tapas * CONFIG.precios.tapa;
    const costoEnvases = costoFrascos + costoTapas;

    const costoPackaging = packagingCalc.reduce((sum, p) => sum + p.subtotal, 0);

    const costoTotal = costoMateriales + costoEnvases + costoPackaging;
    const costoUnitario = costoTotal / cantidad;

    state.resultados = {
      cantidad, pesoTotalG,
      ceraG, endurecedorG, esenciaCc,
      frascos, tapas,
      packagingCalc,
      paquetesCera, paquetesEndurecedor, frascosEsencia,
      presCera, presEndurecedor, presEsencia,
      costoCera, costoEndurecedor, costoEsencia, costoMateriales,
      costoFrascos, costoTapas, costoEnvases,
      costoPackaging,
      costoTotal, costoUnitario
    };
  }

  /* ---------------------------------------------------------
     PANTALLA: RECETA (sección 12)
     --------------------------------------------------------- */
  function goToReceta() {
    calcular();
    renderReceta();
    showScreen('receta');
  }

  function iconSvg(name) {
    const icons = {
      cera: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1.5 2.3 3.5 4.8 3.5 7.3a3.5 3.5 0 01-7 0C8.5 6.8 10.5 4.3 12 2z" stroke="#BC6547" stroke-width="1.6"/><rect x="7" y="12" width="10" height="9" rx="1.5" stroke="#BC6547" stroke-width="1.6"/></svg>',
      endurecedor: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12M8 3v4l-3 9a3 3 0 003 3.9h8a3 3 0 003-3.9l-3-9V3" stroke="#78805C" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      esencia: '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="4" rx="1" stroke="#C8A874" stroke-width="1.6"/><path d="M10 6v3.5L6.5 15A3 3 0 009 20h6a3 3 0 002.5-5L14 9.5V6" stroke="#C8A874" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      frasco: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 2h6v3.5l2 3V20a2 2 0 01-2 2H9a2 2 0 01-2-2V8.5l2-3V2z" stroke="#2B3A42" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      tapa: '<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="7" rx="7" ry="3" stroke="#2B3A42" stroke-width="1.6"/><path d="M5 7v4c0 1.7 3.1 3 7 3s7-1.3 7-3V7" stroke="#2B3A42" stroke-width="1.6"/></svg>',
      caja: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 8l9-5 9 5-9 5-9-5z" stroke="#BC6547" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8v9l9 5 9-5V8M12 13v9" stroke="#BC6547" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      generico: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#78805C" stroke-width="1.6"/></svg>'
    };
    return icons[name] || icons.generico;
  }

  function renderReceta() {
    const r = state.resultados;
    const list = $('#recetaList');
    list.innerHTML = '';

    const items = [
      { icon: 'cera', label: 'Cera', value: fmtKg(r.ceraG) },
      { icon: 'endurecedor', label: 'Endurecedor ' + (state.endurecedorTipo === 'animal' ? 'animal' : 'vegetal'), value: fmtG(r.endurecedorG) }
    ];
    if (state.usaEsencia) {
      items.push({ icon: 'esencia', label: 'Esencia aromática', value: fmtCc(r.esenciaCc) });
    }
    items.push({ icon: 'frasco', label: 'Frascos', value: r.frascos + ' unidades' });
    items.push({ icon: 'tapa', label: 'Tapas', value: r.tapas + ' unidades' });

    r.packagingCalc.forEach(p => {
      items.push({ icon: 'caja', label: p.label, value: p.cantidad + ' unidades' });
    });

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.innerHTML =
        '<span class="recipe-card-icon">' + iconSvg(it.icon) + '</span>' +
        '<span><span class="recipe-card-label">' + it.label + '</span><br>' +
        '<span class="recipe-card-value">' + it.value + '</span></span>';
      list.appendChild(card);
    });
  }

  $('#btnRecetaContinuar').addEventListener('click', () => {
    renderComprar();
    showScreen('comprar');
  });

  /* ---------------------------------------------------------
     PANTALLA: QUÉ COMPRAR (sección 13)
     --------------------------------------------------------- */
  function renderComprar() {
    const r = state.resultados;
    const list = $('#buyList');
    list.innerHTML = '';

    const rows = [
      {
        title: 'Cera BPF',
        need: 'Necesitás ' + fmtKg(r.ceraG),
        action: 'Comprá ' + r.paquetesCera + ' ' + (r.paquetesCera === 1 ? r.presCera.label : 'paquetes de 1 kg')
      },
      {
        title: 'Endurecedor ' + (state.endurecedorTipo === 'animal' ? 'animal' : 'vegetal'),
        need: 'Necesitás ' + fmtG(r.endurecedorG),
        action: 'Comprá ' + r.paquetesEndurecedor + ' ' + (r.paquetesEndurecedor === 1 ? r.presEndurecedor.label : 'paquetes de 100 g')
      }
    ];
    if (state.usaEsencia) {
      rows.push({
        title: 'Esencia aromática',
        need: 'Necesitás ' + fmtCc(r.esenciaCc),
        action: 'Comprá ' + r.frascosEsencia + ' ' + (r.frascosEsencia === 1 ? r.presEsencia.label : 'frascos de 60 cc')
      });
    }
    rows.push({
      title: 'Frascos de vidrio',
      need: 'Necesitás ' + r.frascos + ' unidades',
      action: 'Comprá ' + r.frascos + ' frascos'
    });
    rows.push({
      title: 'Tapas',
      need: 'Necesitás ' + r.tapas + ' unidades',
      action: 'Comprá ' + r.tapas + ' tapas'
    });
    r.packagingCalc.forEach(p => {
      rows.push({
        title: p.label,
        need: 'Necesitás ' + p.cantidad + ' unidades',
        action: 'Comprá ' + p.cantidad + ' ' + p.label.toLowerCase() + (p.cantidad === 1 ? '' : 's')
      });
    });

    rows.forEach(row => {
      const card = document.createElement('div');
      card.className = 'buy-card';
      card.innerHTML =
        '<div class="buy-card-title">' + row.title + '</div>' +
        '<div class="buy-card-need">' + row.need + '</div>' +
        '<div class="buy-card-action">' + row.action + '</div>';
      list.appendChild(card);
    });
  }

  $('#btnComprarContinuar').addEventListener('click', () => {
    renderCosto();
    showScreen('costo');
  });

  /* ---------------------------------------------------------
     PANTALLA: COSTO (secciones 16-17)
     --------------------------------------------------------- */
  function renderCosto() {
    const r = state.resultados;
    $('#costoTotalLote').textContent = fmtMoney(r.costoTotal);
    $('#costoUnaVela').textContent = fmtMoney(r.costoUnitario);

    const list = $('#breakdownList');
    list.innerHTML = '';
    const rows = [
      { label: 'Materiales (cera + endurecedor' + (state.usaEsencia ? ' + esencia' : '') + ')', value: r.costoMateriales },
      { label: 'Envases (frascos + tapas)', value: r.costoEnvases }
    ];
    if (r.costoPackaging > 0) {
      rows.push({ label: 'Packaging', value: r.costoPackaging });
    }
    rows.forEach(row => {
      const div = document.createElement('div');
      div.className = 'breakdown-row';
      div.innerHTML = '<span>' + row.label + '</span><span>' + fmtMoney(row.value) + '</span>';
      list.appendChild(div);
    });
    const total = document.createElement('div');
    total.className = 'breakdown-row breakdown-row-total';
    total.innerHTML = '<span>Total</span><span>' + fmtMoney(r.costoTotal) + '</span>';
    list.appendChild(total);
  }

  $('#btnCostoContinuar').addEventListener('click', () => {
    renderVenta();
    showScreen('venta');
  });

  /* ---------------------------------------------------------
     PANTALLA: PRECIO DE VENTA (sección 18)
     Fórmula: recargo sobre el costo (precio = costo * (1 + %))
     --------------------------------------------------------- */
  function renderVenta() {
    const r = state.resultados;
    const wrap = $('#ventaOptions');
    wrap.innerHTML = '';

    CONFIG.margenes.forEach((pct, idx) => {
      const precioUnitario = r.costoUnitario * (1 + pct);
      const gananciaUnitaria = precioUnitario - r.costoUnitario;
      const gananciaLote = gananciaUnitaria * r.cantidad;

      const card = document.createElement('button');
      card.className = 'margin-card' + (state.margenSeleccionado === pct ? ' selected' : '');
      card.dataset.pct = pct;
      card.innerHTML =
        '<div class="margin-card-top">' +
          '<span class="margin-card-pct">Ganar ' + Math.round(pct * 100) + '%</span>' +
          '<span class="margin-card-radio"></span>' +
        '</div>' +
        '<div class="margin-card-row"><span>Precio por vela</span><span>' + fmtMoney(precioUnitario) + '</span></div>' +
        '<div class="margin-card-row margin-card-row-highlight"><span>Ganancia por vela</span><span>' + fmtMoney(gananciaUnitaria) + '</span></div>' +
        '<div class="margin-card-row margin-card-row-highlight"><span>Ganancia del lote</span><span>' + fmtMoney(gananciaLote) + '</span></div>';

      card.addEventListener('click', () => {
        state.margenSeleccionado = pct;
        $all('.margin-card', wrap).forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });

      wrap.appendChild(card);
    });

    if (state.margenSeleccionado === null) {
      state.margenSeleccionado = CONFIG.margenes[1]; // 50% por defecto
      $all('.margin-card', wrap)[1].classList.add('selected');
    }
  }

  $('#btnVentaContinuar').addEventListener('click', () => {
    renderFinal();
    showScreen('final');
  });

  /* ---------------------------------------------------------
     PANTALLA FINAL (sección 19)
     --------------------------------------------------------- */
  function renderFinal() {
    const r = state.resultados;
    $('#finalCantidad').textContent = r.cantidad + ' velas';

    const needList = $('#finalNeedList');
    needList.innerHTML = '';
    const needs = [
      ['Cera', fmtKg(r.ceraG)],
      ['Endurecedor', fmtG(r.endurecedorG)]
    ];
    if (state.usaEsencia) needs.push(['Esencia', fmtCc(r.esenciaCc)]);
    needs.push(['Frascos', r.frascos + ' u.']);
    needs.push(['Tapas', r.tapas + ' u.']);
    needs.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'final-need-row';
      row.innerHTML = '<span>' + label + '</span><span>' + value + '</span>';
      needList.appendChild(row);
    });

    $('#finalCosto').textContent = fmtMoney(r.costoTotal);
    const precioUnitario = r.costoUnitario * (1 + state.margenSeleccionado);
    $('#finalPrecio').textContent = fmtMoney(precioUnitario);
  }

  $('#btnNuevoCalculo').addEventListener('click', () => {
    resetState();
    showScreen('cantidad');
  });
  $('#btnVolverInicio').addEventListener('click', () => {
    resetState();
    history = [];
    showScreen('home');
  });

  function resetState() {
    state.cantidadVelas = null;
    state.pesoVela = null;
    state.endurecedorTipo = null;
    state.usaEsencia = null;
    state.quierePackaging = null;
    state.packagingSeleccionado = {};
    state.margenSeleccionado = null;
    state.resultados = {};

    $all('.option-card.selected, .big-choice-card.selected, .check-item.selected').forEach(el => el.classList.remove('selected'));
    $('#cantidadCustomField').hidden = true;
    $('#pesoCustomField').hidden = true;
    $('#cantidadCustomInput').value = '';
    $('#pesoCustomInput').value = '';
    $('#btnCantidadContinuar').disabled = true;
    $('#btnPesoContinuar').disabled = true;
    $('#btnEndurecedorContinuar').disabled = true;
    $('#btnEsenciaContinuar').disabled = true;
    $('#btnPackagingPregContinuar').disabled = true;
  }

  /* ---------------------------------------------------------
     INICIO
     --------------------------------------------------------- */
  $('#btnStart').addEventListener('click', () => showScreen('cantidad'));

  /* ---------------------------------------------------------
     MODAL DE PRECIOS (sección 24, editable)
     --------------------------------------------------------- */
  const settingsOverlay = $('#settingsOverlay');
  const settingsList = $('#settingsList');

  const PRICE_FIELDS = [
    { key: 'cera', label: 'Cera BPF', sub: 'Precio por paquete de 1 kg' },
    { key: 'endurecedorAnimal', label: 'Endurecedor animal', sub: 'Precio por paquete de 100 g' },
    { key: 'endurecedorVegetal', label: 'Endurecedor vegetal', sub: 'Precio por paquete de 100 g' },
    { key: 'esencia', label: 'Esencia aromática', sub: 'Precio por frasco de 60 cc' },
    { key: 'frasco', label: 'Frasco de vidrio', sub: 'Precio por unidad' },
    { key: 'tapa', label: 'Tapa', sub: 'Precio por unidad' }
  ];

  function renderSettings() {
    settingsList.innerHTML = '';
    PRICE_FIELDS.forEach(f => {
      const row = document.createElement('div');
      row.className = 'settings-row';
      row.innerHTML =
        '<div class="settings-row-label">' + f.label + '</div>' +
        '<div class="settings-row-sub">' + f.sub + '</div>' +
        '<input type="number" inputmode="decimal" min="0" data-key="' + f.key + '" value="' + CONFIG.precios[f.key] + '">';
      settingsList.appendChild(row);
    });

    // packaging prices (only show if items selected, else show full catalog for reference)
    const pkgKeys = Object.keys(state.packagingSeleccionado);
    if (pkgKeys.length > 0) {
      pkgKeys.forEach(id => {
        const item = state.packagingSeleccionado[id];
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML =
          '<div class="settings-row-label">' + item.label + '</div>' +
          '<div class="settings-row-sub">Precio por unidad (packaging)</div>' +
          '<input type="number" inputmode="decimal" min="0" data-pkg="' + id + '" value="' + item.precio + '">';
        settingsList.appendChild(row);
      });
    }
  }

  $('#btnSettings').addEventListener('click', () => {
    renderSettings();
    settingsOverlay.hidden = false;
  });
  $('#btnEditarPrecios').addEventListener('click', () => {
    renderSettings();
    settingsOverlay.hidden = false;
  });
  $('#btnCloseSettings').addEventListener('click', () => { settingsOverlay.hidden = true; });
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.hidden = true;
  });

  $('#btnGuardarPrecios').addEventListener('click', () => {
    $all('input[data-key]', settingsList).forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) CONFIG.precios[input.dataset.key] = val;
    });
    $all('input[data-pkg]', settingsList).forEach(input => {
      const val = parseFloat(input.value);
      const id = input.dataset.pkg;
      if (!isNaN(val) && val >= 0 && state.packagingSeleccionado[id]) {
        state.packagingSeleccionado[id].precio = val;
      }
    });
    settingsOverlay.hidden = true;

    // Recalcular si ya hay resultados visibles
    if (state.resultados && state.resultados.cantidad) {
      calcular();
      const activeScreen = $('.screen.active');
      const name = activeScreen ? activeScreen.dataset.screen : '';
      if (name === 'receta') renderReceta();
      if (name === 'comprar') renderComprar();
      if (name === 'costo') renderCosto();
      if (name === 'venta') renderVenta();
      if (name === 'final') renderFinal();
    }
  });

  /* ---------------------------------------------------------
     PWA: registrar service worker
     --------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* silencioso: si falla el SW la app sigue funcionando */
      });
    });
  }

  /* ---------------------------------------------------------
     ESTADO INICIAL
     --------------------------------------------------------- */
  showScreen('home', false);
  history = ['home'];

})();
