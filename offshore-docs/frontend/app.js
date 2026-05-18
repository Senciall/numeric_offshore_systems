import { ICON_DEFS, getBuiltinSvg } from '/static/icons.js';

const DEFAULT_NODE_W = 86;
const DEFAULT_NODE_H = 82;
const MIN_NODE_W = 34;
const MIN_NODE_H = 32;
const MAX_NODE_W = 320;
const MAX_NODE_H = 320;
const DEFAULT_LABEL_OFFSET = { x: 0, y: 48 };
const LABEL_OFFSET_LIMIT = { x: 78, y: 82 };
const WIRE_STRAIGHT_SNAP = 14;
const WIRE_CONNECTOR_SNAP_PX = 30;
const WIRE_PORT_STUB = 28;
const WIRE_CORNER_RADIUS = 7;
const WIRE_HIT_TOLERANCE = 18;
const CENTERLINE_SNAP_PX = 10;
const EXPANDED_PART_PREVIEW = { width: 520, height: 320, canvasWidth: 458, canvasHeight: 232, padding: 22 };
const EXPANDED_PART_CLEARANCE = 34;
const RELOCATION_PASSES = 6;
const DEFAULT_CONNECTOR_COUNT = 8;
const MIN_CONNECTOR_COUNT = 4;
const MAX_CONNECTOR_COUNT = 24;
const CONNECTOR_DOT_COLOR = '#3d9b63';
const DEFAULT_CONNECTORS = makeUniformConnectors(DEFAULT_CONNECTOR_COUNT);
const SHAPE_CONNECTORS_8 = makeUniformConnectors(DEFAULT_CONNECTOR_COUNT);
const WIRE_TYPES = [
  { value: 'power', label: 'Power' },
  { value: 'control', label: 'Control' },
  { value: 'signal', label: 'Signal' },
  { value: 'instrument', label: 'Instrument' },
  { value: 'network', label: 'Network' },
  { value: 'ground', label: 'Ground' },
];
const WIRE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
];
const DEFAULT_TEXT_STYLE = {
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  fontSize: 16,
  bold: false,
  italic: false,
  color: '',
};
const SOURCE_FOLDER_NAMES = {
  '1019943': 'Circuit_Breaker_20A_1019943',
  '192075': 'Circuit_Breaker_Eaton_FAZ-NA_192075',
  '0801733': 'DIN_Rail_2000mm_0801733',
  '1207650': 'DIN_Rail_500mm_1207650',
  '3047028': 'End_Cover_DUT25_3047028',
  '3214314': 'End_Cover_Multi_Level_3214314',
  '3047141': 'End_Cover_UT4_3047141',
  '0800886': 'End_Stop_0800886',
  '3044102': 'Feed_Thru_Terminal_32A_3044102',
  '3047701': 'Feed_Thru_Terminal_White_3047701',
  '3046032': 'Fused_Terminal_5x20_3046032',
  '3046401': 'Fused_Terminal_6x32_3046401',
  '3048386': 'Fuse_Holder_UK103_3048386',
  '3044128': 'Ground_Terminal_3044128',
  '3009299': 'Jumper_Bar_UK103_3009299',
  '3032224': 'Jumper_Bar_UT4_3032224',
  '3046139': 'Knife_Disconnect_Terminal_3046139',
  '3046171': 'Knife_Disconnect_Terminal_UT4-MT-PP_3046171',
  '3046223': 'Ground_Terminal_UT4-MTD-PE_3046223',
  '0810009': 'Marker_Strip_Flat_UK103_0810009',
  '1051016': 'Marker_Strip_UT4_1051016',
  '3214259': 'Multi_Level_Terminal_3L_3214259',
  '2907918': 'Surge_Protector_2907918',
  '3030336': 'Terminal_Bridge_2Pos_3030336',
  '929121': 'DEHNpatch_Surge_Arrester_929121',
  'AIIS-3411P': 'Advantech_Compact_Vision_System_AIIS-3411P',
  'CGT4U': 'Connectwell_Ground_Terminal_CGT4U',
  'EKI-1526': 'Advantech_Serial_Device_Server_EKI-1526',
  'FPR-1000-Series': 'Cisco_Firepower_1000_FPR-1000-Series',
  'LMX-1002G-SFP-T': 'Antaira_Managed_Switch_LMX-1002G-SFP-T',
  'M4300-28G-PoE+': 'NETGEAR_M4300_PoE_Switch_M4300-28G-PoEPlus',
  'MIC-710AIX': 'Advantech_MIC-710AIX',
  'MIC-733-AO': 'Advantech_MIC-733-AO',
  'QS40.481': 'PULS_DIN_Rail_PSU_QS40.481',
  'SDR-120-24': 'MeanWell_DIN_Rail_PSU_SDR-120-24',
  'Unknown': 'Unidentified_White_Enclosure_Unknown',
  'WS-C3560CX-8PC-S': 'Cisco_Catalyst_3560CX_WS-C3560CX-8PC-S',
};
const PART_GROUP_ORDER = [
  'Computers & Controllers',
  'Network',
  'Power',
  'Protection',
  'Terminal Blocks',
  'Fused Terminals',
  'DIN Rail & Hardware',
  'Enclosures',
];
const HIDDEN_LIBRARY_GROUPS = new Set(['Built In', 'Unsorted']);

function makeUniformConnectors(count = DEFAULT_CONNECTOR_COUNT) {
  const safeCount = Math.max(MIN_CONNECTOR_COUNT, Math.min(MAX_CONNECTOR_COUNT, Math.round(Number(count) || DEFAULT_CONNECTOR_COUNT)));
  return Array.from({ length: safeCount }, (_, idx) => {
    const t = (idx / safeCount) * 4;
    let x;
    let y;
    if (t <= 1) {
      x = t;
      y = 0;
    } else if (t <= 2) {
      x = 1;
      y = t - 1;
    } else if (t <= 3) {
      x = 3 - t;
      y = 1;
    } else {
      x = 0;
      y = 4 - t;
    }
    return {
      id: `p${idx + 1}`,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      role: 'neutral',
      label: `P${idx + 1}`,
      size: 5,
      color: CONNECTOR_DOT_COLOR,
    };
  });
}

const App = {
  state: {
    platforms: [],
    platformNodes: [],
    subdiagrams: [],
    customIcons: [],
    partFolders: [],
    currentPlatformId: null,
    currentDiagram: { type: 'root', subdiagramId: null, title: 'Main Diagram' },
    selectedNodeId: null,
    selectedNodeIds: new Set(),
    selectedGroupId: null,
    draggingGroup: null,
    selectedWireId: null,
    selectedPartKey: 'generic',
    partSearch: '',
    creatorPartSearch: '',
    collapsedPartFolders: new Set(),
    expandedPartFolders: new Set(),
    expandedNodeIds: new Set(),
    expandedDiagramCache: new Map(),
    expandedDiagramLoading: new Set(),
    iconImageMetrics: new Map(),
    iconImageMetricLoads: new Set(),
    visualOffsets: new Map(),
    editMode: false,
    diagram: AppEmptyDiagram(),
    docCounts: {},
    lastNodeFiles: [],
    draggingNode: null,
    draggingWireEnd: null,
    draggingLabel: null,
    wireDraft: null,
    wireDragActive: false,
    suppressConnectorClick: false,
    draftPoint: null,
    panning: null,
    draggingBend: null,
    resizingNode: null,
    copiedNode: null,
    pasteCount: 0,
    snapGuides: [],
    theme: 'dark',
    activeCanvasTool: 'select',
    editingTextNodeId: null,
    activeToolbarAction: null,
    didDragNode: false,
    creator: {
      selectedIconId: null,
      file: null,
      objectUrl: null,
      imageUrl: null,
      documents: [],
      existingDocuments: [],
      docFolders: ['Documents'],
      selectedDocFolder: 'Documents',
      collapsedDocFolders: new Set(),
      links: [],
      connectors: DEFAULT_CONNECTORS.map((c) => ({ ...c })),
      activeConnectorId: null,
      addingDot: false,
      imageTransform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
      imageMetrics: null,
    },
    _addCount: 0,
  },

  el(id) {
    return document.getElementById(id);
  },

  async api(path, { method = 'GET', body, form = false } = {}) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      if (form) {
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }

    const res = await fetch(path, opts);
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    const detail = data && (data.error || (typeof data.detail === 'string' ? data.detail : null));
    if (!res.ok) throw new Error(detail || `HTTP ${res.status}`);
    return data;
  },

  toast(msg, kind = 'info', ms = 3000) {
    const box = App.el('toasts');
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    node.textContent = msg;
    box.prepend(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 200);
    }, ms);
  },

  esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  },

  applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    App.state.theme = next;
    document.body.classList.toggle('theme-light', next === 'light');
    App.el('theme-toggle-btn').textContent = next === 'light' ? 'Dark' : 'Light';
    try {
      localStorage.setItem('offshore-theme', next);
    } catch {
      // Local storage can be unavailable in hardened browser contexts.
    }
  },

  initTheme() {
    let saved = 'dark';
    try {
      saved = localStorage.getItem('offshore-theme') || 'dark';
    } catch {
      saved = 'dark';
    }
    App.applyTheme(saved);
  },

  toggleTheme() {
    App.applyTheme(App.state.theme === 'light' ? 'dark' : 'light');
  },

  uid(prefix) {
    const raw = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${raw}`;
  },

  clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  },

  viewport() {
    const vp = App.state.diagram.viewport || {};
    const zoom = Number(vp.zoom) || 1;
    return {
      x: Number(vp.x) || 0,
      y: Number(vp.y) || 0,
      zoom: Math.max(0.25, Math.min(3, zoom)),
    };
  },

  boardToStage(point) {
    const vp = App.viewport();
    return { x: point.x * vp.zoom + vp.x, y: point.y * vp.zoom + vp.y };
  },

  stageToBoard(point) {
    const vp = App.viewport();
    return { x: (point.x - vp.x) / vp.zoom, y: (point.y - vp.y) / vp.zoom };
  },

  capturePointer(el, pointerId) {
    try {
      el?.setPointerCapture?.(pointerId);
    } catch {
      // Some synthetic/browser edge cases report no active pointer. Drag state still works.
    }
  },

  normalizeWireEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'object') return null;
    if (endpoint.nodeId && endpoint.connectorId) {
      return { nodeId: String(endpoint.nodeId), connectorId: String(endpoint.connectorId) };
    }
    if (Number.isFinite(Number(endpoint.x)) && Number.isFinite(Number(endpoint.y))) {
      return { x: Number(endpoint.x), y: Number(endpoint.y) };
    }
    return null;
  },

  normalizeWireBends(via) {
    if (!Array.isArray(via)) return [];
    return via
      .map((point) => ({
        x: Number(point?.x),
        y: Number(point?.y),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  },

  defaultLabelOffset(node = null) {
    const h = App.clampNodeHeight(node?.h);
    return { x: 0, y: Math.round(h / 2 + 10) };
  },

  labelOffsetBounds(node = null) {
    if (!node) {
      return {
        minX: -LABEL_OFFSET_LIMIT.x,
        maxX: LABEL_OFFSET_LIMIT.x,
        minY: -LABEL_OFFSET_LIMIT.y,
        maxY: LABEL_OFFSET_LIMIT.y,
      };
    }
    const w = App.clampNodeWidth(node.w);
    const h = App.clampNodeHeight(node.h);
    return {
      minX: Math.round(-w / 2 - 96),
      maxX: Math.round(w / 2 + 96),
      minY: Math.round(-h / 2 - 34),
      maxY: Math.round(h / 2 + 48),
    };
  },

  normalizeLabelOffset(offset, node = null) {
    const raw = offset && typeof offset === 'object' ? offset : App.defaultLabelOffset(node);
    const x = Number(raw.x);
    const y = Number(raw.y);
    const bounds = App.labelOffsetBounds(node);
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, Number.isFinite(x) ? Math.round(x) : 0)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, Number.isFinite(y) ? Math.round(y) : App.defaultLabelOffset(node).y)),
    };
  },

  clampNodeWidth(value) {
    return Math.max(MIN_NODE_W, Math.min(MAX_NODE_W, Math.round(Number(value) || DEFAULT_NODE_W)));
  },

  clampNodeHeight(value) {
    return Math.max(MIN_NODE_H, Math.min(MAX_NODE_H, Math.round(Number(value) || DEFAULT_NODE_H)));
  },

  isCustomIcon(iconKey) {
    return String(iconKey || '').startsWith('custom:');
  },

  normalizePartLookup(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  findCustomIconByLabel(label) {
    const needle = App.normalizePartLookup(label);
    if (!needle) return null;
    const icons = App.state.customIcons || [];
    return icons.find((item) => App.normalizePartLookup(item.name) === needle)
      || icons.find((item) => App.normalizePartLookup(item.part_number) === needle)
      || null;
  },

  customIconForKey(iconKey, label = '') {
    if (!App.isCustomIcon(iconKey)) return null;
    const iconId = String(iconKey).slice('custom:'.length);
    const icons = App.state.customIcons || [];
    return icons.find((item) => String(item.id) === iconId)
      || App.findCustomIconByLabel(label)
      || null;
  },

  normalizeCustomIconKey(iconKey, label = '') {
    if (!App.isCustomIcon(iconKey)) return iconKey;
    const icon = App.customIconForKey(iconKey, label);
    return icon ? `custom:${icon.id}` : iconKey;
  },

  customIconSrc(iconKey, label = '') {
    if (!App.isCustomIcon(iconKey)) return null;
    const iconId = String(iconKey).slice('custom:'.length);
    if (!iconId) return null;
    const icon = App.customIconForKey(iconKey, label);
    if (!icon) return null;
    const resolvedId = icon?.id || iconId;
    const version = [
      icon?.filename,
      icon?.uploaded_at,
      icon?.mime_type,
    ].filter(Boolean).join('|');
    const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
    return `/api/icons/${encodeURIComponent(resolvedId)}${suffix}`;
  },

  imageMetricsFromLoadedImage(img) {
    const width = Math.max(1, Number(img.naturalWidth || img.width) || 1);
    const height = Math.max(1, Number(img.naturalHeight || img.height) || 1);
    return {
      width,
      height,
      contentBounds: App.detectOpaqueImageBounds(img, width, height),
    };
  },

  detectOpaqueImageBounds(img, width, height) {
    try {
      const maxScan = 640;
      const scale = Math.min(1, maxScan / Math.max(width, height));
      const scanW = Math.max(1, Math.round(width * scale));
      const scanH = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = scanW;
      canvas.height = scanH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.clearRect(0, 0, scanW, scanH);
      ctx.drawImage(img, 0, 0, scanW, scanH);
      const pixels = ctx.getImageData(0, 0, scanW, scanH).data;
      let minX = scanW;
      let minY = scanH;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < scanH; y += 1) {
        for (let x = 0; x < scanW; x += 1) {
          if (pixels[(y * scanW + x) * 4 + 3] <= 8) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < minX || maxY < minY) return { x: 0, y: 0, w: 1, h: 1 };
      return {
        x: minX / scanW,
        y: minY / scanH,
        w: (maxX - minX + 1) / scanW,
        h: (maxY - minY + 1) / scanH,
      };
    } catch {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
  },

  ensureIconImageMetrics(iconKey) {
    if (!App.isCustomIcon(iconKey)) return null;
    const key = String(iconKey);
    const cached = App.state.iconImageMetrics.get(key);
    if (cached) return cached;
    if (App.state.iconImageMetricLoads.has(key)) return null;
    const src = App.customIconSrc(key);
    if (!src) return null;

    App.state.iconImageMetricLoads.add(key);
    const img = new Image();
    img.onload = () => {
      App.state.iconImageMetrics.set(key, App.imageMetricsFromLoadedImage(img));
      App.state.iconImageMetricLoads.delete(key);
      App.renderDiagram();
      App.renderCreator();
    };
    img.onerror = () => {
      App.state.iconImageMetricLoads.delete(key);
    };
    img.src = src;
    return null;
  },

  containedImageContentRect(frameW, frameH, metrics = null) {
    const width = Math.max(1, Number(frameW) || 1);
    const height = Math.max(1, Number(frameH) || 1);
    const imageW = Math.max(1, Number(metrics?.width) || width);
    const imageH = Math.max(1, Number(metrics?.height) || height);
    const imageAspect = imageW / imageH;
    const frameAspect = width / height;
    let fitW;
    let fitH;
    let fitX;
    let fitY;

    if (imageAspect > frameAspect) {
      fitW = width;
      fitH = width / imageAspect;
      fitX = 0;
      fitY = (height - fitH) / 2;
    } else {
      fitH = height;
      fitW = height * imageAspect;
      fitX = (width - fitW) / 2;
      fitY = 0;
    }

    const bounds = metrics?.contentBounds || { x: 0, y: 0, w: 1, h: 1 };
    const bx = App.clamp01(bounds.x);
    const by = App.clamp01(bounds.y);
    const bw = Math.max(0.02, Math.min(1 - bx, Number(bounds.w) || 1));
    const bh = Math.max(0.02, Math.min(1 - by, Number(bounds.h) || 1));
    return {
      x: fitX + bx * fitW,
      y: fitY + by * fitH,
      w: bw * fitW,
      h: bh * fitH,
    };
  },

  connectorContentRectForNode(node, width = null, height = null) {
    const w = width ?? App.clampNodeWidth(node?.w);
    const h = height ?? App.clampNodeHeight(node?.h);
    if (!App.isCustomIcon(node?.icon)) return { x: 0, y: 0, w, h };
    return App.containedImageContentRect(w, h, App.ensureIconImageMetrics(node.icon));
  },

  connectorFramePoint(node, connector) {
    const rect = App.connectorContentRectForNode(node);
    return {
      x: rect.x + App.clamp01(connector.x) * rect.w,
      y: rect.y + App.clamp01(connector.y) * rect.h,
    };
  },

  cloneConnectors(connectors) {
    const list = Array.isArray(connectors) && connectors.length ? connectors : DEFAULT_CONNECTORS;
    return list.map((conn, idx) => ({
      id: String(conn.id || `conn-${idx + 1}`),
      x: App.clamp01(conn.x),
      y: App.clamp01(conn.y),
      role: ['input', 'output', 'neutral'].includes(conn.role) ? conn.role : 'neutral',
      label: String(conn.label || ''),
      size: Math.max(3, Math.min(16, Number(conn.size) || 5)),
      color: App.normalizeColor(conn.color, '#d6a84f'),
    }));
  },

  connectorCountValue(value) {
    return Math.max(MIN_CONNECTOR_COUNT, Math.min(MAX_CONNECTOR_COUNT, Math.round(Number(value) || DEFAULT_CONNECTOR_COUNT)));
  },

  uniformConnectors(count) {
    return makeUniformConnectors(App.connectorCountValue(count));
  },

  nodeConnectorCount(node) {
    return App.nodeConnectors(node).length;
  },

  editableNodeConnectors(node) {
    if (!node || !App.isConnectableNode(node)) return [];
    node.connectors = App.cloneConnectors(node.connectors);
    return node.connectors;
  },

  replaceNodeConnectorsUniform(node, count) {
    if (!node || !App.isConnectableNode(node)) return;
    const oldConnectors = App.nodeConnectors(node);
    const nextConnectors = App.uniformConnectors(count);
    const map = new Map();

    for (const oldConn of oldConnectors) {
      let nearest = nextConnectors[0];
      let best = Infinity;
      for (const nextConn of nextConnectors) {
        const distance = Math.hypot(App.clamp01(oldConn.x) - nextConn.x, App.clamp01(oldConn.y) - nextConn.y);
        if (distance < best) {
          best = distance;
          nearest = nextConn;
        }
      }
      map.set(String(oldConn.id), String(nearest.id));
    }

    node.connectors = App.cloneConnectors(nextConnectors);
    for (const wire of App.state.diagram.wires || []) {
      for (const endKey of ['from', 'to']) {
        const endpoint = wire[endKey];
        if (String(endpoint?.nodeId) !== String(node.id)) continue;
        const nextId = map.get(String(endpoint.connectorId));
        if (nextId) endpoint.connectorId = nextId;
      }
    }
  },

  connectorSide(conn) {
    const x = App.clamp01(conn.x);
    const y = App.clamp01(conn.y);
    const EPS = 0.04;
    const onL = x <= EPS, onR = x >= 1 - EPS;
    const onT = y <= EPS, onB = y >= 1 - EPS;
    // Pure edges (not corners)
    if (onL && !onT && !onB) return 'left';
    if (onR && !onT && !onB) return 'right';
    if (onT && !onL && !onR) return 'top';
    if (onB && !onL && !onR) return 'bottom';
    // Corner: pick the side whose edge distance is smaller
    if (onL && onT) return x <= y ? 'left' : 'top';
    if (onR && onT) return (1 - x) <= y ? 'right' : 'top';
    if (onL && onB) return x <= (1 - y) ? 'left' : 'bottom';
    if (onR && onB) return (1 - x) <= (1 - y) ? 'right' : 'bottom';
    // Interior: snap to nearest edge
    const dL = x, dR = 1 - x, dT = y, dB = 1 - y;
    const m = Math.min(dL, dR, dT, dB);
    if (m === dL) return 'left';
    if (m === dR) return 'right';
    if (m === dT) return 'top';
    return 'bottom';
  },

  ensureSideConnectors(connectors) {
    const next = [...connectors];
    const sides = new Set(next.map((conn) => App.connectorSide(conn)).filter(Boolean));
    for (const conn of DEFAULT_CONNECTORS) {
      const side = App.connectorSide(conn);
      if (side && !sides.has(side)) {
        next.push({ ...conn });
        sides.add(side);
      }
    }
    return next;
  },

  normalizeColor(value, fallback) {
    const raw = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
  },

  normalizeTextStyle(style = {}) {
    const allowedFonts = new Set([
      'Inter, Segoe UI, Arial, sans-serif',
      'Arial, Helvetica, sans-serif',
      'Georgia, serif',
      'Consolas, monospace',
    ]);
    const fontFamily = allowedFonts.has(String(style.fontFamily || ''))
      ? String(style.fontFamily)
      : DEFAULT_TEXT_STYLE.fontFamily;
    return {
      fontFamily,
      fontSize: Math.max(8, Math.min(72, Math.round(Number(style.fontSize) || DEFAULT_TEXT_STYLE.fontSize))),
      bold: Boolean(style.bold),
      italic: Boolean(style.italic),
      color: App.normalizeColor(style.color, ''),
    };
  },

  normalizeLinks(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => l && typeof l === 'object' && l.url)
      .map((l) => ({ url: String(l.url || '').trim(), label: String(l.label || '').trim() }))
      .filter((l) => l.url);
  },

  cleanPartDescription(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const stopPatterns = [
      /\bLINKS\s*\(open in browser\)/i,
      /\bProduct page\s*:/i,
      /\bDatasheet PDF\s*:/i,
      /\bDatasheet \(alt\)\s*:/i,
      /\b3D\s*\/\s*CAD\s*:/i,
      /\bApprovals\s*:/i,
      /\bDistributors\s*:/i,
      /\bCross-reference\s*:/i,
      /\bSOURCE DRAWING PACKAGES\b/i,
      /https?:\/\//i,
    ];
    let end = text.length;
    for (const pattern of stopPatterns) {
      const match = pattern.exec(text);
      if (match && match.index < end) end = match.index;
    }
    return text.slice(0, end).replace(/\s+$/g, '').trim();
  },

  normalizeWireType(value) {
    const raw = String(value || '').trim().toLowerCase();
    return WIRE_TYPES.some((type) => type.value === raw) ? raw : 'power';
  },

  normalizeWireStyle(value) {
    const raw = String(value || '').trim().toLowerCase();
    return WIRE_STYLES.some((style) => style.value === raw) ? raw : 'solid';
  },

  wireTypeLabel(value) {
    const type = WIRE_TYPES.find((item) => item.value === App.normalizeWireType(value));
    return type ? type.label : 'Power';
  },

  wireStyleLabel(value) {
    const style = WIRE_STYLES.find((item) => item.value === App.normalizeWireStyle(value));
    return style ? style.label : 'Solid';
  },

  normalizeDiagram(raw) {
    if (raw && Number(raw.version || 0) >= 2) {
      const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
      const wires = Array.isArray(raw.wires) ? raw.wires : [];
      const groupsRaw = Array.isArray(raw.groups) ? raw.groups : [];
      const validNodeIds = new Set(nodes.map((n) => String(n.id)).filter(Boolean));
      const groups = groupsRaw
        .map((g) => ({
          id: String(g.id || App.uid('group')),
          nodeIds: Array.from(new Set((Array.isArray(g.nodeIds) ? g.nodeIds : []).map(String)))
            .filter((id) => validNodeIds.has(id)),
        }))
        .filter((g) => g.nodeIds.length >= 2);
      return {
        version: 2,
        groups,
        nodes: nodes.map((node, idx) => {
          const label = String(node.label || `Icon ${idx + 1}`);
          const icon = App.normalizeCustomIconKey(String(node.icon || 'generic'), label);
          const normalized = {
            id: String(node.id || App.uid('node')),
            label,
            icon,
            x: Number.isFinite(Number(node.x)) ? Number(node.x) : 80 + idx * 40,
            y: Number.isFinite(Number(node.y)) ? Number(node.y) : 120 + idx * 40,
            w: App.clampNodeWidth(node.w),
            h: App.clampNodeHeight(node.h),
            labelOffset: App.normalizeLabelOffset(node.labelOffset, node),
            connectors: [],
            description: String(node.description || ''),
            links: App.normalizeLinks(node.links),
          };
          normalized.connectors = App.isTextBoxNode(normalized) ? [] : App.cloneConnectors(node.connectors);
          normalized.textStyle = App.normalizeTextStyle(node.textStyle);
          return normalized;
        }),
        wires: wires
          .map((wire) => ({
          id: String(wire.id || App.uid('wire')),
          from: App.normalizeWireEndpoint(wire.from),
          to: App.normalizeWireEndpoint(wire.to),
          via: App.normalizeWireBends(wire.via),
          type: App.normalizeWireType(wire.type),
          lineStyle: App.normalizeWireStyle(wire.lineStyle),
          color: App.normalizeColor(wire.color, null),
          kind: String(wire.kind || '') === 'arrow' ? 'arrow' : '',
          label: String(wire.label || '').slice(0, 120),
        }))
          .filter((wire) => wire.from && wire.to),
        viewport: {
          x: Number(raw.viewport?.x) || 0,
          y: Number(raw.viewport?.y) || 0,
          zoom: Math.max(0.25, Math.min(3, Number(raw.viewport?.zoom) || 1)),
        },
      };
    }

    if (raw?.drawflow) return App.convertLegacyDiagram(raw);
    return AppEmptyDiagram();
  },

  convertLegacyDiagram(raw) {
    const modules = raw.drawflow || {};
    const firstModule = modules.Home || Object.values(modules)[0] || {};
    const data = firstModule.data || {};
    const nodes = [];
    const wires = [];

    for (const [nodeId, node] of Object.entries(data)) {
      const info = node.data || {};
      const inputs = Object.keys(node.inputs || {});
      const outputs = Object.keys(node.outputs || {});
      const connectors = [];

      inputs.forEach((key, idx) => {
        connectors.push({
          id: key,
          x: 0,
          y: (idx + 1) / (inputs.length + 1),
          role: 'input',
          label: `IN ${idx + 1}`,
        });
      });

      outputs.forEach((key, idx) => {
        connectors.push({
          id: key,
          x: 1,
          y: (idx + 1) / (outputs.length + 1),
          role: 'output',
          label: `OUT ${idx + 1}`,
        });
      });

      nodes.push({
        id: String(nodeId),
        label: String(info.label || node.name || `Icon ${nodeId}`),
        icon: String(info.icon || 'generic'),
        x: Number(node.pos_x) || 80,
        y: Number(node.pos_y) || 120,
        w: DEFAULT_NODE_W,
        h: DEFAULT_NODE_H,
        labelOffset: App.defaultLabelOffset({ h: DEFAULT_NODE_H }),
        connectors: connectors.length ? connectors : App.cloneConnectors(DEFAULT_CONNECTORS),
      });
    }

    for (const [nodeId, node] of Object.entries(data)) {
      for (const [outputKey, output] of Object.entries(node.outputs || {})) {
        for (const conn of output.connections || []) {
          const toNodeId = String(conn.node);
          const toConnectorId = String(conn.output || conn.input || 'input_1');
          wires.push({
            id: App.uid('wire'),
            from: { nodeId: String(nodeId), connectorId: outputKey },
            to: { nodeId: toNodeId, connectorId: toConnectorId },
            type: 'power',
            lineStyle: 'solid',
          });
        }
      }
    }

    return { version: 2, nodes, wires, groups: [], viewport: { x: 0, y: 0, zoom: 1 } };
  },

  exportDiagram() {
    return {
      version: 2,
      groups: (App.state.diagram.groups || []).map((g) => ({
        id: g.id,
        nodeIds: [...g.nodeIds],
      })),
      nodes: App.state.diagram.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        icon: node.icon,
        x: Math.round(node.x),
        y: Math.round(node.y),
        w: App.clampNodeWidth(node.w),
        h: App.clampNodeHeight(node.h),
        labelOffset: App.normalizeLabelOffset(node.labelOffset, node),
        connectors: App.nodeConnectors(node),
        textStyle: App.normalizeTextStyle(node.textStyle),
        description: String(node.description || ''),
        links: App.normalizeLinks(node.links),
      })),
      wires: App.state.diagram.wires.map((wire) => ({
        id: wire.id,
        from: { ...wire.from },
        to: { ...wire.to },
        via: App.normalizeWireBends(wire.via),
        type: App.normalizeWireType(wire.type),
        lineStyle: App.normalizeWireStyle(wire.lineStyle),
        color: wire.color ? App.normalizeColor(wire.color, null) : null,
        kind: String(wire.kind || '') === 'arrow' ? 'arrow' : '',
        label: String(wire.label || '').slice(0, 120),
      })),
      viewport: App.state.diagram.viewport || { x: 0, y: 0, zoom: 1 },
    };
  },

  async loadPlatforms() {
    const list = await App.api('/api/platforms');
    const previous = App.state.currentPlatformId;
    App.state.platforms = list;
    const sel = App.el('platform-select');
    sel.innerHTML = '';

    for (const platform of list) {
      const opt = document.createElement('option');
      opt.value = platform.id;
      opt.textContent = platform.name;
      sel.appendChild(opt);
    }

    if (list.length) {
      const current = list.find((platform) => platform.id === previous) || list[0];
      App.state.currentPlatformId = current.id;
      sel.value = current.id;
    } else {
      App.state.currentPlatformId = null;
    }
  },

  async loadPlatformTree() {
    const platformId = App.state.currentPlatformId;
    if (platformId == null) {
      App.state.platformNodes = [];
      App.state.subdiagrams = [];
      App.renderDiagramTree();
      return;
    }

    try {
      const [nodes, subdiagrams] = await Promise.all([
        App.api(`/api/platforms/${platformId}/nodes`),
        App.api(`/api/platforms/${platformId}/subdiagrams`),
      ]);
      App.state.platformNodes = nodes;
      App.state.subdiagrams = subdiagrams;
      App.renderDiagramTree();
    } catch (err) {
      App.toast(`Could not load project tree: ${err.message}`, 'error');
    }
  },

  async loadIcons() {
    App.state.customIcons = await App.api('/api/icons');
    for (const icon of App.state.customIcons || []) {
      App.ensureIconImageMetrics(`custom:${icon.id}`);
    }
    App.renderCreatorFolderSelect();
    App.renderPartsLibrary();
    App.renderCreatorPartsList();
    if (App.state.creator.selectedIconId) {
      const current = App.state.customIcons.find((icon) => Number(icon.id) === Number(App.state.creator.selectedIconId));
      if (current) App.populateCreatorFromIcon(current, { keepPending: true });
    }
    if (App.state.selectedNodeId) {
      App.renderDocTree(App.getNodeLabel(App.state.selectedNodeId), App.state.lastNodeFiles || []);
    }
    App.renderPartInfoPanel(null);
  },

  async loadFolders() {
    App.state.partFolders = await App.api('/api/icon-folders');
    App.renderCreatorFolderSelect();
    App.renderPartsLibrary();
  },

  async onPlatformChange(ev) {
    App.state.currentPlatformId = Number(ev.target.value);
    App.state.currentDiagram = { type: 'root', subdiagramId: null, title: 'Main Diagram' };
    App.state.selectedNodeId = null;
    App.state.selectedNodeIds.clear();
    App.state.selectedWireId = null;
    App.state.editingTextNodeId = null;
    App.state.activeToolbarAction = null;
    App.state.docCounts = {};
    App.state.expandedNodeIds.clear();
    App.state.expandedDiagramCache.clear();
    App.state.expandedDiagramLoading.clear();
    await App.loadPlatformTree();
    await App.loadDiagram();
    App.renderDocTree(null, []);
    App.renderPartInfoPanel(null);
  },

  async loadDiagram() {
    const platformId = App.state.currentPlatformId;
    if (platformId == null) return;

    try {
      const endpoint = App.state.currentDiagram.type === 'sub'
        ? `/api/subdiagrams/${App.state.currentDiagram.subdiagramId}`
        : `/api/platforms/${platformId}/diagram`;
      const { drawflow_json } = await App.api(endpoint);
      App.state.diagram = App.normalizeDiagram(drawflow_json);
      App.state.selectedNodeId = null;
      App.state.selectedNodeIds.clear();
      App.state.selectedWireId = null;
      App.state.editingTextNodeId = null;
      App.state.activeToolbarAction = null;
      App.state.wireDraft = null;
      document.body.classList.remove('is-wiring');
      App.state.expandedNodeIds.clear();
      App.renderDiagram();
      App.renderSelectionTools();
      App.renderDiagramTree();
      App.renderPartInfoPanel(null);
      requestAnimationFrame(() => App.ensureDiagramContentVisible());
    } catch (err) {
      App.toast(`Failed to load diagram: ${err.message}`, 'error');
    }
  },

  currentDiagramRef() {
    return App.state.currentDiagram.type === 'sub'
      ? `sub:${App.state.currentDiagram.subdiagramId}`
      : 'root';
  },

  async openRootDiagram(platformId = App.state.currentPlatformId) {
    if (platformId == null) return;
    App.state.currentPlatformId = Number(platformId);
    App.el('platform-select').value = String(platformId);
    App.state.currentDiagram = { type: 'root', subdiagramId: null, title: 'Main Diagram' };
    await App.loadPlatformTree();
    await App.loadDiagram();
    App.renderDocTree(null, []);
  },

  async openSubdiagram(subdiagramId) {
    const sub = App.state.subdiagrams.find((item) => Number(item.id) === Number(subdiagramId));
    if (!sub) return;
    App.state.currentPlatformId = Number(sub.platform_id);
    App.el('platform-select').value = String(sub.platform_id);
    App.state.currentDiagram = { type: 'sub', subdiagramId: Number(sub.id), title: sub.name };
    await App.loadDiagram();
    App.renderDocTree(null, []);
  },

  nodesForDiagram(diagramRef) {
    const liveRef = App.currentDiagramRef();
    if (diagramRef === liveRef) {
      return App.state.diagram.nodes.map((node) => ({ ...node, diagram_ref: diagramRef }));
    }
    return (App.state.platformNodes || []).filter((node) => (node.diagram_ref || 'root') === diagramRef);
  },

  subdiagramsForNode(nodeId) {
    return (App.state.subdiagrams || []).filter((sub) => String(sub.parent_node_id) === String(nodeId));
  },

  primarySubdiagramForNode(nodeId) {
    return App.subdiagramsForNode(nodeId)[0] || null;
  },

  async fetchSubdiagramPreview(subdiagramId) {
    const key = String(subdiagramId);
    if (App.state.expandedDiagramCache.has(key)) {
      return App.state.expandedDiagramCache.get(key);
    }

    const { drawflow_json } = await App.api(`/api/subdiagrams/${encodeURIComponent(subdiagramId)}`);
    const diagram = App.normalizeDiagram(drawflow_json);
    App.state.expandedDiagramCache.set(key, diagram);
    return diagram;
  },

  async toggleNodeExpansion(nodeId) {
    const node = App.findNode(nodeId);
    if (!node) return;

    const id = String(node.id);
    const sub = App.primarySubdiagramForNode(id);
    if (!sub) {
      App.selectNode(id);
      App.toast('Add a sub diagram to this part first.', 'warn');
      return;
    }

    if (App.state.expandedNodeIds.has(id)) {
      App.state.expandedNodeIds.delete(id);
      App.selectNode(id);
      return;
    }

    const key = String(sub.id);
    const needsLoad = !App.state.expandedDiagramCache.has(key) && !App.state.expandedDiagramLoading.has(key);
    App.state.expandedNodeIds.add(id);
    if (needsLoad) App.state.expandedDiagramLoading.add(key);
    App.selectNode(id);
    if (!needsLoad) return;

    try {
      await App.fetchSubdiagramPreview(sub.id);
    } catch (err) {
      App.state.expandedNodeIds.delete(id);
      App.toast(`Could not load internals: ${err.message}`, 'error');
    } finally {
      App.state.expandedDiagramLoading.delete(key);
      App.renderDiagram();
    }
  },

  renderDiagramTree() {
    const tree = App.el('diagram-tree');
    if (!tree) return;
    tree.innerHTML = '';

    if (!App.state.platforms.length) {
      tree.innerHTML = '<div class="tree-placeholder">No platforms yet.</div>';
      return;
    }

    for (const platform of App.state.platforms) {
      const group = document.createElement('details');
      group.className = 'nav-platform';
      group.open = Number(platform.id) === Number(App.state.currentPlatformId);

      const header = document.createElement('summary');
      header.className = 'nav-platform-header';
      header.innerHTML = `<span>${App.esc(platform.name)}</span>`;
      group.appendChild(header);

      const body = document.createElement('div');
      body.className = 'nav-platform-body';

      if (Number(platform.id) === Number(App.state.currentPlatformId)) {
        body.appendChild(App.buildDiagramTreeDiagram({
          diagramRef: 'root',
          label: 'Main diagram',
          depth: 0,
          open: App.diagramContainsActive('root'),
          onOpen: () => App.openRootDiagram(platform.id),
        }));
      } else {
        const root = document.createElement('button');
        root.type = 'button';
        root.className = 'nav-row nav-diagram-row';
        root.innerHTML = '<span class="nav-icon">D</span><span class="nav-label">Main diagram</span>';
        root.addEventListener('click', () => App.openRootDiagram(platform.id));
        body.appendChild(root);
      }

      group.appendChild(body);
      tree.appendChild(group);
    }
  },

  diagramContainsActive(diagramRef) {
    if (App.currentDiagramRef() === diagramRef) return true;
    const nodes = App.nodesForDiagram(diagramRef);
    for (const node of nodes) {
      for (const sub of App.subdiagramsForNode(node.id)) {
        if (App.diagramContainsActive(`sub:${sub.id}`)) return true;
      }
    }
    return false;
  },

  buildDiagramTreeDiagram({ diagramRef, label, depth, open, onOpen }) {
    const group = document.createElement('details');
    group.className = 'nav-diagram-group';
    group.open = Boolean(open);
    group.style.setProperty('--depth', String(depth));

    const summary = document.createElement('summary');
    summary.className = 'nav-diagram-header';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-row nav-diagram-row';
    button.classList.toggle('is-active', App.currentDiagramRef() === diagramRef);
    button.innerHTML = `<span class="nav-icon">D</span><span class="nav-label">${App.esc(label)}</span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    });

    summary.appendChild(button);
    group.appendChild(summary);
    group.appendChild(App.buildDiagramTreeBranch(diagramRef, depth + 1));
    return group;
  },

  buildDiagramTreeBranch(diagramRef, depth) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-branch';
    wrap.style.setProperty('--depth', String(depth));
    const nodes = App.nodesForDiagram(diagramRef);
    const allSubs = nodes.flatMap(node => App.subdiagramsForNode(node.id));

    // Drawings folder
    const drawingsOpen = allSubs.some(sub => App.diagramContainsActive(`sub:${sub.id}`));
    const drawingsChildren = allSubs.map(sub => App.buildDiagramTreeDiagram({
      diagramRef: `sub:${sub.id}`,
      label: sub.name,
      depth,
      open: App.diagramContainsActive(`sub:${sub.id}`),
      onOpen: () => App.openSubdiagram(sub.id),
    }));
    wrap.appendChild(App.buildTreeFolder('Drawings', drawingsOpen, 'No drawings', drawingsChildren));

    // Project file explorer
    const explorerEl = document.createElement('div');
    explorerEl.className = 'nav-explorer-wrap';
    App.renderProjectExplorer(explorerEl, diagramRef);
    wrap.appendChild(explorerEl);

    return wrap;
  },

  // ── Context menu ──────────────────────────────────────────────────────────

  _ctxMenu: null,

  showContextMenu(items, x, y) {
    App.hideContextMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    for (const item of items) {
      if (item === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menu.appendChild(sep);
        continue;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ctx-item' + (item.danger ? ' ctx-item-danger' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', () => { App.hideContextMenu(); item.action(); });
      menu.appendChild(btn);
    }
    document.body.appendChild(menu);
    App._ctxMenu = menu;

    // Nudge into viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${y - rect.height}px`;
  },

  hideContextMenu() {
    if (App._ctxMenu) { App._ctxMenu.remove(); App._ctxMenu = null; }
  },

  // ── Project file explorer ──────────────────────────────────────────────────

  fileEmoji(mime) {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime === 'application/pdf') return '📕';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('excel') || mime.includes('sheet')) return '📊';
    if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
    return '📄';
  },

  async apiFd(url, formData) {
    const res = await fetch(url, { method: 'POST', body: formData });
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && (data.detail || data.error)) || `HTTP ${res.status}`);
    return data;
  },

  async renderProjectExplorer(container, diagramRef) {
    const pid = App.state.currentPlatformId;
    if (!pid) return;

    container.innerHTML = '';

    // Header row with folder title + add-folder button
    const hdr = document.createElement('div');
    hdr.className = 'nav-explorer-header';
    const title = document.createElement('span');
    title.className = 'nav-explorer-title';
    title.textContent = 'Documents';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'nav-xbtn nav-xbtn-add';
    addBtn.title = 'New folder';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      if (!App.state.editMode) { App.toast('Enable edit mode first', 'info'); return; }
      App.createProjectFolder(pid, diagramRef, null, container);
    });

    hdr.appendChild(title);
    hdr.appendChild(addBtn);
    container.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'nav-explorer-body';
    body.dataset.explorerRef = diagramRef;
    body.dataset.explorerPid = String(pid);
    container.appendChild(body);

    try {
      const tree = await App.api(`/api/platforms/${pid}/project-tree?diagram_ref=${encodeURIComponent(diagramRef)}`);
      App.renderExplorerContents(body, tree.folders, tree.files, pid, diagramRef, null, container);
    } catch (err) {
      body.innerHTML = `<div class="nav-empty">Error loading: ${App.esc(err.message)}<br><small>Try restarting the server.</small></div>`;
    }
  },

  renderExplorerContents(body, folders, files, pid, diagramRef, folderId, container) {
    body.innerHTML = '';
    App.attachDropZone(body, pid, diagramRef, folderId, container);

    if (!folders.length && !files.length) {
      const hint = document.createElement('div');
      hint.className = 'nav-drop-hint';
      hint.textContent = 'Drop files here';
      body.appendChild(hint);
    }

    for (const folder of folders) {
      body.appendChild(App.buildExplorerFolder(folder, pid, diagramRef, container));
    }
    for (const file of files) {
      body.appendChild(App.buildExplorerFile(file, pid, diagramRef, container));
    }
  },

  buildExplorerFolder(folder, pid, diagramRef, container) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-xfolder';
    wrap.dataset.folderId = folder.id;

    // Use a plain div — NOT <summary>/<details> — so contextmenu works in all browsers
    // Store all needed data as dataset — document-level contextmenu handler reads these
    const header = document.createElement('div');
    header.className = 'nav-xfolder-header';
    header.dataset.xFolderId   = folder.id;
    header.dataset.xFolderName = folder.name;
    header.dataset.xPid        = pid;
    header.dataset.xRef        = diagramRef;

    const arrow = document.createElement('span');
    arrow.className = 'nav-xfolder-arrow';
    arrow.textContent = '▶';

    const icon = document.createElement('span');
    icon.className = 'nav-xfolder-icon';
    icon.textContent = '📁';

    const name = document.createElement('span');
    name.className = 'nav-xname';
    name.textContent = folder.name;

    const actions = document.createElement('span');
    actions.className = 'nav-xactions';

    header.appendChild(arrow);
    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(actions);
    wrap.appendChild(header);

    const body = document.createElement('div');
    body.className = 'nav-xfolder-body';
    wrap.appendChild(body);

    header.addEventListener('click', (e) => {
      if (e.target.closest('.nav-xactions')) return;
      wrap.classList.toggle('is-open');
    });

    App.renderExplorerContents(body, folder.children || [], folder.files || [], pid, diagramRef, folder.id, container);

    if (App.state.editMode) {
      const addSubBtn = document.createElement('button');
      addSubBtn.type = 'button'; addSubBtn.className = 'nav-xbtn'; addSubBtn.title = 'New subfolder'; addSubBtn.textContent = '+';
      addSubBtn.addEventListener('click', (e) => { e.stopPropagation(); App.createProjectFolder(pid, diagramRef, folder.id, container); });

      const renBtn = document.createElement('button');
      renBtn.type = 'button'; renBtn.className = 'nav-xbtn'; renBtn.title = 'Rename'; renBtn.textContent = '✏️';
      renBtn.addEventListener('click', (e) => { e.stopPropagation(); App.renameProjectFolder(folder.id, folder.name, container, diagramRef, pid); });

      const delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'nav-xbtn nav-xbtn-del'; delBtn.title = 'Delete'; delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
        try {
          await App.api(`/api/project-folders/${folder.id}`, { method: 'DELETE' });
          App.renderProjectExplorer(container, diagramRef);
        } catch (err) { App.toast(`Delete failed: ${err.message}`, 'error'); }
      });

      actions.appendChild(addSubBtn);
      actions.appendChild(renBtn);
      actions.appendChild(delBtn);
    }

    return wrap;
  },

  buildExplorerFile(file, pid, diagramRef, container) {
    const row = document.createElement('div');
    row.className = 'nav-xfile';
    // Store all needed data as dataset — document-level contextmenu handler reads these
    row.dataset.xFileId   = file.id;
    row.dataset.xFilename = file.filename;
    row.dataset.xMime     = file.mime_type;
    row.dataset.xPid      = pid;
    row.dataset.xRef      = diagramRef;

    const icon = document.createElement('span');
    icon.className = 'nav-xfile-icon';
    icon.textContent = App.fileEmoji(file.mime_type);

    const name = document.createElement('span');
    name.className = 'nav-xname';
    name.title = file.filename;
    name.textContent = file.filename;
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => App.openProjectFile(file));

    const actions = document.createElement('span');
    actions.className = 'nav-xactions';

    if (App.state.editMode) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'nav-xbtn nav-xbtn-del';
      delBtn.title = 'Delete file';
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${file.filename}"?`)) return;
        try {
          await App.api(`/api/project-files/${file.id}`, { method: 'DELETE' });
          App.renderProjectExplorer(container, diagramRef);
        } catch (err) { App.toast(`Delete failed: ${err.message}`, 'error'); }
      });
      actions.appendChild(delBtn);
    }

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(actions);
    return row;
  },

  attachDropZone(el, pid, diagramRef, folderId, container) {
    if (!App.state.editMode) return;

    el.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('is-drop-over');
      }
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('is-drop-over');
    });
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('is-drop-over');
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      let ok = 0;
      for (const f of files) {
        try {
          const fd = new FormData();
          fd.append('file', f);
          if (folderId != null) fd.append('folder_id', String(folderId));
          fd.append('diagram_ref', diagramRef);
          await App.apiFd(`/api/platforms/${pid}/project-files`, fd);
          ok++;
        } catch (err) {
          App.toast(`Upload failed (${f.name}): ${err.message}`, 'error');
        }
      }
      if (ok > 0) {
        App.toast(`Uploaded ${ok} file${ok > 1 ? 's' : ''}`, 'success');
        App.renderProjectExplorer(container, diagramRef);
      }
    });
  },

  async createProjectFolder(pid, diagramRef, parentId, container) {
    const name = prompt('Folder name');
    if (!name || !name.trim()) return;
    try {
      await App.api(`/api/platforms/${pid}/project-folders`, {
        method: 'POST',
        body: { name: name.trim(), parent_id: parentId, diagram_ref: diagramRef },
      });
      App.renderProjectExplorer(container, diagramRef);
    } catch (err) {
      App.toast(`Create folder failed: ${err.message}`, 'error');
    }
  },

  async renameProjectFolder(folderId, currentName, container, diagramRef, pid) {
    const name = prompt('New folder name', currentName);
    if (!name || !name.trim() || name.trim() === currentName) return;
    try {
      await App.api(`/api/project-folders/${folderId}`, {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      App.renderProjectExplorer(container, diagramRef);
    } catch (err) {
      App.toast(`Rename failed: ${err.message}`, 'error');
    }
  },

  openProjectFile(file) {
    const url = `/api/project-files/${file.id}`;
    const panel = App.el('part-info-panel');
    panel.classList.remove('hidden');

    if (file.mime_type === 'application/pdf' || file.mime_type.startsWith('image/')) {
      panel.innerHTML = `
        <div class="part-info-header">
          <span class="part-info-title">${App.esc(file.filename)}</span>
          <button type="button" class="btn btn-ghost btn-sm" id="part-info-close">✕</button>
        </div>
        <div class="part-info-body">
          ${file.mime_type === 'application/pdf'
            ? `<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`
            : `<img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${App.esc(file.filename)}" />`}
        </div>`;
    } else {
      panel.innerHTML = `
        <div class="part-info-header">
          <span class="part-info-title">${App.esc(file.filename)}</span>
          <button type="button" class="btn btn-ghost btn-sm" id="part-info-close">✕</button>
        </div>
        <div class="part-info-body" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;">
          <div style="font-size:48px;">${App.fileEmoji(file.mime_type)}</div>
          <a href="${url}" download="${App.esc(file.filename)}" class="btn btn-accent">Download</a>
        </div>`;
    }

    App.el('part-info-close').addEventListener('click', () => panel.classList.add('hidden'));
  },

  buildTreeFolder(label, open, emptyText, children, extraEl = null) {
    const group = document.createElement('details');
    group.className = 'nav-folder';
    group.open = Boolean(open);

    const summary = document.createElement('summary');
    summary.className = 'nav-folder-header';
    const row = document.createElement('div');
    row.className = 'nav-row nav-folder-row';
    row.innerHTML = `<span class="nav-folder-icon"></span><span class="nav-label">${App.esc(label)}</span>`;
    summary.appendChild(row);
    group.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'nav-folder-body';

    if (extraEl) {
      body.appendChild(extraEl);
    } else if (!children.length) {
      const empty = document.createElement('div');
      empty.className = 'nav-empty';
      empty.textContent = emptyText || 'Empty';
      body.appendChild(empty);
    } else {
      for (const child of children) body.appendChild(child);
    }

    group.appendChild(body);
    return group;
  },

  printDiagram() {
    const nodes = App.state.diagram.nodes || [];

    // Tabloid landscape printable area (17"×11" − 0.8" total margin) at 96 dpi
    const PRINT_W = (17 - 0.8) * 96;
    const PRINT_H = (11 - 0.8) * 96;
    const PAD = 60;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const pos = App.visualNodePosition(node);
      const w = App.clampNodeWidth(node.w);
      const h = App.clampNodeHeight(node.h);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }

    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

    const contentW = maxX - minX + PAD * 2;
    const contentH = maxY - minY + PAD * 2;
    const zoom = Math.min(PRINT_W / contentW, PRINT_H / contentH, 1.5);
    const vpX = (-minX + PAD) * zoom + (PRINT_W - contentW * zoom) / 2;
    const vpY = (-minY + PAD) * zoom + (PRINT_H - contentH * zoom) / 2;

    App._printSavedVp = { ...(App.state.diagram.viewport || {}) };
    App.state.diagram.viewport = { x: vpX, y: vpY, zoom };
    App.renderDiagram();
    document.body.classList.add('is-printing');
    window.print();
  },

  async createPlatform() {
    if (!App.state.editMode) return;
    const name = prompt('Platform name');
    if (!name || !name.trim()) return;

    try {
      const platform = await App.api('/api/platforms', {
        method: 'POST',
        body: { name: name.trim(), description: null },
      });
      await App.loadPlatforms();
      await App.openRootDiagram(platform.id);
      App.toast(`Created platform: ${platform.name}`, 'success');
    } catch (err) {
      App.toast(`Platform create failed: ${err.message}`, 'error');
    }
  },

  async createSubdiagram(node, event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!App.state.editMode || !node) return;
    const name = prompt(`Sub diagram name for ${node.label}`);
    if (!name || !name.trim()) return;

    try {
      await App.saveDiagram({ quiet: true });
      await App.loadPlatformTree();
      const sub = await App.api(`/api/platforms/${App.state.currentPlatformId}/nodes/${encodeURIComponent(node.id)}/subdiagrams`, {
        method: 'POST',
        body: { name: name.trim() },
      });
      await App.loadPlatformTree();
      await App.openSubdiagram(sub.id);
      App.toast(`Created sub diagram: ${sub.name}`, 'success');
    } catch (err) {
      App.toast(`Sub diagram create failed: ${err.message}`, 'error');
    }
  },

  renderDiagram() {
    const layer = App.el('node-layer');
    layer.innerHTML = '';
    App.state.visualOffsets = App.computeVisualRelocations();

    for (const node of App.state.diagram.nodes) {
      layer.appendChild(App.buildNodeElement(node));
    }

    App.renderWires();
    App.renderToolbarState();
  },

  computeVisualRelocations() {
    const nodes = App.state.diagram.nodes || [];
    const offsets = new Map(nodes.map((node) => [String(node.id), { x: 0, y: 0 }]));
    const expandedIds = new Set(
      [...App.state.expandedNodeIds]
        .map(String)
        .filter((nodeId) => nodes.some((node) => String(node.id) === nodeId) && App.primarySubdiagramForNode(nodeId)),
    );
    if (!expandedIds.size) return offsets;

    for (let pass = 0; pass < RELOCATION_PASSES; pass += 1) {
      const obstacles = [...expandedIds]
        .map((nodeId) => nodes.find((node) => String(node.id) === nodeId))
        .filter(Boolean)
        .map((node) => App.expandedNodeBounds(node, offsets.get(String(node.id)), EXPANDED_PART_CLEARANCE));

      for (const node of nodes) {
        const nodeId = String(node.id);
        if (expandedIds.has(nodeId)) continue;

        const offset = offsets.get(nodeId) || { x: 0, y: 0 };
        let bounds = App.nodeBounds(node, offset, EXPANDED_PART_CLEARANCE / 2);
        for (const obstacle of obstacles) {
          const push = App.collisionPush(bounds, obstacle);
          if (!push.x && !push.y) continue;
          offset.x += push.x;
          offset.y += push.y;
          bounds = App.shiftBounds(bounds, push);
        }
        offsets.set(nodeId, offset);
      }
    }

    return offsets;
  },

  visualNodePosition(node) {
    const offset = App.state.visualOffsets.get(String(node.id)) || { x: 0, y: 0 };
    return {
      x: (Number(node.x) || 0) + offset.x,
      y: (Number(node.y) || 0) + offset.y,
    };
  },

  nodeBounds(node, offset = { x: 0, y: 0 }, margin = 0) {
    const x = (Number(node.x) || 0) + (offset.x || 0);
    const y = (Number(node.y) || 0) + (offset.y || 0);
    const w = App.clampNodeWidth(node.w);
    const h = App.clampNodeHeight(node.h);
    return {
      left: x - margin,
      top: y - margin,
      right: x + w + margin,
      bottom: y + h + margin,
    };
  },

  nodeCenter(node, x = Number(node.x) || 0, y = Number(node.y) || 0) {
    return {
      x: x + App.clampNodeWidth(node.w) / 2,
      y: y + App.clampNodeHeight(node.h) / 2,
    };
  },

  constrainNodeForWireLabels(node, candidateX, candidateY) {
    const wires = (App.state.diagram.wires || []).filter((w) => (
      (w.from?.nodeId === node.id && w.from?.connectorId) ||
      (w.to?.nodeId === node.id && w.to?.connectorId)
    ));
    if (!wires.length) return { x: candidateX, y: candidateY };

    const zoom = App.viewport().zoom || 1;
    const channelHalf = WIRE_STRAIGHT_SNAP;
    const currentX = Number(node.x) || 0;
    const currentY = Number(node.y) || 0;
    let nx = candidateX;
    let ny = candidateY;

    for (const wire of wires) {
      const myKey = wire.from?.nodeId === node.id ? 'from' : 'to';
      const otherKey = myKey === 'from' ? 'to' : 'from';
      const myConnNow = App.connectorBoardPoint(node.id, wire[myKey].connectorId);
      const otherConn = App.connectorBoardPoint(wire[otherKey].nodeId, wire[otherKey].connectorId);
      if (!myConnNow || !otherConn) continue;
      const myDir = App.endpointExitDir(wire[myKey]);
      const otherDir = App.endpointExitDir(wire[otherKey]);
      if (!myDir || !otherDir) continue;

      const stubs = App.wireStubLengths(wire);
      const myStub = stubs[myKey] / zoom;
      const otherStub = stubs[otherKey] / zoom;
      const offsetX = myConnNow.x - currentX;
      const offsetY = myConnNow.y - currentY;

      const apply = (mode) => {
        const dir = mode === 'my' ? myDir : otherDir;
        const stub = mode === 'my' ? myStub : otherStub;
        const myConnX = nx + offsetX;
        const myConnY = ny + offsetY;
        const fromX = mode === 'my' ? myConnX : otherConn.x;
        const fromY = mode === 'my' ? myConnY : otherConn.y;
        const toX = mode === 'my' ? otherConn.x : myConnX;
        const toY = mode === 'my' ? otherConn.y : myConnY;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const proj = dx * dir.dx + dy * dir.dy;
        const perp = Math.abs(dx * -dir.dy + dy * dir.dx);
        if (perp >= channelHalf) return;
        if (proj <= 0 || proj >= stub) return;

        if (mode === 'my') {
          if (dir.dx !== 0) nx = otherConn.x - dir.dx * stub - offsetX;
          if (dir.dy !== 0) ny = otherConn.y - dir.dy * stub - offsetY;
        } else {
          if (dir.dx !== 0) nx = otherConn.x + dir.dx * stub - offsetX;
          if (dir.dy !== 0) ny = otherConn.y + dir.dy * stub - offsetY;
        }
      };

      apply('my');
      apply('other');
    }

    return { x: Math.round(nx), y: Math.round(ny) };
  },

  snapNodeToCenterlines(node, x, y) {
    const threshold = CENTERLINE_SNAP_PX / App.viewport().zoom;
    const w = App.clampNodeWidth(node.w);
    const h = App.clampNodeHeight(node.h);
    const center = { x: x + w / 2, y: y + h / 2 };
    let snapX = null;
    let snapY = null;

    for (const other of App.state.diagram.nodes || []) {
      if (String(other.id) === String(node.id)) continue;
      const otherX = Number(other.x) || 0;
      const otherY = Number(other.y) || 0;
      const otherW = App.clampNodeWidth(other.w);
      const otherH = App.clampNodeHeight(other.h);
      const otherCenter = App.nodeCenter(other, otherX, otherY);
      const dx = Math.abs(center.x - otherCenter.x);
      const dy = Math.abs(center.y - otherCenter.y);

      if (dx <= threshold && (!snapX || dx < snapX.distance)) {
        snapX = { distance: dx, value: otherCenter.x, other: { x: otherX, y: otherY, w: otherW, h: otherH } };
      }
      if (dy <= threshold && (!snapY || dy < snapY.distance)) {
        snapY = { distance: dy, value: otherCenter.y, other: { x: otherX, y: otherY, w: otherW, h: otherH } };
      }
    }

    const next = { x, y };
    const guides = [];

    if (snapX) {
      next.x = Math.round(snapX.value - w / 2);
      const top = Math.min(next.y, snapX.other.y) - 18;
      const bottom = Math.max(next.y + h, snapX.other.y + snapX.other.h) + 18;
      guides.push({ axis: 'x', value: snapX.value, from: top, to: bottom });
    }

    if (snapY) {
      next.y = Math.round(snapY.value - h / 2);
      const left = Math.min(next.x, snapY.other.x) - 18;
      const right = Math.max(next.x + w, snapY.other.x + snapY.other.w) + 18;
      guides.push({ axis: 'y', value: snapY.value, from: left, to: right });
    }

    return { ...next, guides };
  },

  expandedNodeBounds(node, offset = { x: 0, y: 0 }, margin = 0) {
    const x = (Number(node.x) || 0) + (offset.x || 0);
    const y = (Number(node.y) || 0) + (offset.y || 0);
    const w = App.clampNodeWidth(node.w);
    const h = App.clampNodeHeight(node.h);
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    return {
      left: centerX - EXPANDED_PART_PREVIEW.width / 2 - margin,
      top: centerY - EXPANDED_PART_PREVIEW.height / 2 - margin - 30,
      right: centerX + EXPANDED_PART_PREVIEW.width / 2 + margin,
      bottom: centerY + EXPANDED_PART_PREVIEW.height / 2 + margin,
    };
  },

  collisionPush(bounds, obstacle) {
    if (
      bounds.right <= obstacle.left ||
      bounds.left >= obstacle.right ||
      bounds.bottom <= obstacle.top ||
      bounds.top >= obstacle.bottom
    ) {
      return { x: 0, y: 0 };
    }

    const left = obstacle.left - bounds.right;
    const right = obstacle.right - bounds.left;
    const up = obstacle.top - bounds.bottom;
    const down = obstacle.bottom - bounds.top;
    const options = [
      { x: left, y: 0, distance: Math.abs(left) },
      { x: right, y: 0, distance: Math.abs(right) },
      { x: 0, y: up, distance: Math.abs(up) },
      { x: 0, y: down, distance: Math.abs(down) },
    ];
    const push = options.sort((a, b) => a.distance - b.distance)[0];
    return { x: Math.round(push.x), y: Math.round(push.y) };
  },

  shiftBounds(bounds, delta) {
    return {
      left: bounds.left + delta.x,
      top: bounds.top + delta.y,
      right: bounds.right + delta.x,
      bottom: bounds.bottom + delta.y,
    };
  },

  visualBoardPoint(point) {
    let next = { x: Number(point.x) || 0, y: Number(point.y) || 0 };
    if (!App.state.expandedNodeIds.size) return next;

    for (const node of App.state.diagram.nodes || []) {
      if (!App.state.expandedNodeIds.has(String(node.id)) || !App.primarySubdiagramForNode(node.id)) continue;
      const push = App.pointCollisionPush(
        next,
        App.expandedNodeBounds(node, App.state.visualOffsets.get(String(node.id)), EXPANDED_PART_CLEARANCE / 2),
      );
      next = { x: next.x + push.x, y: next.y + push.y };
    }
    return next;
  },

  pointCollisionPush(point, obstacle) {
    if (
      point.x <= obstacle.left ||
      point.x >= obstacle.right ||
      point.y <= obstacle.top ||
      point.y >= obstacle.bottom
    ) {
      return { x: 0, y: 0 };
    }

    const options = [
      { x: obstacle.left - point.x, y: 0 },
      { x: obstacle.right - point.x, y: 0 },
      { x: 0, y: obstacle.top - point.y },
      { x: 0, y: obstacle.bottom - point.y },
    ].map((push) => ({ ...push, distance: Math.abs(push.x) + Math.abs(push.y) }));
    const push = options.sort((a, b) => a.distance - b.distance)[0];
    return { x: Math.round(push.x), y: Math.round(push.y) };
  },

  buildNodeElement(node) {
    const el = document.createElement('div');
    const stagePoint = App.boardToStage(App.visualNodePosition(node));
    const vp = App.viewport();
    const nodeW = App.clampNodeWidth(node.w);
    const nodeH = App.clampNodeHeight(node.h);
    const isSelected = App.state.selectedNodeId === String(node.id) || App.state.selectedNodeIds.has(String(node.id));
    el.className = 'diagram-node';
    el.dataset.nodeId = node.id;
    el.style.left = `${stagePoint.x}px`;
    el.style.top = `${stagePoint.y}px`;
    el.style.width = `${nodeW}px`;
    el.style.height = `${nodeH}px`;
    el.style.transform = `scale(${vp.zoom})`;
    el.style.transformOrigin = 'top left';
    el.classList.toggle('is-selected', isSelected);
    el.classList.toggle('is-group-selected', App.state.selectedNodeIds.has(String(node.id)) && App.state.selectedNodeIds.size > 1);
    const expandedSub = App.state.expandedNodeIds.has(String(node.id))
      ? App.primarySubdiagramForNode(node.id)
      : null;
    const inlineLabel = App.isBasicShapeIcon(node.icon);
    el.classList.toggle('is-expanded', Boolean(expandedSub));

    const iconFrame = document.createElement('div');
    iconFrame.className = 'node-icon-frame';
    iconFrame.style.width = `${nodeW}px`;
    iconFrame.style.height = `${nodeH}px`;
    App.renderIcon(iconFrame, node.icon, node.label, node);
    App.configureTextBoxElement(iconFrame, node);
    if (App.isTextBoxNode(node)) {
      iconFrame.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        App.enterTextBoxEdit(node.id);
      });
    }

    const label = document.createElement('div');
    label.className = 'node-label';
    label.textContent = node.label;
    App.positionNodeLabel(label, node);
    label.addEventListener('click', (event) => {
      event.stopPropagation();
      App.selectNode(node.id);
    });
    label.addEventListener('pointerdown', (event) => {
      if (!App.state.editMode || event.button !== 0) return;
      event.stopPropagation();
      App.startLabelDrag(event, node.id);
    });

    const badge = document.createElement('div');
    const docCount = Number(App.state.docCounts[node.id] || 0);
    badge.className = 'node-doc-badge';
    badge.dataset.count = String(docCount);
    badge.textContent = String(docCount);

    if (expandedSub) {
      el.appendChild(App.buildExpandedPartPanel(node, expandedSub));
    } else {
      const partSize = Math.max(nodeW, nodeH);
      for (const connector of App.nodeConnectors(node)) {
        const pt = App.connectorFramePoint(node, connector);
        const wrap = document.createElement('div');
        wrap.className = 'connector-wrap';
        wrap.style.left = `${pt.x}px`;
        wrap.style.top = `${pt.y}px`;
        wrap.appendChild(App.buildConnectorElement(node, connector, partSize));
        wrap.appendChild(App.buildConnectorLabelElement(node, connector));
        iconFrame.appendChild(wrap);
      }
      el.append(iconFrame);
      if (!inlineLabel) el.append(label);
      el.append(badge);
      if (App.state.editMode) {
        for (const handle of ['nw', 'ne', 'se', 'sw']) {
          el.appendChild(App.buildNodeResizeHandle(node, handle));
        }
      }
    }

    el.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!App.nodeHitTest(event)) return;
      if (App.state.didDragNode) {
        App.state.didDragNode = false;
        return;
      }
      App.selectNode(node.id, { additive: event.shiftKey });
    });

    el.addEventListener('dblclick', (event) => {
      if (event.target.closest('.connector-dot')) return;
      if (!App.nodeHitTest(event)) return;
      if (event.target.closest('.basic-shape-text.is-editable')) return;
      event.preventDefault();
      event.stopPropagation();
      if (App.isTextBoxNode(node)) {
        App.enterTextBoxEdit(node.id);
        return;
      }
      App.toggleNodeExpansion(node.id);
    });

    el.addEventListener('pointerdown', (event) => {
      if (!App.state.editMode || event.button !== 0 || event.target.closest('.connector-dot')) return;
      if (event.target.closest('.basic-shape-text.is-editable')) return;
      if (App.isTextBoxNode(node) && event.target.closest('.basic-shape-text')) return;
      if (!event.target.closest('.node-icon-frame, .expanded-part-panel') || !App.nodeHitTest(event)) return;
      App.startNodeDrag(event, node.id, { group: event.shiftKey });
    });

    return el;
  },

  buildNodeResizeHandle(node, handle) {
    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = `node-resize-handle node-resize-${handle}`;
    grip.dataset.handle = handle;
    grip.title = 'Resize icon';
    grip.addEventListener('pointerdown', (event) => {
      if (!App.state.editMode || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      App.startNodeResize(event, node.id, handle);
      App.capturePointer(grip, event.pointerId);
    });
    return grip;
  },

  buildExpandedPartPanel(node, subdiagram) {
    const panel = document.createElement('div');
    panel.className = 'expanded-part-panel';
    panel.style.width = `${EXPANDED_PART_PREVIEW.width}px`;
    panel.style.height = `${EXPANDED_PART_PREVIEW.height}px`;
    panel.title = 'Double-click the part to collapse internals';

    const title = document.createElement('div');
    title.className = 'expanded-part-title';
    title.textContent = subdiagram.name || `${node.label} internals`;

    const canvas = document.createElement('div');
    canvas.className = 'expanded-part-canvas';
    canvas.style.width = `${EXPANDED_PART_PREVIEW.canvasWidth}px`;
    canvas.style.height = `${EXPANDED_PART_PREVIEW.canvasHeight}px`;

    const key = String(subdiagram.id);
    const diagram = App.state.expandedDiagramCache.get(key);
    if (App.state.expandedDiagramLoading.has(key)) {
      App.renderExpandedPartEmpty(canvas, 'Loading internals...');
    } else if (diagram) {
      App.renderSubdiagramPreview(canvas, diagram);
    } else {
      App.renderExpandedPartEmpty(canvas, 'Double-click again to load internals.');
    }

    panel.append(title, canvas);
    for (const connector of App.nodeConnectors(node)) {
      panel.appendChild(App.buildExpandedConnectorElement(node, connector));
    }
    return panel;
  },

  renderExpandedPartEmpty(container, message) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'expanded-part-empty';
    empty.textContent = message;
    container.appendChild(empty);
  },

  renderSubdiagramPreview(container, diagram) {
    container.innerHTML = '';
    const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
    const wires = Array.isArray(diagram.wires) ? diagram.wires : [];
    if (!nodes.length && !wires.length) {
      App.renderExpandedPartEmpty(container, 'No internal parts yet.');
      return;
    }

    const fit = App.fitSubdiagramPreview(App.subdiagramPreviewBounds(diagram));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'expanded-internal-wires');
    svg.setAttribute('viewBox', `0 0 ${EXPANDED_PART_PREVIEW.canvasWidth} ${EXPANDED_PART_PREVIEW.canvasHeight}`);

    for (const wire of wires) {
      const d = App.subdiagramPreviewWirePath(wire, diagram, fit);
      if (!d) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'expanded-internal-wire');
      svg.appendChild(path);
    }
    container.appendChild(svg);

    for (const node of nodes) {
      const leftTop = App.previewBoardPoint({ x: node.x, y: node.y }, fit);
      const w = Math.max(34, (Number(node.w) || DEFAULT_NODE_W) * fit.scale);
      const h = Math.max(32, (Number(node.h) || DEFAULT_NODE_H) * fit.scale);

      const item = document.createElement('div');
      item.className = 'expanded-internal-node';
      item.style.left = `${leftTop.x}px`;
      item.style.top = `${leftTop.y}px`;
      item.style.width = `${w}px`;
      item.style.height = `${h}px`;
      item.title = node.label;

      const icon = document.createElement('div');
      icon.className = 'expanded-internal-icon';
      App.renderIcon(icon, node.icon, node.label);

      const label = document.createElement('div');
      label.className = 'expanded-internal-label';
      label.textContent = node.label;

      item.append(icon, label);
      container.appendChild(item);
    }
  },

  subdiagramPreviewBounds(diagram) {
    const points = [];
    const addPoint = (point) => {
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) points.push(point);
    };
    const addBox = (left, top, right, bottom) => {
      addPoint({ x: left, y: top });
      addPoint({ x: right, y: bottom });
    };

    for (const node of diagram.nodes || []) {
      addBox(
        Number(node.x) || 0,
        Number(node.y) || 0,
        (Number(node.x) || 0) + (Number(node.w) || DEFAULT_NODE_W),
        (Number(node.y) || 0) + (Number(node.h) || DEFAULT_NODE_H),
      );
    }

    for (const wire of diagram.wires || []) {
      addPoint(App.subdiagramEndpointBoardPoint(wire.from, diagram));
      addPoint(App.subdiagramEndpointBoardPoint(wire.to, diagram));
      for (const bend of App.normalizeWireBends(wire.via)) addPoint(bend);
    }

    if (!points.length) {
      return { left: 0, top: 0, right: DEFAULT_NODE_W, bottom: DEFAULT_NODE_H };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const margin = 28;
    return {
      left: Math.min(...xs) - margin,
      top: Math.min(...ys) - margin,
      right: Math.max(...xs) + margin,
      bottom: Math.max(...ys) + margin,
    };
  },

  fitSubdiagramPreview(bounds) {
    const width = EXPANDED_PART_PREVIEW.canvasWidth;
    const height = EXPANDED_PART_PREVIEW.canvasHeight;
    const pad = EXPANDED_PART_PREVIEW.padding;
    const boundsW = Math.max(1, bounds.right - bounds.left);
    const boundsH = Math.max(1, bounds.bottom - bounds.top);
    const scale = Math.min((width - pad * 2) / boundsW, (height - pad * 2) / boundsH, 1);
    return {
      ...bounds,
      scale,
      offsetX: (width - boundsW * scale) / 2,
      offsetY: (height - boundsH * scale) / 2,
    };
  },

  previewBoardPoint(point, fit) {
    return {
      x: Math.round((point.x - fit.left) * fit.scale + fit.offsetX),
      y: Math.round((point.y - fit.top) * fit.scale + fit.offsetY),
    };
  },

  subdiagramPreviewWirePath(wire, diagram, fit) {
    const start = App.subdiagramEndpointBoardPoint(wire.from, diagram);
    const end = App.subdiagramEndpointBoardPoint(wire.to, diagram);
    if (!start || !end) return '';
    const points = [
      start,
      ...App.normalizeWireBends(wire.via),
      end,
    ].map((point) => App.previewBoardPoint(point, fit));
    return App.roundedPolylinePath(App.orthogonalRoutePoints(points));
  },

  subdiagramEndpointBoardPoint(endpoint, diagram) {
    if (!endpoint) return null;
    if (endpoint.nodeId && endpoint.connectorId) {
      const node = (diagram.nodes || []).find((item) => String(item.id) === String(endpoint.nodeId));
      if (!node) return null;
      const connector = App.cloneConnectors(node.connectors)
        .find((conn) => String(conn.id) === String(endpoint.connectorId));
      if (!connector) {
        return {
          x: (Number(node.x) || 0) + (Number(node.w) || DEFAULT_NODE_W) / 2,
          y: (Number(node.y) || 0) + (Number(node.h) || DEFAULT_NODE_H) / 2,
        };
      }
      return App.subdiagramConnectorBoardPoint(node, connector);
    }
    if (Number.isFinite(Number(endpoint.x)) && Number.isFinite(Number(endpoint.y))) {
      return { x: Number(endpoint.x), y: Number(endpoint.y) };
    }
    return null;
  },

  subdiagramConnectorBoardPoint(node, connector) {
    const nodeX = Number(node.x) || 0;
    const nodeY = Number(node.y) || 0;
    const nodeW = App.clampNodeWidth(node.w);
    const nodeH = App.clampNodeHeight(node.h);
    const rect = App.connectorContentRectForNode(node, nodeW, nodeH);
    return {
      x: nodeX + rect.x + App.clamp01(connector.x) * rect.w,
      y: nodeY + rect.y + App.clamp01(connector.y) * rect.h,
    };
  },

  expandedConnectorPosition(connector) {
    const x = App.clamp01(connector.x);
    const y = App.clamp01(connector.y);
    let side = null;

    if (Math.abs(x - 0.5) < 0.08 && Math.abs(y - 0.5) < 0.08) {
      side = connector.role === 'input'
        ? 'left'
        : connector.role === 'output'
          ? 'right'
          : 'bottom';
    }

    if (!side) {
      side = [
        { side: 'left', distance: x },
        { side: 'right', distance: 1 - x },
        { side: 'top', distance: y },
        { side: 'bottom', distance: 1 - y },
      ].sort((a, b) => a.distance - b.distance)[0].side;
    }

    if (side === 'left') return { side, x: 0, y };
    if (side === 'right') return { side, x: 1, y };
    if (side === 'top') return { side, x, y: 0 };
    return { side, x, y: 1 };
  },

  buildExpandedConnectorElement(node, connector) {
    const dot = App.buildConnectorElement(node, connector);
    const pos = App.expandedConnectorPosition(connector);
    dot.classList.add('connector-dot-expanded');
    dot.dataset.expandedSide = pos.side;
    dot.style.left = `${pos.x * 100}%`;
    dot.style.top = `${pos.y * 100}%`;
    return dot;
  },

  connectorHasWire(nodeId, connectorId) {
    return (App.state.diagram.wires || []).some((wire) => (
      (String(wire.from?.nodeId) === String(nodeId) && String(wire.from?.connectorId) === String(connectorId)) ||
      (String(wire.to?.nodeId) === String(nodeId) && String(wire.to?.connectorId) === String(connectorId))
    ));
  },

  shouldShowConnector(node, connector) {
    if (App.connectorHasWire(node.id, connector.id)) return true;
    if (!App.state.editMode) return false;
    if (App.state.selectedNodeId === String(node.id) || App.state.selectedNodeIds.has(String(node.id))) return true;
    return Boolean(App.state.wireDraft || App.state.wireDragActive);
  },

  buildConnectorElement(node, connector, partSize = null) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `connector-dot role-${connector.role || 'neutral'}`;
    const connected = App.connectorHasWire(node.id, connector.id);
    const visible = App.shouldShowConnector(node, connector);
    dot.classList.toggle('is-connected', connected);
    dot.classList.toggle('is-visible', visible);
    dot.classList.toggle('is-available', visible && !connected);
    dot.style.left = '0';
    dot.style.top = '0';
    const isShapeNode = node.icon?.startsWith('shape:');
    if (isShapeNode) {
      dot.classList.add('connector-dot-cross');
      const cross = partSize ? Math.max(6, Math.min(24, partSize * 0.06)) : 12;
      dot.style.width = `${cross}px`;
      dot.style.height = `${cross}px`;
      dot.style.marginLeft = `${-cross / 2}px`;
      dot.style.marginTop = `${-cross / 2}px`;
    } else {
      const dotSize = partSize
        ? Math.max(4, Math.min(24, partSize * 0.06))
        : Math.max(8, Math.min(18, (Number(connector.size) || 5) * 2));
      const dotColor = App.normalizeColor(connector.color, connector.role === 'input' ? '#7ea1c4' : '#d6a84f');
      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.marginLeft = `${-dotSize / 2}px`;
      dot.style.marginTop = `${-dotSize / 2}px`;
      dot.style.borderColor = dotColor;
    }
    dot.dataset.nodeId = node.id;
    dot.dataset.connectorId = connector.id;
    dot.title = connector.label || connector.role || 'Connector';

    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      if (App.state.suppressConnectorClick) {
        App.state.suppressConnectorClick = false;
        return;
      }
      if (App.state.wireDragActive) return;
      if (App.state.editMode) {
        App.handleConnectorClick(node.id, connector.id);
      } else {
        App.selectNode(node.id);
      }
    });

    dot.addEventListener('pointerdown', (event) => {
      if (!App.state.editMode || event.button !== 0) return;
      event.stopPropagation();
      App.startWireDrag(event, node.id, connector.id);
    });

    return dot;
  },

  buildConnectorLabelElement(node, connector) {
    const label = document.createElement('div');
    const text = String(connector.label || connector.id || '').trim();
    const side = App.connectorSide(connector);
    label.className = 'connector-label';
    label.dataset.side = side || 'bottom';
    label.textContent = text;
    label.title = text;
    label.style.left = '0';
    label.style.top = '0';
    return label;
  },

  positionNodeLabel(labelEl, node) {
    const offset = App.normalizeLabelOffset(node.labelOffset, node);
    const w = App.clampNodeWidth(node.w);
    const h = App.clampNodeHeight(node.h);
    labelEl.style.left = `calc(50% + ${offset.x}px)`;
    labelEl.style.top = `calc(50% + ${offset.y}px)`;
    if (offset.y < -h / 2) {
      labelEl.style.transform = 'translate(-50%, -100%)';
    } else if (offset.x < -w / 2) {
      labelEl.style.transform = 'translate(-100%, -50%)';
    } else if (offset.x > w / 2) {
      labelEl.style.transform = 'translate(0, -50%)';
    } else {
      labelEl.style.transform = 'translate(-50%, 0)';
    }
    labelEl.dataset.zone = offset.y < -h / 2
      ? 'top'
      : offset.x < -w / 2
        ? 'left'
        : offset.x > w / 2
          ? 'right'
          : 'bottom';
  },

  nodeHitTest(event) {
    const label = event.target.closest?.('.node-label');
    const badge = event.target.closest?.('.node-doc-badge');
    const expandedPanel = event.target.closest?.('.expanded-part-panel');
    if (label || badge || expandedPanel) return true;
    return Boolean(event.target.closest?.('.node-icon-frame'));
  },

  renderIcon(container, iconKey, label = '', node = null) {
    container.innerHTML = '';
    if (App.isBasicShapeIcon(iconKey)) {
      const shape = document.createElement('div');
      shape.className = `basic-shape-node basic-shape-${App.basicShapeType(iconKey)}`;
      const text = document.createElement('span');
      text.className = 'basic-shape-text';
      text.textContent = label || 'Text';
      if (node && App.isTextBoxNode(node)) App.applyTextStyle(text, node);
      shape.appendChild(text);
      container.appendChild(shape);
      return;
    }

    if (App.isCustomIcon(iconKey)) {
      const resolvedIcon = App.customIconForKey(iconKey, label);
      if (!resolvedIcon) {
        App.renderMissingCustomIcon(container, label);
        return;
      }
      const img = document.createElement('img');
      img.className = 'part-img';
      img.src = App.customIconSrc(iconKey, label);
      img.alt = label;
      img.draggable = false;
      container.appendChild(img);
      return;
    }

    container.innerHTML = getBuiltinSvg(iconKey || 'generic');
  },

  renderMissingCustomIcon(container, label = '') {
    const missing = document.createElement('div');
    missing.className = 'missing-part-icon';
    missing.textContent = label || 'Missing part';
    missing.title = 'This saved diagram points to a part that is no longer in the Parts Library.';
    container.appendChild(missing);
  },

  isBasicShapeIcon(iconKey) {
    return String(iconKey || '').startsWith('shape:');
  },

  basicShapeType(iconKey) {
    const raw = String(iconKey || '').split(':')[1] || 'rect';
    return ['rect', 'pill', 'circle', 'textbox'].includes(raw) ? raw : 'rect';
  },

  isTextBoxNode(node) {
    return App.basicShapeType(node?.icon) === 'textbox' && App.isBasicShapeIcon(node?.icon);
  },

  applyTextStyle(el, node) {
    const style = App.normalizeTextStyle(node?.textStyle);
    el.style.fontFamily = style.fontFamily;
    el.style.fontSize = `${style.fontSize}px`;
    el.style.fontWeight = style.bold ? '800' : '500';
    el.style.fontStyle = style.italic ? 'italic' : 'normal';
    el.style.color = style.color || '';
  },

  enterTextBoxEdit(nodeId, { selectAll = false } = {}) {
    const node = App.findNode(nodeId);
    if (!App.state.editMode || !App.isTextBoxNode(node)) return;
    App.state.selectedNodeId = String(node.id);
    App.state.selectedNodeIds = new Set([String(node.id)]);
    App.state.selectedWireId = null;
    App.state.editingTextNodeId = String(node.id);
    App.state.activeToolbarAction = null;
    App.state.wireDraft = null;
    App.state.draftPoint = null;
    document.body.classList.remove('is-wiring');
    App.renderDiagram();
    App.renderSelectionTools();
    App.renderPartInfoPanel(node);
    App.loadNodeDocs(node.id);
    App.focusTextBoxEditor(node.id, { selectAll });
  },

  exitTextBoxEdit() {
    if (!App.state.editingTextNodeId) return;
    App.state.editingTextNodeId = null;
    App.renderDiagram();
    App.renderSelectionTools();
  },

  focusTextBoxEditor(nodeId, { selectAll = false } = {}) {
    const text = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(String(nodeId))}"] .basic-shape-text`);
    if (!text) return;
    text.focus({ preventScroll: true });
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(text);
    if (!selectAll) range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  },

  updateNodeTextContent(node, value) {
    if (!node) return;
    node.label = String(value ?? '').replace(/\r/g, '').slice(0, 2000);
    const labelInput = App.el('selected-node-label');
    if (labelInput && App.state.selectedNodeId === String(node.id)) labelInput.value = node.label;
    if (App.state.selectedNodeId === String(node.id)) App.el('doc-panel-title').textContent = node.label || 'Text';
    App.renderDiagramTree();
  },

  configureTextBoxElement(container, node) {
    if (!App.isTextBoxNode(node)) return;
    const text = container.querySelector('.basic-shape-text');
    if (!text) return;
    const editing = App.state.editMode && App.state.editingTextNodeId === String(node.id);
    text.contentEditable = editing ? 'plaintext-only' : 'false';
    text.spellcheck = false;
    text.setAttribute('role', 'textbox');
    text.setAttribute('aria-label', 'Text box content');
    text.classList.toggle('is-editable', editing);
    text.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      App.enterTextBoxEdit(node.id);
    });
    text.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!editing) App.selectNode(node.id);
    });
    text.addEventListener('pointerdown', (event) => {
      if (editing || event.detail >= 2) event.stopPropagation();
    });
    text.addEventListener('blur', () => {
      if (App.state.editingTextNodeId === String(node.id)) App.exitTextBoxEdit();
    });
    text.addEventListener('input', () => {
      App.updateNodeTextContent(node, text.innerText);
    });
  },

  isConnectableNode(node) {
    return !App.isTextBoxNode(node);
  },

  nodeConnectors(node) {
    return App.isConnectableNode(node) ? App.cloneConnectors(node?.connectors) : [];
  },

  renderWires() {
    const svg = App.el('wire-layer');
    svg.innerHTML = '';
    App.clearWireLabels();
    App.appendWireMarkers(svg);

    App.appendSnapGuides(svg);
    App.appendGroupOutlines(svg);

    for (const wire of App.state.diagram.wires) {
      const start = App.endpointPoint(wire.from);
      const end = App.endpointPoint(wire.to);
      if (!start || !end) continue;
      App.appendWirePath(svg, wire, start, end);
    }

    if (App.state.wireDraft && App.state.draftPoint) {
      const start = App.connectorPoint(
        App.state.wireDraft.nodeId,
        App.state.wireDraft.connectorId,
      );
      const draftStartDir = App.endpointExitDir(App.state.wireDraft);
      if (start) App.appendDraftWirePath(svg, start, App.state.draftPoint, draftStartDir);
    }
  },

  appendGroupOutlines(svg) {
    const groups = App.state.diagram.groups || [];
    if (!groups.length) return;
    const margin = 14;
    for (const group of groups) {
      const bounds = App.groupBounds(group);
      if (!bounds) continue;
      const topLeft = App.boardToStage({ x: bounds.left - margin, y: bounds.top - margin });
      const bottomRight = App.boardToStage({ x: bounds.right + margin, y: bounds.bottom + margin });
      const x = topLeft.x;
      const y = topLeft.y;
      const w = Math.max(0, bottomRight.x - topLeft.x);
      const h = Math.max(0, bottomRight.y - topLeft.y);

      const onDown = (event) => {
        if (!App.state.editMode) return;
        event.stopPropagation();
        event.preventDefault();
        App.startGroupDrag(event, group.id);
      };

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hit.setAttribute('x', x);
      hit.setAttribute('y', y);
      hit.setAttribute('width', w);
      hit.setAttribute('height', h);
      hit.setAttribute('rx', 10);
      hit.setAttribute('ry', 10);
      hit.setAttribute('class', 'diagram-group-outline-hit');
      hit.dataset.groupId = group.id;
      hit.addEventListener('pointerdown', onDown);
      svg.appendChild(hit);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 10);
      rect.setAttribute('ry', 10);
      let cls = 'diagram-group-outline';
      if (App.state.selectedGroupId === group.id) cls += ' is-selected';
      rect.setAttribute('class', cls);
      rect.dataset.groupId = group.id;
      rect.addEventListener('pointerdown', onDown);
      svg.appendChild(rect);
    }
  },

  appendSnapGuides(svg) {
    for (const guide of App.state.snapGuides || []) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      if (guide.axis === 'x') {
        const start = App.boardToStage({ x: guide.value, y: guide.from });
        const end = App.boardToStage({ x: guide.value, y: guide.to });
        line.setAttribute('x1', start.x);
        line.setAttribute('y1', start.y);
        line.setAttribute('x2', end.x);
        line.setAttribute('y2', end.y);
      } else {
        const start = App.boardToStage({ x: guide.from, y: guide.value });
        const end = App.boardToStage({ x: guide.to, y: guide.value });
        line.setAttribute('x1', start.x);
        line.setAttribute('y1', start.y);
        line.setAttribute('x2', end.x);
        line.setAttribute('y2', end.y);
      }
      line.setAttribute('class', 'snap-guide');
      svg.appendChild(line);
    }
  },

  appendWirePath(svg, wire, start, end) {
    const startDir = App.endpointExitDir(wire.from);
    const endDir = App.endpointExitDir(wire.to);
    const route = App.wireRoutePoints(start, end, wire.via, startDir, endDir, App.wireStubLengths(wire));
    const d = App.roundedPolylinePath(route);
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('class', 'wire-hit');
    hit.setAttribute('data-wire-id', wire.id);
    hit.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!App.state.editMode) return;
      if (event.ctrlKey) {
        App.insertWireBend(wire, event, start, end);
        return;
      }
      App.selectWire(wire.id);
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('data-wire-id', wire.id);
    path.setAttribute('class', App.wireClassName(wire));
    if (wire.kind === 'arrow') path.setAttribute('marker-end', 'url(#wire-arrowhead)');
    if (wire.color) path.style.stroke = wire.color;
    svg.appendChild(hit);

    if (App.state.selectedWireId === wire.id) {
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      halo.setAttribute('d', d);
      halo.setAttribute('class', 'wire-selection-halo');
      svg.appendChild(halo);
    }

    svg.appendChild(path);
    App.appendWireLabel(wire, route);

    if (App.state.editMode && App.state.selectedWireId === wire.id) {
      App.appendWireSegmentHandles(svg, wire, route, startDir, endDir);
      App.appendWireBendHandles(svg, wire);
    }

    if (!wire.from.nodeId) App.appendFreeWireEnd(svg, wire, start, 'from');
    if (!wire.to.nodeId) App.appendFreeWireEnd(svg, wire, end, 'to');
  },

  wireEndpointText(endpoint) {
    if (!endpoint?.nodeId) return null;
    const node = App.findNode(endpoint.nodeId);
    if (!node) return null;
    const connector = endpoint.connectorId ? App.findConnector(endpoint.nodeId, endpoint.connectorId) : null;
    const connectorName = String(connector?.label || connector?.id || '').trim();
    return {
      part: String(node.label || 'Part').trim() || 'Part',
      connector: connectorName || 'connection',
    };
  },

  wireAutoLabel(wire) {
    if (!wire?.from?.nodeId || !wire?.to?.nodeId) return '';
    const target = App.wireEndpointText(wire.to);
    if (!target) return '';
    return `TO ${target.part} (${target.connector})`;
  },

  wireDisplayLabel(wire) {
    const custom = String(wire?.label || '').trim();
    if (custom) return custom;
    return App.wireAutoLabel(wire);
  },

  clearWireLabels() {
    App.el('node-layer')?.querySelectorAll('.wire-label').forEach((label) => label.remove());
  },

  wireEndLabelText(wire, end) {
    const custom = String(wire?.label || '').trim();
    if (custom) return custom;
    const other = end === 'from' ? wire?.to : wire?.from;
    const text = App.wireEndpointText(other);
    if (!text) return '';
    return `TO ${text.part} (${text.connector})`;
  },

  measureWireLabelWidth(text, fontSize) {
    if (!text) return 0;
    if (!App._labelMeasureCanvas) {
      App._labelMeasureCanvas = document.createElement('canvas');
    }
    const ctx = App._labelMeasureCanvas.getContext('2d');
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    return ctx.measureText(text).width;
  },

  wireStubLengths(wire) {
    const zoom = App.viewport().zoom || 1;
    const fontSize = 9 * zoom;
    const along = 10 * zoom;
    const tail = 14 * zoom;
    const fromText = App.wireEndLabelText(wire, 'from');
    const toText = App.wireEndLabelText(wire, 'to');
    return {
      from: fromText ? along + App.measureWireLabelWidth(fromText, fontSize) + tail : 0,
      to: toText ? along + App.measureWireLabelWidth(toText, fontSize) + tail : 0,
    };
  },

  appendWireLabel(wire, route) {
    if (!Array.isArray(route) || route.length < 2) return;
    const layer = App.el('node-layer');
    if (!layer) return;
    App.appendWireEndLabel(wire, route, 'from', layer);
    App.appendWireEndLabel(wire, route, 'to', layer);
  },

  appendWireEndLabel(wire, route, end, layer) {
    const labelText = App.wireEndLabelText(wire, end);
    if (!labelText) return;

    let anchor;
    let neighbor;
    if (end === 'from') {
      anchor = route[0];
      neighbor = route[1];
    } else {
      anchor = route[route.length - 1];
      neighbor = route[route.length - 2];
    }

    const dx = neighbor.x - anchor.x;
    const dy = neighbor.y - anchor.y;
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    const positive = isHorizontal ? dx >= 0 : dy >= 0;

    const zoom = App.viewport().zoom || 1;
    const along = 10 * zoom;
    const perpGap = 1 * zoom;
    const fontSize = 9 * zoom;

    let left;
    let top;
    let orient;
    if (isHorizontal) {
      left = positive ? anchor.x + along : anchor.x - along;
      top = anchor.y - perpGap;
      orient = positive ? 'h-right' : 'h-left';
    } else {
      const labelHeight = fontSize;
      if (positive) {
        left = anchor.x - perpGap;
        top = anchor.y + along;
        orient = 'v-down';
      } else {
        left = anchor.x - perpGap - labelHeight;
        top = anchor.y - along;
        orient = 'v-up';
      }
    }

    const label = document.createElement('div');
    label.className = 'wire-label';
    label.dataset.orient = orient;
    label.textContent = labelText;
    label.title = labelText;
    label.style.fontSize = `${fontSize}px`;
    label.style.maxWidth = 'none';
    label.style.left = `${Math.round(left)}px`;
    label.style.top = `${Math.round(top)}px`;
    layer.appendChild(label);
  },

  wireClassName(wire) {
    const type = App.normalizeWireType(wire.type);
    const style = App.normalizeWireStyle(wire.lineStyle);
    const classes = ['wire-path', `wire-type-${type}`, `wire-style-${style}`];
    if (wire.kind === 'arrow') classes.push('wire-kind-arrow');
    if (App.state.selectedWireId === wire.id) classes.push('is-selected');
    return classes.join(' ');
  },

  appendWireMarkers(svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'wire-arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8.5');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    marker.setAttribute('markerUnits', 'strokeWidth');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', 'context-stroke');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
  },

  appendWireBendHandles(svg, wire) {
    const bends = App.normalizeWireBends(wire.via);
    bends.forEach((bend, idx) => {
      const point = App.boardToStage(bend);
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', point.x);
      handle.setAttribute('cy', point.y);
      handle.setAttribute('r', 5);
      handle.setAttribute('class', 'wire-bend-handle');
      handle.setAttribute('title', 'Drag to move · Double-click to delete');
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        App.state.draggingBend = { wireId: wire.id, index: idx };
        App.selectWire(wire.id);
      });
      handle.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        wire.via = App.normalizeWireBends(wire.via);
        wire.via.splice(idx, 1);
        App.renderWires();
      });
      svg.appendChild(handle);
    });
  },

  appendWireSegmentHandles(svg, wire, route, startDir, endDir) {
    const firstDrag = startDir ? 1 : 0;
    const lastDrag = route.length - 1 - (endDir ? 1 : 0);
    for (let i = firstDrag; i < lastDrag; i++) {
      const a = route[i], b = route[i + 1];
      const isH = Math.abs(a.y - b.y) < 2;
      const len = isH ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
      if (len < 14) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const hw = isH ? Math.min(len - 10, 44) : 10;
      const hh = isH ? 10 : Math.min(len - 10, 44);
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      handle.setAttribute('x', mx - hw / 2);
      handle.setAttribute('y', my - hh / 2);
      handle.setAttribute('width', hw);
      handle.setAttribute('height', hh);
      handle.setAttribute('rx', 3);
      handle.setAttribute('class', `wire-segment-handle ${isH ? 'is-horizontal' : 'is-vertical'}`);
      const segIdx = i;
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        App.startWireSegmentDrag(event, wire, route, segIdx, startDir, endDir);
      });
      svg.appendChild(handle);
    }
  },

  expandWireVia(wire, fullRoute, startDir, endDir) {
    const skipStart = startDir ? 2 : 1;
    const skipEnd = endDir ? 2 : 1;
    const N = fullRoute.length;
    if (N <= skipStart + skipEnd) return;
    wire.via = fullRoute.slice(skipStart, N - skipEnd).map(pt => App.stageToBoard(pt));
  },

  startWireSegmentDrag(event, wire, fullRoute, segIdx, startDir, endDir) {
    App.selectWire(wire.id);
    App.expandWireVia(wire, fullRoute, startDir, endDir);
    const skipStart = startDir ? 2 : 1;
    const viaLen = wire.via.length;
    const a = fullRoute[segIdx], b = fullRoute[segIdx + 1];
    const isHorizontal = Math.abs(a.y - b.y) < 2;
    const viaIdxA = segIdx - skipStart;
    const viaIdxB = segIdx + 1 - skipStart;
    let resolvedA = (viaIdxA >= 0 && viaIdxA < viaLen) ? viaIdxA : -1;
    let resolvedB = (viaIdxB >= 0 && viaIdxB < viaLen) ? viaIdxB : -1;
    if (resolvedA === -1 && resolvedB === -1) {
      resolvedA = wire.via.length;
      wire.via.push(App.stageToBoard(a));
      resolvedB = wire.via.length;
      wire.via.push(App.stageToBoard(b));
    }
    App.state.draggingBend = {
      wireId: wire.id,
      isSegment: true,
      viaIdxA: resolvedA,
      viaIdxB: resolvedB,
      isHorizontal,
      initVia: wire.via.map(v => ({ ...v })),
      startX: event.clientX,
      startY: event.clientY,
    };
  },

  appendFreeWireEnd(svg, wire, point, endKey) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', 4.5);
    circle.setAttribute('class', `wire-free-end${App.state.selectedWireId === wire.id ? ' is-selected' : ''}`);
    circle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (App.state.editMode) App.selectWire(wire.id);
    });
    circle.addEventListener('pointerdown', (event) => {
      if (!App.state.editMode || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      App.capturePointer(circle, event.pointerId);
      App.selectWire(wire.id);
      App.state.draggingWireEnd = { wireId: wire.id, endKey };
    });
    svg.appendChild(circle);
  },

  appendDraftWirePath(svg, start, end, startDir = null) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', App.wirePathD(start, end, [], startDir, null));
    path.setAttribute('class', 'wire-path wire-draft');
    svg.appendChild(path);
  },

  endpointExitDir(endpoint) {
    if (!endpoint?.nodeId || !endpoint?.connectorId) return null;
    const connector = App.findConnector(endpoint.nodeId, endpoint.connectorId);
    if (!connector) return null;
    const side = App.connectorSide(connector);
    if (side === 'right')  return { dx:  1, dy:  0 };
    if (side === 'left')   return { dx: -1, dy:  0 };
    if (side === 'top')    return { dx:  0, dy: -1 };
    if (side === 'bottom') return { dx:  0, dy:  1 };
    return null;
  },

  wirePathD(start, end, via = [], startDir = null, endDir = null) {
    return App.roundedPolylinePath(App.wireRoutePoints(start, end, via, startDir, endDir));
  },

  wireRoutePoints(start, end, via = [], startDir = null, endDir = null, stubs = null) {
    if (!start || !end) return [];
    const zoom = App.viewport().zoom || 1;
    const baseStub = Math.max(16, Math.min(42, WIRE_PORT_STUB * zoom));
    const startStubLen = Math.max(baseStub, stubs?.from || 0);
    const endStubLen = Math.max(baseStub, stubs?.to || 0);

    const startStub = startDir
      ? { x: start.x + startDir.dx * startStubLen, y: start.y + startDir.dy * startStubLen }
      : start;
    const endStub = endDir
      ? { x: end.x + endDir.dx * endStubLen, y: end.y + endDir.dy * endStubLen }
      : end;

    const viaPoints = App.normalizeWireBends(via).map(
      (pt) => App.boardToStage(App.visualBoardPoint(pt)),
    );

    const route = App.orthogonalRoutePoints([startStub, ...viaPoints, endStub]);

    const fullRoute = [
      ...(startDir ? [start] : []),
      ...route,
      ...(endDir ? [end] : []),
    ];

    return App.simplifyWireRoute(fullRoute);
  },

  simplifyWireRoute(points) {
    const unique = [];
    for (const point of points) {
      if (!point) continue;
      const next = { x: Math.round(point.x), y: Math.round(point.y) };
      const prev = unique[unique.length - 1];
      if (!prev || prev.x !== next.x || prev.y !== next.y) unique.push(next);
    }

    const simplified = [];
    for (const point of unique) {
      simplified.push(point);
      while (simplified.length >= 3) {
        const a = simplified[simplified.length - 3];
        const b = simplified[simplified.length - 2];
        const c = simplified[simplified.length - 1];
        const sameX = a.x === b.x && b.x === c.x;
        const sameY = a.y === b.y && b.y === c.y;
        if (!sameX && !sameY) break;
        simplified.splice(simplified.length - 2, 1);
      }
    }

    return simplified;
  },

  orthogonalRoutePoints(points) {
    if (points.length < 2) return points;
    const route = [{ x: Math.round(points[0].x), y: Math.round(points[0].y) }];

    for (let idx = 1; idx < points.length; idx += 1) {
      const prev = route[route.length - 1];
      const next = { x: Math.round(points[idx].x), y: Math.round(points[idx].y) };
      const dx = Math.abs(next.x - prev.x);
      const dy = Math.abs(next.y - prev.y);
      const isLast = idx === points.length - 1;

      if (dy <= WIRE_STRAIGHT_SNAP && (dy <= dx || dx > WIRE_STRAIGHT_SNAP)) {
        if (isLast) {
          route.push({ x: next.x, y: prev.y }, next);
          continue;
        }
        next.y = prev.y;
      } else if (dx <= WIRE_STRAIGHT_SNAP) {
        if (isLast) {
          route.push({ x: prev.x, y: next.y }, next);
          continue;
        }
        next.x = prev.x;
      }

      if (prev.x === next.x || prev.y === next.y) {
        route.push(next);
      } else {
        route.push({ x: next.x, y: prev.y }, next);
      }
    }

    return route.filter((point, idx, arr) => (
      idx === 0 || point.x !== arr[idx - 1].x || point.y !== arr[idx - 1].y
    ));
  },

  roundedPolylinePath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const radius = WIRE_CORNER_RADIUS;
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let idx = 1; idx < points.length - 1; idx += 1) {
      const prev = points[idx - 1];
      const curr = points[idx];
      const next = points[idx + 1];
      const lenIn = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      const lenOut = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);
      const isCorner = (prev.x === curr.x || prev.y === curr.y) &&
        (next.x === curr.x || next.y === curr.y) &&
        !((prev.x === curr.x && next.x === curr.x) || (prev.y === curr.y && next.y === curr.y));
      const r = Math.min(radius, lenIn / 2, lenOut / 2);

      if (!isCorner || r <= 1) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
      }

      const before = {
        x: curr.x + Math.sign(prev.x - curr.x) * r,
        y: curr.y + Math.sign(prev.y - curr.y) * r,
      };
      const after = {
        x: curr.x + Math.sign(next.x - curr.x) * r,
        y: curr.y + Math.sign(next.y - curr.y) * r,
      };
      d += ` L ${before.x} ${before.y} Q ${curr.x} ${curr.y} ${after.x} ${after.y}`;
    }

    const last = points[points.length - 1];
    return `${d} L ${last.x} ${last.y}`;
  },

  nearestPointOnPolyline(points, point) {
    let best = null;
    let travelled = 0;
    for (let idx = 0; idx < points.length - 1; idx += 1) {
      const a = points[idx];
      const b = points[idx + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (!lenSq) continue;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
      const projected = { x: a.x + dx * t, y: a.y + dy * t };
      const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
      const along = travelled + Math.sqrt(lenSq) * t;
      if (!best || distance < best.distance) best = { point: projected, distance, along };
      travelled += Math.sqrt(lenSq);
    }
    return best;
  },

  routeDistanceToPoint(route, point) {
    return App.nearestPointOnPolyline(route, point)?.along ?? 0;
  },

  insertWireBend(wire, event, start = null, end = null) {
    const stagePoint = App.pointInStage(event);
    const wireStart = start || App.endpointPoint(wire.from);
    const wireEnd = end || App.endpointPoint(wire.to);
    if (!wireStart || !wireEnd) return;
    const route = App.wireRoutePoints(
      wireStart,
      wireEnd,
      wire.via,
      App.endpointExitDir(wire.from),
      App.endpointExitDir(wire.to),
      App.wireStubLengths(wire),
    );
    const nearest = App.nearestPointOnPolyline(route, stagePoint);
    if (!nearest) return;

    const via = App.normalizeWireBends(wire.via);
    const viaDistances = via.map((point) => (
      App.routeDistanceToPoint(route, App.boardToStage(App.visualBoardPoint(point)))
    ));
    const insertAt = viaDistances.findIndex((distance) => distance > nearest.along);
    via.splice(insertAt === -1 ? via.length : insertAt, 0, App.stageToBoard(nearest.point));
    wire.via = via;
    App.selectWire(wire.id);
    App.renderWires();
  },

  nearestWireAtStage(stagePoint, maxDistance = WIRE_HIT_TOLERANCE) {
    let best = null;
    for (const wire of App.state.diagram.wires || []) {
      const start = App.endpointPoint(wire.from);
      const end = App.endpointPoint(wire.to);
      if (!start || !end) continue;
      const route = App.wireRoutePoints(
        start,
        end,
        wire.via,
        App.endpointExitDir(wire.from),
        App.endpointExitDir(wire.to),
        App.wireStubLengths(wire),
      );
      const nearest = App.nearestPointOnPolyline(route, stagePoint);
      if (!nearest || nearest.distance > maxDistance) continue;
      if (!best || nearest.distance < best.distance) {
        best = { wire, distance: nearest.distance, point: nearest.point };
      }
    }
    return best;
  },

  handleDiagramStageClick(event) {
    if (event.defaultPrevented) return;
    if (App.state.activeCanvasTool === 'pan') return;
    if (App.nodeHitTest(event) || event.target.closest?.('.connector-dot')) return;
    if (event.target.closest?.('.part-info-panel')) return;

    if (App.state.editMode && !App.state.wireDraft && !App.state.wireDragActive) {
      const nearest = App.nearestWireAtStage(App.pointInStage(event));
      if (nearest) {
        event.preventDefault();
        event.stopPropagation();
        if (event.ctrlKey) {
          App.insertWireBend(nearest.wire, event);
        } else {
          App.selectWire(nearest.wire.id);
        }
        return;
      }
    }

    if (
      event.target === App.el('diagram-stage') ||
      event.target === App.el('wire-layer') ||
      event.target === App.el('node-layer')
    ) {
      App.clearSelection();
    }
  },

  endpointPoint(endpoint) {
    if (!endpoint) return null;
    if (endpoint.nodeId && endpoint.connectorId) {
      return App.connectorPoint(endpoint.nodeId, endpoint.connectorId);
    }
    if (Number.isFinite(Number(endpoint.x)) && Number.isFinite(Number(endpoint.y))) {
      return App.boardToStage(App.visualBoardPoint({ x: Number(endpoint.x), y: Number(endpoint.y) }));
    }
    return null;
  },

  connectorPoint(nodeId, connectorId) {
    const boardPoint = App.connectorBoardPoint(nodeId, connectorId);
    return boardPoint ? App.boardToStage(boardPoint) : null;
  },

  connectorBoardPoint(nodeId, connectorId) {
    const node = App.findNode(nodeId);
    if (!App.isConnectableNode(node)) return null;
    const connector = App.findConnector(nodeId, connectorId);
    if (!node || !connector) return null;

    const pos = App.visualNodePosition(node);
    const nodeW = App.clampNodeWidth(node.w);
    const nodeH = App.clampNodeHeight(node.h);
    const centerX = pos.x + nodeW / 2;
    const centerY = pos.y + nodeH / 2;

    if (App.state.expandedNodeIds.has(String(node.id)) && App.primarySubdiagramForNode(node.id)) {
      const expanded = App.expandedConnectorPosition(connector);
      return {
        x: centerX - EXPANDED_PART_PREVIEW.width / 2 + expanded.x * EXPANDED_PART_PREVIEW.width,
        y: centerY - EXPANDED_PART_PREVIEW.height / 2 + expanded.y * EXPANDED_PART_PREVIEW.height,
      };
    }

    const point = App.connectorFramePoint(node, connector);
    return {
      x: pos.x + point.x,
      y: pos.y + point.y,
    };
  },

  snapViaToBoardConnectors(boardPoint) {
    const snapBoard = WIRE_CONNECTOR_SNAP_PX / (App.viewport().zoom || 1);
    let sx = boardPoint.x, sy = boardPoint.y;
    let bestDx = snapBoard, bestDy = snapBoard;
    for (const node of App.state.diagram.nodes || []) {
      for (const connector of App.nodeConnectors(node)) {
        const bp = App.connectorBoardPoint(node.id, connector.id);
        if (!bp) continue;
        const dx = Math.abs(bp.x - boardPoint.x);
        const dy = Math.abs(bp.y - boardPoint.y);
        if (dx < bestDx) { sx = bp.x; bestDx = dx; }
        if (dy < bestDy) { sy = bp.y; bestDy = dy; }
      }
    }
    return { x: sx, y: sy };
  },

  nearestConnectorAtStage(stagePoint, maxDistance = WIRE_CONNECTOR_SNAP_PX) {
    let best = null;
    for (const node of App.state.diagram.nodes || []) {
      for (const connector of App.nodeConnectors(node)) {
        const point = App.connectorPoint(node.id, connector.id);
        if (!point) continue;
        const distance = Math.hypot(point.x - stagePoint.x, point.y - stagePoint.y);
        if (distance > maxDistance) continue;
        if (!best || distance < best.distance) {
          best = {
            distance,
            nodeId: String(node.id),
            connectorId: String(connector.id),
          };
        }
      }
    }
    return best ? { nodeId: best.nodeId, connectorId: best.connectorId } : null;
  },

  pointInStage(event) {
    const rect = App.el('diagram-stage').getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  },

  startWireDrag(event, nodeId, connectorId) {
    App.state.wireDraft = { nodeId, connectorId };
    App.state.wireDragActive = true;
    App.state.draftPoint = App.pointInStage(event);
    document.body.classList.add('is-wiring');
    App.renderWires();
  },

  finishWireDrag(event) {
    const from = App.state.wireDraft;
    App.state.wireDragActive = false;
    App.state.suppressConnectorClick = true;
    document.body.classList.remove('is-wiring');
    setTimeout(() => { App.state.suppressConnectorClick = false; }, 0);
    App.state.wireDraft = null;
    App.state.draftPoint = null;
    if (!from) {
      App.renderWires();
      return;
    }

    const stagePoint = App.pointInStage(event);
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('.connector-dot');
    const snapped = target
      ? { nodeId: target.dataset.nodeId, connectorId: target.dataset.connectorId }
      : App.nearestConnectorAtStage(stagePoint);
    const to = snapped || App.stageToBoard(stagePoint);

    if (to.nodeId === from.nodeId && to.connectorId === from.connectorId) {
      App.renderWires();
      return;
    }

    App.createWire(from, to);
    App.renderDiagram();
  },

  createWire(startEndpoint, endEndpoint) {
    const wireEnds = App.orientWireEnds(startEndpoint, endEndpoint);
    const exists = App.state.diagram.wires.some((wire) => (
      JSON.stringify(wire.from) === JSON.stringify(wireEnds.from) &&
      JSON.stringify(wire.to) === JSON.stringify(wireEnds.to)
    ));

    if (!exists) {
      App.state.diagram.wires.push({
        id: App.uid('wire'),
        ...wireEnds,
        via: [],
        type: 'power',
        lineStyle: 'solid',
      });
    }
  },

  handleConnectorClick(nodeId, connectorId) {
    if (!App.state.wireDraft) {
      App.state.wireDraft = { nodeId, connectorId };
      App.state.draftPoint = App.connectorPoint(nodeId, connectorId);
      document.body.classList.add('is-wiring');
      App.toast('Select another connector to finish the wire.', 'info', 1600);
      App.renderWires();
      return;
    }

    const from = App.state.wireDraft;
    if (from.nodeId === nodeId && from.connectorId === connectorId) {
      App.state.wireDraft = null;
      App.state.draftPoint = null;
      document.body.classList.remove('is-wiring');
      App.renderDiagram();
      return;
    }

    App.createWire(from, { nodeId, connectorId });

    App.state.wireDraft = null;
    App.state.draftPoint = null;
    document.body.classList.remove('is-wiring');
    App.renderDiagram();
  },

  orientWireEnds(a, b) {
    const ca = App.findConnector(a.nodeId, a.connectorId);
    const cb = App.findConnector(b.nodeId, b.connectorId);
    if (ca?.role === 'input' && cb?.role === 'output') {
      return { from: { ...b }, to: { ...a } };
    }
    if (!a.nodeId && cb?.role === 'output') {
      return { from: { ...b }, to: { ...a } };
    }
    return { from: { ...a }, to: { ...b } };
  },

  findNode(nodeId) {
    return App.state.diagram.nodes.find((node) => node.id === String(nodeId)) || null;
  },

  findWire(wireId) {
    return App.state.diagram.wires.find((wire) => wire.id === String(wireId)) || null;
  },

  findConnector(nodeId, connectorId) {
    const node = App.findNode(nodeId);
    return node ? App.nodeConnectors(node).find((conn) => conn.id === String(connectorId)) || null : null;
  },

  findGroup(groupId) {
    if (!groupId) return null;
    return (App.state.diagram.groups || []).find((g) => g.id === String(groupId)) || null;
  },

  findGroupForNode(nodeId) {
    const id = String(nodeId);
    return (App.state.diagram.groups || []).find((g) => g.nodeIds.includes(id)) || null;
  },

  groupBounds(group) {
    const nodes = (group?.nodeIds || []).map((id) => App.findNode(id)).filter(Boolean);
    if (!nodes.length) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const node of nodes) {
      const bounds = App.nodeBounds(node);
      if (bounds.left < left) left = bounds.left;
      if (bounds.top < top) top = bounds.top;
      if (bounds.right > right) right = bounds.right;
      if (bounds.bottom > bottom) bottom = bounds.bottom;
    }
    return { left, top, right, bottom };
  },

  createGroupFromSelection() {
    if (!App.state.editMode) return;
    const ids = [...App.state.selectedNodeIds].filter((id) => App.findNode(id));
    if (ids.length < 2) {
      App.toast('Select 2 or more parts to group', 'info');
      return;
    }
    const groups = App.state.diagram.groups || (App.state.diagram.groups = []);
    for (const id of ids) {
      const existingIdx = groups.findIndex((g) => g.nodeIds.includes(id));
      if (existingIdx !== -1) {
        groups[existingIdx].nodeIds = groups[existingIdx].nodeIds.filter((nid) => nid !== id);
        if (groups[existingIdx].nodeIds.length < 2) groups.splice(existingIdx, 1);
      }
    }
    const group = { id: App.uid('group'), nodeIds: ids.map(String) };
    groups.push(group);
    App.state.selectedGroupId = group.id;
    App.markDiagramDirty?.();
    App.renderDiagram();
  },

  ungroupSelected() {
    if (!App.state.editMode) return;
    const groups = App.state.diagram.groups || [];
    let groupId = App.state.selectedGroupId;
    if (!groupId) {
      const firstSel = [...App.state.selectedNodeIds][0];
      if (firstSel) {
        const g = App.findGroupForNode(firstSel);
        if (g) groupId = g.id;
      }
    }
    if (!groupId) return;
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    groups.splice(idx, 1);
    App.state.selectedGroupId = null;
    App.markDiagramDirty?.();
    App.renderDiagram();
  },

  removeNodeFromGroups(nodeId) {
    const id = String(nodeId);
    const groups = App.state.diagram.groups || [];
    for (let i = groups.length - 1; i >= 0; i -= 1) {
      const g = groups[i];
      if (!g.nodeIds.includes(id)) continue;
      g.nodeIds = g.nodeIds.filter((n) => n !== id);
      if (g.nodeIds.length < 2) {
        if (App.state.selectedGroupId === g.id) App.state.selectedGroupId = null;
        groups.splice(i, 1);
      }
    }
  },

  startGroupDrag(event, groupId) {
    const group = App.findGroup(groupId);
    if (!group) return;
    App.state.selectedGroupId = group.id;
    App.state.selectedNodeId = null;
    App.state.selectedNodeIds = new Set(group.nodeIds);
    App.state.selectedWireId = null;
    App.state.draggingGroup = {
      groupId: group.id,
      startX: event.clientX,
      startY: event.clientY,
      nodePositions: new Map(group.nodeIds.map((id) => {
        const node = App.findNode(id);
        return [id, { x: Number(node?.x) || 0, y: Number(node?.y) || 0 }];
      })),
      moved: false,
    };
    App.renderDiagram();
    App.renderSelectionTools?.();
  },

  startNodeDrag(event, nodeId, { group = false } = {}) {
    const node = App.findNode(nodeId);
    if (!node) return;
    if (group) {
      if (!App.state.selectedNodeIds.has(String(nodeId))) {
        App.state.selectedNodeIds.add(String(nodeId));
      }
      App.state.selectedNodeId = String(nodeId);
      App.state.selectedWireId = null;
    } else {
      App.selectNode(nodeId);
    }
    const groupIds = group && App.state.selectedNodeIds.size > 1
      ? [...App.state.selectedNodeIds].filter((id) => App.findNode(id))
      : [String(nodeId)];
    App.state.draggingNode = {
      nodeId,
      groupIds,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
      groupPositions: new Map(groupIds.map((id) => {
        const item = App.findNode(id);
        return [id, { x: Number(item?.x) || 0, y: Number(item?.y) || 0 }];
      })),
    };
    App.capturePointer(event.currentTarget, event.pointerId);
  },

  startLabelDrag(event, nodeId) {
    const node = App.findNode(nodeId);
    if (!node) return;
    App.selectNode(nodeId);
    App.state.draggingLabel = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      offset: App.normalizeLabelOffset(node.labelOffset, node),
    };
    App.capturePointer(event.currentTarget, event.pointerId);
  },

  startNodeResize(event, nodeId, handle) {
    const node = App.findNode(nodeId);
    if (!node) return;
    App.selectNode(nodeId);
    const nodeW = App.clampNodeWidth(node.w);
    const nodeH = App.clampNodeHeight(node.h);
    App.state.resizingNode = {
      nodeId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: Number(node.x) || 0,
      nodeY: Number(node.y) || 0,
      nodeW,
      nodeH,
      labelOffset: App.normalizeLabelOffset(node.labelOffset, { w: nodeW, h: nodeH }),
    };
  },

  labelOffsetAfterResize(offset, oldW, oldH, newW, newH) {
    const current = App.normalizeLabelOffset(offset, { w: oldW, h: oldH });
    const oldBottom = oldH / 2 + 10;
    const oldTop = -oldH / 2 - 10;
    const oldLeft = -oldW / 2 - 10;
    const oldRight = oldW / 2 + 10;
    const next = { ...current };

    if (Math.abs(current.y - oldBottom) <= 18 && Math.abs(current.x) <= oldW / 2 + 24) {
      next.y = newH / 2 + 10;
    } else if (Math.abs(current.y - oldTop) <= 18 && Math.abs(current.x) <= oldW / 2 + 24) {
      next.y = -newH / 2 - 10;
    }

    if (Math.abs(current.x - oldLeft) <= 18 && Math.abs(current.y) <= oldH / 2 + 24) {
      next.x = -newW / 2 - 10;
    } else if (Math.abs(current.x - oldRight) <= 18 && Math.abs(current.y) <= oldH / 2 + 24) {
      next.x = newW / 2 + 10;
    }

    return App.normalizeLabelOffset(next, { w: newW, h: newH });
  },

  updateNodeResize(event) {
    const resize = App.state.resizingNode;
    if (!resize) return;
    const node = App.findNode(resize.nodeId);
    if (!node) return;

    const zoom = App.viewport().zoom || 1;
    const dx = (event.clientX - resize.startX) / zoom;
    const dy = (event.clientY - resize.startY) / zoom;
    let x = resize.nodeX;
    let y = resize.nodeY;
    let w = resize.nodeW;
    let h = resize.nodeH;

    if (resize.handle.includes('e')) w = resize.nodeW + dx;
    if (resize.handle.includes('s')) h = resize.nodeH + dy;
    if (resize.handle.includes('w')) {
      w = resize.nodeW - dx;
      x = resize.nodeX + dx;
    }
    if (resize.handle.includes('n')) {
      h = resize.nodeH - dy;
      y = resize.nodeY + dy;
    }

    const clampedW = App.clampNodeWidth(w);
    const clampedH = App.clampNodeHeight(h);
    if (resize.handle.includes('w')) x = resize.nodeX + resize.nodeW - clampedW;
    if (resize.handle.includes('n')) y = resize.nodeY + resize.nodeH - clampedH;

    node.x = Math.round(x);
    node.y = Math.round(y);
    node.w = clampedW;
    node.h = clampedH;
    node.labelOffset = App.labelOffsetAfterResize(
      resize.labelOffset,
      resize.nodeW,
      resize.nodeH,
      clampedW,
      clampedH,
    );
    App.renderDiagram();
    App.renderSelectionTools();
  },

  startPan(event) {
    const vp = App.viewport();
    App.state.panning = {
      startX: event.clientX,
      startY: event.clientY,
      startViewportX: vp.x,
      startViewportY: vp.y,
      zoom: vp.zoom,
    };
    App.el('diagram-stage').classList.add('is-panning');
  },

  zoomDiagram(event) {
    event.preventDefault();
    const vp = App.viewport();
    const stagePoint = App.pointInStage(event);
    const boardPoint = App.stageToBoard(stagePoint);
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    const nextZoom = Math.max(0.25, Math.min(3, vp.zoom * factor));

    App.state.diagram.viewport = {
      x: Math.round(stagePoint.x - boardPoint.x * nextZoom),
      y: Math.round(stagePoint.y - boardPoint.y * nextZoom),
      zoom: Number(nextZoom.toFixed(3)),
    };
    App.renderDiagram();
  },

  setDiagramZoom(nextZoom) {
    const rect = App.el('diagram-stage').getBoundingClientRect();
    const stagePoint = { x: rect.width / 2, y: rect.height / 2 };
    const boardPoint = App.stageToBoard(stagePoint);
    const zoom = Math.max(0.25, Math.min(3, Number(nextZoom) || 1));
    App.state.diagram.viewport = {
      x: Math.round(stagePoint.x - boardPoint.x * zoom),
      y: Math.round(stagePoint.y - boardPoint.y * zoom),
      zoom: Number(zoom.toFixed(3)),
    };
    App.renderDiagram();
  },

  resetDiagramView() {
    App.state.diagram.viewport = { x: 0, y: 0, zoom: 1 };
    App.renderDiagram();
  },

  fitDiagramView() {
    const stage = App.el('diagram-stage');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const pad = 80;
    const nodes = App.state.diagram.nodes || [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const pos = App.visualNodePosition(node);
      const w = App.clampNodeWidth(node.w);
      const h = App.clampNodeHeight(node.h);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }

    for (const wire of App.state.diagram.wires || []) {
      const start = App.subdiagramEndpointBoardPoint(wire.from, App.state.diagram);
      const end = App.subdiagramEndpointBoardPoint(wire.to, App.state.diagram);
      if (!start || !end) continue;
      for (const point of [start, ...App.normalizeWireBends(wire.via), end]) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    if (!isFinite(minX)) {
      App.resetDiagramView();
      return;
    }

    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const zoom = Math.max(0.25, Math.min(3, Math.min((rect.width - pad * 2) / contentW, (rect.height - pad * 2) / contentH)));
    App.state.diagram.viewport = {
      x: Math.round((rect.width - contentW * zoom) / 2 - minX * zoom),
      y: Math.round((rect.height - contentH * zoom) / 2 - minY * zoom),
      zoom: Number(zoom.toFixed(3)),
    };
    App.renderDiagram();
  },

  ensureDiagramContentVisible() {
    if (App.state.editMode) return;
    const stage = App.el('diagram-stage');
    if (!stage || !(App.state.diagram.nodes || []).length) return;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    const hasVisibleNode = [...document.querySelectorAll('.diagram-node .node-icon-frame')]
      .some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 1
          && rect.height > 1
          && rect.right > stageRect.left
          && rect.left < stageRect.right
          && rect.bottom > stageRect.top
          && rect.top < stageRect.bottom;
      });
    if (!hasVisibleNode) App.fitDiagramView();
  },

  setCanvasTool(tool) {
    App.state.activeCanvasTool = tool === 'pan' ? 'pan' : 'select';
    if (App.state.activeCanvasTool === 'pan') App.state.activeToolbarAction = null;
    App.el('diagram-stage')?.classList.toggle('is-hand-tool', App.state.activeCanvasTool === 'pan');
    if (App.state.activeCanvasTool !== 'pan') {
      App.state.panning = null;
      App.el('diagram-stage')?.classList.remove('is-panning');
    }
    App.renderToolbarState();
  },

  focusComponentLibrary() {
    App.setCanvasTool('select');
    App.clearSelection();
    App.state.activeToolbarAction = 'component';
    App.setEditorTab('diagram');
    const input = App.el('parts-search-input');
    if (input) {
      input.focus();
      input.select();
    }
    App.renderToolbarState();
  },

  renderToolbarState() {
    const toolbar = App.el('diagram-toolbar');
    if (!toolbar) return;
    const activeTool = App.state.activeCanvasTool || 'select';
    const activeToolbarAction = App.state.activeToolbarAction || null;
    App.el('canvas-tool-select')?.classList.toggle('is-active', activeTool === 'select');
    App.el('canvas-tool-pan')?.classList.toggle('is-active', activeTool === 'pan');
    for (const btn of toolbar.querySelectorAll('[data-toolbar-action], [data-basic-shape]')) {
      const shapeAction = btn.dataset.basicShape ? `shape:${btn.dataset.basicShape}` : null;
      const action = btn.dataset.toolbarAction || shapeAction;
      const isPrimaryTool = action === 'select' || action === 'pan';
      if (!isPrimaryTool) btn.classList.toggle('is-active', action === activeToolbarAction);
    }

    const zoomReadout = App.el('zoom-readout');
    if (zoomReadout) zoomReadout.textContent = `${Math.round((App.viewport().zoom || 1) * 100)}%`;

    const hasSelection = Boolean(App.state.selectedNodeId || App.state.selectedWireId || App.state.selectedNodeIds.size);
    App.el('diagram-context-tools')?.classList.toggle('hidden', !hasSelection);
    const selectedNode = App.findNode(App.state.selectedNodeId);
    const isTextBox = App.isTextBoxNode(selectedNode);
    App.el('text-format-tools')?.classList.toggle('hidden', !isTextBox);
    if (isTextBox) App.syncTextToolbar(selectedNode);
    const duplicateBtn = toolbar.querySelector('[data-toolbar-action="duplicate"]');
    if (duplicateBtn) duplicateBtn.disabled = !App.state.selectedNodeId;
  },

  syncTextToolbar(node) {
    const style = App.normalizeTextStyle(node?.textStyle);
    const family = App.el('text-font-family');
    const size = App.el('text-font-size');
    const bold = App.el('text-bold-btn');
    const italic = App.el('text-italic-btn');
    const color = App.el('text-color-input');
    if (family) family.value = style.fontFamily;
    if (size) size.value = String(style.fontSize);
    if (bold) bold.classList.toggle('is-active', style.bold);
    if (italic) italic.classList.toggle('is-active', style.italic);
    if (color) color.value = style.color || (document.body.classList.contains('theme-light') ? '#111111' : '#e2e5e3');
  },

  toolbarCenterBoardPoint() {
    const rect = App.el('diagram-stage').getBoundingClientRect();
    const jitter = (App.state._addCount++ % 7) * 22;
    const center = App.stageToBoard({ x: rect.width / 2, y: rect.height / 2 });
    return { x: Math.round(center.x + jitter), y: Math.round(center.y + jitter) };
  },

  addToolbarLine(orientation = 'horizontal', kind = '') {
    if (!App.state.editMode) return;
    App.state.activeToolbarAction = 'line-horizontal';
    const center = App.toolbarCenterBoardPoint();
    const horizontal = orientation !== 'vertical';
    const half = 96;
    const wire = {
      id: App.uid('wire'),
      from: {
        x: horizontal ? center.x - half : center.x,
        y: horizontal ? center.y : center.y - half,
      },
      to: {
        x: horizontal ? center.x + half : center.x,
        y: horizontal ? center.y : center.y + half,
      },
      via: [],
      type: 'control',
      lineStyle: 'solid',
      kind,
    };
    App.state.diagram.wires.push(wire);
    App.selectWire(wire.id);
  },

  addToolbarArrow(direction = 'right') {
    if (!App.state.editMode) return;
    App.state.activeToolbarAction = 'arrow-right';
    const center = App.toolbarCenterBoardPoint();
    const half = 96;
    const endpoints = {
      right: [{ x: center.x - half, y: center.y }, { x: center.x + half, y: center.y }],
      left: [{ x: center.x + half, y: center.y }, { x: center.x - half, y: center.y }],
      down: [{ x: center.x, y: center.y - half }, { x: center.x, y: center.y + half }],
      up: [{ x: center.x, y: center.y + half }, { x: center.x, y: center.y - half }],
    };
    const [from, to] = endpoints[direction] || endpoints.right;
    const wire = {
      id: App.uid('wire'),
      from,
      to,
      via: [],
      type: 'control',
      lineStyle: 'solid',
      kind: 'arrow',
    };
    App.state.diagram.wires.push(wire);
    App.selectWire(wire.id);
  },

  deleteSelectedDiagramItem() {
    if (!App.state.editMode) return;
    if (App.state.selectedWireId) {
      App.deleteSelectedWire();
      return;
    }
    if (App.state.selectedNodeId) App.deleteSelectedNode();
  },

  handleToolbarAction(action) {
    if (!App.state.editMode) return;
    switch (action) {
      case 'select':
        App.state.activeToolbarAction = null;
        App.setCanvasTool('select');
        App.clearSelection();
        break;
      case 'pan':
        App.state.activeToolbarAction = null;
        App.setCanvasTool(App.state.activeCanvasTool === 'pan' ? 'select' : 'pan');
        break;
      case 'component':
        App.focusComponentLibrary();
        break;
      case 'clear':
        App.setCanvasTool('select');
        App.clearSelection();
        break;
      case 'line-horizontal':
        App.setCanvasTool('select');
        App.addToolbarLine('horizontal');
        break;
      case 'line-vertical':
        App.setCanvasTool('select');
        App.addToolbarLine('vertical');
        break;
      case 'arrow-right':
        App.setCanvasTool('select');
        App.addToolbarArrow('right');
        break;
      case 'arrow-down':
        App.setCanvasTool('select');
        App.addToolbarArrow('down');
        break;
      case 'arrow-left':
        App.setCanvasTool('select');
        App.addToolbarArrow('left');
        break;
      case 'arrow-up':
        App.setCanvasTool('select');
        App.addToolbarArrow('up');
        break;
      case 'zoom-out':
        App.setDiagramZoom(App.viewport().zoom * 0.86);
        break;
      case 'zoom-in':
        App.setDiagramZoom(App.viewport().zoom * 1.16);
        break;
      case 'reset-view':
        App.resetDiagramView();
        break;
      case 'fit-view':
        App.fitDiagramView();
        break;
      case 'duplicate':
        if (App.copySelectedNode()) App.pasteCopiedNode();
        break;
      case 'delete':
        App.deleteSelectedDiagramItem();
        break;
    }
  },

  onPointerMove(event) {
    if (App.state.resizingNode) {
      App.updateNodeResize(event);
      return;
    }

    if (App.state.draggingWireEnd) {
      const drag = App.state.draggingWireEnd;
      const wire = App.findWire(drag.wireId);
      if (wire && !wire[drag.endKey]?.nodeId) {
        wire[drag.endKey] = App.stageToBoard(App.pointInStage(event));
        App.renderWires();
      }
      return;
    }

    if (App.state.draggingBend) {
      const drag = App.state.draggingBend;
      const wire = App.state.diagram.wires.find((item) => item.id === drag.wireId);
      if (wire) {
        if (drag.isSegment) {
          const vp = App.viewport();
          wire.via = drag.initVia.map(v => ({ ...v }));
          if (drag.isHorizontal) {
            const dBoard = (event.clientY - drag.startY) / vp.zoom;
            let raw = { x: drag.initVia[drag.viaIdxA >= 0 ? drag.viaIdxA : drag.viaIdxB].x, y: drag.initVia[drag.viaIdxA >= 0 ? drag.viaIdxA : drag.viaIdxB].y + dBoard };
            const snapped = App.snapViaToBoardConnectors(raw);
            const snapDy = snapped.y - raw.y;
            if (drag.viaIdxA >= 0) wire.via[drag.viaIdxA] = { x: drag.initVia[drag.viaIdxA].x, y: drag.initVia[drag.viaIdxA].y + dBoard + snapDy };
            if (drag.viaIdxB >= 0) wire.via[drag.viaIdxB] = { x: drag.initVia[drag.viaIdxB].x, y: drag.initVia[drag.viaIdxB].y + dBoard + snapDy };
          } else {
            const dBoard = (event.clientX - drag.startX) / vp.zoom;
            let raw = { x: drag.initVia[drag.viaIdxA >= 0 ? drag.viaIdxA : drag.viaIdxB].x + dBoard, y: drag.initVia[drag.viaIdxA >= 0 ? drag.viaIdxA : drag.viaIdxB].y };
            const snapped = App.snapViaToBoardConnectors(raw);
            const snapDx = snapped.x - raw.x;
            if (drag.viaIdxA >= 0) wire.via[drag.viaIdxA] = { x: drag.initVia[drag.viaIdxA].x + dBoard + snapDx, y: drag.initVia[drag.viaIdxA].y };
            if (drag.viaIdxB >= 0) wire.via[drag.viaIdxB] = { x: drag.initVia[drag.viaIdxB].x + dBoard + snapDx, y: drag.initVia[drag.viaIdxB].y };
          }
        } else {
          wire.via = App.normalizeWireBends(wire.via);
          const rawBoard = App.stageToBoard(App.pointInStage(event));
          wire.via[drag.index] = App.snapViaToBoardConnectors(rawBoard);
        }
        App.renderWires();
      }
    }

    if (App.state.draggingLabel) {
      const drag = App.state.draggingLabel;
      const node = App.findNode(drag.nodeId);
      if (node) {
        const vp = App.viewport();
        node.labelOffset = App.normalizeLabelOffset({
          x: drag.offset.x + (event.clientX - drag.startX) / vp.zoom,
          y: drag.offset.y + (event.clientY - drag.startY) / vp.zoom,
        }, node);
        const labelEl = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(node.id)}"] .node-label`);
        if (labelEl) App.positionNodeLabel(labelEl, node);
      }
    }

    if (App.state.draggingGroup) {
      const drag = App.state.draggingGroup;
      const vp = App.viewport();
      const moveX = (event.clientX - drag.startX) / vp.zoom;
      const moveY = (event.clientY - drag.startY) / vp.zoom;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true;
      for (const [id, start] of drag.nodePositions) {
        const node = App.findNode(id);
        if (!node) continue;
        node.x = Math.round(start.x + moveX);
        node.y = Math.round(start.y + moveY);
      }
      App.state.snapGuides = [];
      App.renderDiagram();
      return;
    }

    if (App.state.draggingNode) {
      const drag = App.state.draggingNode;
      const node = App.findNode(drag.nodeId);
      if (!node) return;
      const vp = App.viewport();
      const moveX = (event.clientX - drag.startX) / vp.zoom;
      const moveY = (event.clientY - drag.startY) / vp.zoom;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) App.state.didDragNode = true;
      if (Array.isArray(drag.groupIds) && drag.groupIds.length > 1) {
        for (const id of drag.groupIds) {
          const item = App.findNode(id);
          const start = drag.groupPositions?.get(id);
          if (!item || !start) continue;
          item.x = Math.round(start.x + moveX);
          item.y = Math.round(start.y + moveY);
        }
        App.state.snapGuides = [];
        App.renderDiagram();
        return;
      }
      const rawX = Math.round(drag.nodeX + (event.clientX - drag.startX) / vp.zoom);
      const rawY = Math.round(drag.nodeY + (event.clientY - drag.startY) / vp.zoom);
      const snapped = App.snapNodeToCenterlines(node, rawX, rawY);
      const constrained = App.constrainNodeForWireLabels(node, snapped.x, snapped.y);
      node.x = constrained.x;
      node.y = constrained.y;
      App.state.snapGuides = snapped.guides;
      if (App.state.expandedNodeIds.size) {
        App.renderDiagram();
      } else {
        const el = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(node.id)}"]`);
        const stagePoint = App.boardToStage(App.visualNodePosition(node));
        if (el) {
          el.style.left = `${stagePoint.x}px`;
          el.style.top = `${stagePoint.y}px`;
        }
        App.renderWires();
      }
    }

    if (App.state.panning) {
      const pan = App.state.panning;
      App.state.diagram.viewport = {
        x: Math.round(pan.startViewportX + event.clientX - pan.startX),
        y: Math.round(pan.startViewportY + event.clientY - pan.startY),
        zoom: pan.zoom,
      };
      App.renderDiagram();
    }

    if (App.state.wireDraft) {
      App.state.draftPoint = App.pointInStage(event);
      App.renderWires();
    }
  },

  onPointerUp(event) {
    const wasDraggingWire = App.state.wireDragActive && App.state.wireDraft;
    const wasDraggingGroup = !!App.state.draggingGroup;
    const wasDragging = !!(
      App.state.draggingNode ||
      App.state.draggingLabel ||
      App.state.draggingBend ||
      App.state.draggingWireEnd ||
      App.state.resizingNode ||
      App.state.panning ||
      wasDraggingGroup
    );

    if (wasDraggingWire) {
      App.finishWireDrag(event);
    }

    if (wasDraggingGroup && App.state.draggingGroup?.moved) App.markDiagramDirty?.();
    App.state.draggingNode = null;
    App.state.draggingLabel = null;
    App.state.draggingBend = null;
    App.state.draggingWireEnd = null;
    App.state.draggingGroup = null;
    App.state.resizingNode = null;
    App.state.snapGuides = [];
    App.state.panning = null;
    App.el('diagram-stage')?.classList.remove('is-panning');

    if (wasDraggingWire || wasDragging) App.renderWires();
  },

  selectNode(nodeId, { additive = false } = {}) {
    const node = App.findNode(nodeId);
    if (!node) return;
    const id = String(nodeId);
    if (additive && App.state.editMode) {
      if (App.state.selectedNodeIds.has(id) && App.state.selectedNodeIds.size > 1) {
        App.state.selectedNodeIds.delete(id);
        App.state.selectedNodeId = [...App.state.selectedNodeIds].at(-1) || null;
      } else {
        App.state.selectedNodeIds.add(id);
        App.state.selectedNodeId = id;
      }
    } else {
      App.state.selectedNodeIds = new Set([id]);
      App.state.selectedNodeId = id;
    }
    App.state.selectedWireId = null;
    App.state.editingTextNodeId = null;
    App.state.activeToolbarAction = null;
    App.state.wireDraft = null;
    App.state.draftPoint = null;
    document.body.classList.remove('is-wiring');
    App.renderDiagram();
    App.renderSelectionTools();
    App.renderPartInfoPanel(App.findNode(App.state.selectedNodeId));
    if (App.state.selectedNodeId) App.loadNodeDocs(App.state.selectedNodeId);
  },

  selectWire(wireId) {
    const wire = App.findWire(wireId);
    if (!wire) return;
    App.state.selectedWireId = String(wire.id);
    App.state.selectedNodeId = null;
    App.state.selectedNodeIds.clear();
    App.state.editingTextNodeId = null;
    App.state.activeToolbarAction = null;
    App.state.wireDraft = null;
    App.state.draftPoint = null;
    document.body.classList.remove('is-wiring');
    App.renderDiagram();
    App.renderSelectionTools();
    App.renderPartInfoPanel(null);
  },

  clearSelection() {
    App.state.selectedNodeId = null;
    App.state.selectedNodeIds.clear();
    App.state.selectedGroupId = null;
    App.state.selectedWireId = null;
    App.state.editingTextNodeId = null;
    App.state.activeToolbarAction = null;
    App.state.wireDraft = null;
    App.state.draftPoint = null;
    document.body.classList.remove('is-wiring');
    App.renderDiagram();
    App.renderSelectionTools();
    App.renderDocTree(null, []);
    App.renderPartInfoPanel(null);
  },

  renderSelectionTools() {
    App.renderToolbarState();
    const node = App.findNode(App.state.selectedNodeId);
    const wire = App.findWire(App.state.selectedWireId);

    const placeholder = App.el('properties-placeholder');
    const nodeProps = App.el('node-properties');
    const wireProps = App.el('wire-properties');
    const title = App.el('properties-section-title');

    if (node) {
      placeholder.classList.add('hidden');
      nodeProps.classList.remove('hidden');
      wireProps.classList.add('hidden');
      title.textContent = `Properties — ${node.label}`;

      const labelInput = App.el('selected-node-label');
      labelInput.value = node.label;
      labelInput.disabled = false;
      const isConnectable = App.isConnectableNode(node);
      const connectorCount = App.nodeConnectorCount(node);
      App.el('selected-node-connector-count').value = String(isConnectable ? connectorCount : MIN_CONNECTOR_COUNT);
      App.el('selected-node-connector-count').disabled = !isConnectable;
      App.el('selected-node-connector-count-readout').textContent = isConnectable ? String(connectorCount) : 'None';
      App.renderConnectorEditor(node);
      App.el('delete-selected-node-btn').disabled = false;
      App.el('clear-selection-btn').disabled = false;
      App.el('add-selected-subdiagram-btn').disabled = false;

      // Description
      const descTA = App.el('selected-node-description');
      descTA.value = node.description || '';
      descTA.oninput = () => { node.description = descTA.value; };

      // Links list
      App.renderNodeLinksEditor(node);

      // Add-link button
      App.el('node-link-add-btn').onclick = () => {
        const url = App.el('node-link-url-input').value.trim();
        if (!url) return;
        if (!node.links) node.links = [];
        node.links.push({ url, label: App.el('node-link-label-input').value.trim() });
        App.el('node-link-url-input').value = '';
        App.el('node-link-label-input').value = '';
        App.renderNodeLinksEditor(node);
        App.renderDocTree(node.label, App.state.lastNodeFiles || []);
      };

      // Documents in right panel
      App.renderPropDocList(App.state.lastNodeFiles || []);
      App.initPropDocUpload();
    } else if (wire) {
      placeholder.classList.add('hidden');
      nodeProps.classList.add('hidden');
      wireProps.classList.remove('hidden');
      title.textContent = `Properties — ${App.wireTypeLabel(wire.type)} Wire`;

      const wireTypeSelect = App.el('selected-wire-type');
      const wireStyleSelect = App.el('selected-wire-style');
      const wireColorInput = App.el('selected-wire-color');
      const wireLabelInput = App.el('selected-wire-label');
      const clearWireColorBtn = App.el('clear-wire-color-btn');
      wireTypeSelect.value = App.normalizeWireType(wire.type);
      wireTypeSelect.disabled = false;
      wireStyleSelect.value = App.normalizeWireStyle(wire.lineStyle);
      wireStyleSelect.disabled = false;
      wireColorInput.value = wire.color || App.wireTypeDefaultColor(wire.type);
      wireColorInput.disabled = false;
      if (wireLabelInput) {
        if (document.activeElement !== wireLabelInput) {
          wireLabelInput.value = String(wire.label || '');
        }
        wireLabelInput.placeholder = App.wireAutoLabel(wire) || 'Wire label';
        wireLabelInput.disabled = false;
      }
      clearWireColorBtn.disabled = !wire.color;
      App.el('delete-selected-wire-btn').disabled = false;
      App.el('wire-status').textContent = `${App.wireTypeLabel(wire.type)}, ${App.wireStyleLabel(wire.lineStyle).toLowerCase()}`;
    } else {
      placeholder.classList.remove('hidden');
      nodeProps.classList.add('hidden');
      wireProps.classList.add('hidden');
      title.textContent = 'Properties';

      // Reset disabled states for when items become selected
      ['selected-node-label',
       'selected-node-connector-count',
       'delete-selected-node-btn','clear-selection-btn','add-selected-subdiagram-btn',
       'selected-wire-type','selected-wire-style','selected-wire-color','selected-wire-label',
       'clear-wire-color-btn','delete-selected-wire-btn'].forEach((id) => {
        const el = App.el(id);
        if (el) el.disabled = true;
      });
      App.el('selected-node-connector-count-readout').textContent = String(DEFAULT_CONNECTOR_COUNT);
      const connectorList = App.el('selected-node-connectors-list');
      if (connectorList) connectorList.innerHTML = '';
    }
  },

  renderConnectorEditor(node) {
    const list = App.el('selected-node-connectors-list');
    if (!list) return;
    list.innerHTML = '';
    if (!App.isConnectableNode(node)) {
      const empty = document.createElement('div');
      empty.className = 'connector-editor-empty';
      empty.textContent = 'No connection points.';
      list.appendChild(empty);
      return;
    }
    const connectors = App.editableNodeConnectors(node);
    for (const [idx, connector] of connectors.entries()) {
      const row = document.createElement('label');
      row.className = 'connector-editor-row';

      const swatch = document.createElement('span');
      swatch.className = `connector-editor-swatch role-${connector.role || 'neutral'}`;

      const name = document.createElement('span');
      name.className = 'connector-editor-id';
      name.textContent = connector.id;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tool-input connector-editor-input';
      input.maxLength = 40;
      input.value = connector.label || '';
      input.placeholder = connector.id;
      input.addEventListener('input', (event) => {
        App.updateSelectedConnectorLabel(idx, event.target.value);
      });

      row.append(swatch, name, input);
      list.appendChild(row);
    }
  },

  renderNodeLinksEditor(node) {
    const list = App.el('selected-node-links-list');
    if (!list) return;
    list.innerHTML = '';
    const links = node?.links || [];
    if (!links.length) {
      const empty = document.createElement('div');
      empty.className = 'node-links-edit-empty';
      empty.textContent = 'No links yet.';
      list.appendChild(empty);
      return;
    }
    for (const [idx, link] of links.entries()) {
      const row = document.createElement('div');
      row.className = 'node-links-edit-row';

      const text = document.createElement('span');
      text.className = 'node-links-edit-label';
      text.textContent = link.label || link.url;
      text.title = link.url;

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'doc-file-delete';
      del.style.display = 'flex';
      del.title = 'Remove';
      del.textContent = 'x';
      del.addEventListener('click', () => {
        node.links.splice(idx, 1);
        App.renderNodeLinksEditor(node);
        App.renderDocTree(node.label, App.state.lastNodeFiles || []);
      });

      row.append(text, del);
      list.appendChild(row);
    }
  },

  renderPropDocList(files) {
    const list = App.el('prop-doc-list');
    if (!list) return;
    list.innerHTML = '';
    if (!files.length) {
      const empty = document.createElement('div');
      empty.className = 'node-links-edit-empty';
      empty.textContent = 'No documents yet.';
      list.appendChild(empty);
      return;
    }
    for (const file of files) {
      const row = document.createElement('div');
      row.className = 'prop-doc-row';

      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'prop-doc-name';
      nameBtn.title = file.filename;
      nameBtn.textContent = file.filename;
      nameBtn.addEventListener('click', () => App.openFile(file.id, file.filename, file.mime_type));

      const meta = document.createElement('span');
      meta.className = 'prop-doc-meta';
      meta.textContent = (file.category ? `${file.category} · ` : '') + App.formatBytes(file.size_bytes);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'doc-file-delete';
      del.style.display = 'flex';
      del.title = 'Delete';
      del.textContent = 'x';
      del.addEventListener('click', () => App.deleteFile(file));

      row.append(nameBtn, meta, del);
      list.appendChild(row);
    }
  },

  initPropDocUpload() {
    const btn = App.el('prop-upload-btn');
    const input = App.el('prop-file-input');
    if (!btn || !input) return;
    // Replace listeners each time by cloning
    const newBtn = btn.cloneNode(true);
    btn.replaceWith(newBtn);
    const newInput = input.cloneNode(true);
    input.replaceWith(newInput);
    newBtn.addEventListener('click', () => newInput.click());
    newInput.addEventListener('change', (e) => {
      App.uploadPropFiles(Array.from(e.target.files || []));
      newInput.value = '';
    });
  },

  async uploadPropFiles(files) {
    const nodeId = App.state.selectedNodeId;
    const category = (App.el('prop-category-input')?.value || '').trim() || null;
    if (!nodeId || !files.length) return;
    try { await App.saveDiagram({ quiet: true }); } catch { /* ignore */ }
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file, file.name);
      if (category) fd.append('category', category);
      try {
        await App.api(`/api/nodes/${encodeURIComponent(nodeId)}/files`, { method: 'POST', body: fd, form: true });
        App.toast(`Uploaded: ${file.name}`, 'success');
      } catch (err) {
        App.toast(`Upload failed (${file.name}): ${err.message}`, 'error');
      }
    }
    await App.loadNodeDocs(nodeId);
  },

  updateSelectedWireType(value) {
    const wire = App.findWire(App.state.selectedWireId);
    if (!wire) return;
    wire.type = App.normalizeWireType(value);
    wire.color = null;
    App.renderWires();
    App.renderSelectionTools();
  },

  updateSelectedWireStyle(value) {
    const wire = App.findWire(App.state.selectedWireId);
    if (!wire) return;
    wire.lineStyle = App.normalizeWireStyle(value);
    App.renderWires();
    App.renderSelectionTools();
  },

  wireTypeDefaultColor(type) {
    const map = {
      power: '#d6a84f',
      control: '#8fb7c9',
      signal: '#78c6a3',
      instrument: '#b58ad8',
      network: '#7fa2ff',
      ground: '#a5a9ad',
    };
    return map[App.normalizeWireType(type)] || '#8fb7c9';
  },

  updateSelectedWireColor(value) {
    const wire = App.findWire(App.state.selectedWireId);
    if (!wire) return;
    const normalized = App.normalizeColor(value, null);
    wire.color = normalized;
    App.renderWires();
    App.renderSelectionTools();
  },

  clearSelectedWireColor() {
    const wire = App.findWire(App.state.selectedWireId);
    if (!wire) return;
    wire.color = null;
    App.renderWires();
    App.renderSelectionTools();
  },

  updateSelectedWireLabel(value) {
    const wire = App.findWire(App.state.selectedWireId);
    if (!wire) return;
    wire.label = String(value || '').slice(0, 120);
    App.renderDiagram();
  },

  updateSelectedNodeLabel(value) {
    const node = App.findNode(App.state.selectedNodeId);
    if (!node) return;
    if (App.isTextBoxNode(node)) {
      App.updateNodeTextContent(node, value);
    } else {
      node.label = String(value || '').trim() || node.label;
    }

    const nodeEl = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(node.id)}"] .node-label`);
    if (nodeEl) nodeEl.textContent = node.label;
    if (nodeEl) App.positionNodeLabel(nodeEl, node);
    const shapeText = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(node.id)}"] .basic-shape-text`);
    if (shapeText) shapeText.textContent = node.label;
    if (App.state.selectedNodeId === node.id) App.el('doc-panel-title').textContent = node.label;
    App.renderDiagramTree();
  },

  updateSelectedNodeSize(axis, value) {
    const node = App.findNode(App.state.selectedNodeId);
    if (!node) return;
    if (axis === 'w') node.w = App.clampNodeWidth(value);
    if (axis === 'h') node.h = App.clampNodeHeight(value);
    node.labelOffset = App.normalizeLabelOffset(node.labelOffset, node);
    App.renderDiagram();
    App.renderSelectionTools();
  },

  updateSelectedNodeConnectorCount(value) {
    const node = App.findNode(App.state.selectedNodeId);
    if (!node || !App.isConnectableNode(node)) return;
    const count = App.connectorCountValue(value);
    App.replaceNodeConnectorsUniform(node, count);
    App.el('selected-node-connector-count-readout').textContent = String(count);
    App.renderDiagram();
    App.renderSelectionTools();
  },

  updateSelectedConnectorLabel(index, value) {
    const node = App.findNode(App.state.selectedNodeId);
    if (!node || !App.isConnectableNode(node)) return;
    const connectors = App.editableNodeConnectors(node);
    if (!connectors[index]) return;
    connectors[index].label = String(value || '').trim().slice(0, 40);
    App.renderDiagram();
    App.renderWires();
  },

  updateSelectedTextStyle(patch) {
    const node = App.findNode(App.state.selectedNodeId);
    if (!App.isTextBoxNode(node)) return;
    node.textStyle = App.normalizeTextStyle({ ...(node.textStyle || {}), ...patch });
    const text = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(node.id)}"] .basic-shape-text`);
    if (text) App.applyTextStyle(text, node);
    App.renderToolbarState();
  },

  deleteSelectedNode() {
    const nodeId = App.state.selectedNodeId;
    if (!nodeId) return;
    const deleteIds = new Set(App.state.selectedNodeIds.size > 1 ? App.state.selectedNodeIds : [nodeId]);
    App.state.diagram.nodes = App.state.diagram.nodes.filter((node) => !deleteIds.has(String(node.id)));
    App.state.diagram.wires = App.state.diagram.wires.filter((wire) => (
      !deleteIds.has(String(wire.from.nodeId)) && !deleteIds.has(String(wire.to.nodeId))
    ));
    for (const id of deleteIds) {
      delete App.state.docCounts[id];
      App.state.expandedNodeIds.delete(String(id));
      App.removeNodeFromGroups(id);
    }
    App.clearSelection();
    App.renderDiagramTree();
  },

  deleteSelectedWire() {
    const wireId = App.state.selectedWireId;
    if (!wireId) return;
    App.state.diagram.wires = App.state.diagram.wires.filter((wire) => wire.id !== wireId);
    App.state.selectedWireId = null;
    App.renderDiagram();
    App.renderSelectionTools();
  },

  getNodeLabel(nodeId) {
    return App.findNode(nodeId)?.label || `Icon ${nodeId}`;
  },

  getPartForNode(node) {
    if (!node?.icon?.startsWith('custom:')) return null;
    return App.customIconForKey(node.icon, node.label);
  },

  renderPartInfoPanel(node) {
    const panel = App.el('part-info-panel');
    if (!panel) return;
    panel.innerHTML = '';
    panel.classList.add('hidden');
    return;

    const part = App.getPartForNode(node);
    const partNumber = (part?.part_number || part?.partNumber || '').trim();
    const description = (part?.description || '').trim();
    const links = App.normalizeLinks(part?.links);
    const docs = part?.documents || [];
    if (!part || (!partNumber && !description && !links.length && !docs.length)) {
      panel.classList.add('hidden');
      return;
    }

    const title = document.createElement('div');
    title.className = 'part-info-title';
    title.textContent = part.name || node.label;
    panel.appendChild(title);

    if (partNumber) {
      const num = document.createElement('div');
      num.className = 'part-info-description';
      num.textContent = `Part number: ${partNumber}`;
      panel.appendChild(num);
    }

    if (description) {
      const desc = document.createElement('div');
      desc.className = 'part-info-description';
      desc.textContent = description;
      panel.appendChild(desc);
    }

    if (links.length) {
      const list = document.createElement('div');
      list.className = 'part-info-docs';
      for (const link of links) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'part-info-doc';
        btn.title = link.url;
        btn.addEventListener('click', () => window.open(link.url, '_blank', 'noopener'));
        const name = document.createElement('span');
        name.className = 'part-info-doc-name';
        name.textContent = link.label || link.url;
        const size = document.createElement('span');
        size.className = 'part-info-doc-size';
        size.textContent = 'Link';
        btn.append(name, size);
        list.appendChild(btn);
      }
      panel.appendChild(list);
    }

    if (docs.length) {
      const list = document.createElement('div');
      list.className = 'part-info-docs';
      const folders = new Map();
      for (const doc of docs) {
        const folder = doc.folder || 'Documents';
        if (!folders.has(folder)) folders.set(folder, []);
        folders.get(folder).push(doc);
      }

      for (const [folder, folderDocs] of folders.entries()) {
        const group = document.createElement('details');
        group.className = 'part-info-doc-folder';
        group.open = true;

        const header = document.createElement('summary');
        header.className = 'part-info-doc-folder-header';
        header.innerHTML = `<span>${App.esc(folder)}</span><span>${folderDocs.length}</span>`;
        group.appendChild(header);

        for (const doc of folderDocs) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'part-info-doc';
          btn.title = doc.filename;
          btn.addEventListener('click', () => App.openIconDocument(doc.id));

          const name = document.createElement('span');
          name.className = 'part-info-doc-name';
          name.textContent = doc.filename;

          const size = document.createElement('span');
          size.className = 'part-info-doc-size';
          size.textContent = App.formatBytes(doc.size_bytes);

          btn.append(name, size);
          group.appendChild(btn);
        }

        list.appendChild(group);
      }
      panel.appendChild(list);
    }

    panel.classList.remove('hidden');
  },

  openIconDocument(fileId, filename = null, mimeType = null) {
    App.openViewer(`/api/icon-documents/${fileId}`, filename || `part-reference-${fileId}`, mimeType || '');
  },

  updateDocBadge(nodeId, count) {
    App.state.docCounts[String(nodeId)] = count;
    const badge = document.querySelector(`.diagram-node[data-node-id="${CSS.escape(String(nodeId))}"] .node-doc-badge`);
    if (!badge) return;
    badge.dataset.count = String(count);
    badge.textContent = String(count);
  },

  async loadNodeDocs(nodeId) {
    try {
      const files = await App.api(`/api/nodes/${encodeURIComponent(nodeId)}/files`);
      App.state.lastNodeFiles = files;
      App.renderDocTree(App.getNodeLabel(nodeId), files);
      App.renderPropDocList(files);
      const part = App.getPartForNode(App.findNode(nodeId));
      App.updateDocBadge(nodeId, files.length + (part?.documents || []).length);
    } catch (err) {
      App.state.lastNodeFiles = [];
      const msg = err.message === 'Node not found.'
        ? 'Save the diagram before attaching documents to this icon.'
        : 'Could not load documents.';
      App.renderDocTree(App.getNodeLabel(nodeId), [], msg);
      App.renderPropDocList([]);
      if (err.message !== 'Node not found.') {
        App.toast(`Could not load documents: ${err.message}`, 'error');
      }
    }
  },

  renderDocTree(nodeLabel, files, emptyMessage = 'No documents attached yet.') {
    const tree = App.el('doc-tree');
    const title = App.el('doc-panel-title');
    tree.innerHTML = '';

    if (!nodeLabel) {
      title.textContent = 'Documents';
      tree.innerHTML = '<div class="tree-placeholder">Select an icon on the diagram to view its documents.</div>';
      return;
    }

    title.textContent = nodeLabel;
    const node = App.findNode(App.state.selectedNodeId);
    const part = App.getPartForNode(node);
    const partNumber = (part?.part_number || part?.partNumber || '').trim();
    const partDescription = App.cleanPartDescription(part?.description);
    const nodeDescription = (node?.description || '').trim();

    // --- Description section ---
    const descSection = document.createElement('div');
    descSection.className = 'node-info-section';
    const descHeader = document.createElement('div');
    descHeader.className = 'node-info-section-title';
    descHeader.textContent = 'Description';
    descSection.appendChild(descHeader);

    const descText = [
      partNumber ? `Part number: ${partNumber}` : '',
      partDescription,
      nodeDescription ? `Diagram note: ${nodeDescription}` : '',
    ].filter(Boolean).join('\n\n');
    if (descText) {
      const p = document.createElement('p');
      p.className = 'node-description-view';
      p.textContent = descText;
      descSection.appendChild(p);
    } else {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = App.state.editMode ? 'Enter description in the Properties panel →' : 'No description.';
      descSection.appendChild(empty);
    }
    tree.appendChild(descSection);

    // --- Links section ---
    const linksSection = document.createElement('div');
    linksSection.className = 'node-info-section';
    const linksHeader = document.createElement('div');
    linksHeader.className = 'node-info-section-title';
    linksHeader.textContent = 'Links';
    linksSection.appendChild(linksHeader);

    const links = App.normalizeLinks([
      ...(part?.links || []),
      ...(node?.links || []),
    ]);
    if (!links.length) {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = App.state.editMode ? 'Add links in the Properties panel →' : 'No links.';
      linksSection.appendChild(empty);
    } else {
      const linksList = document.createElement('div');
      linksList.className = 'node-links-list';
      for (const link of links) {
        const row = document.createElement('div');
        row.className = 'node-link-row';
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'node-link-anchor';
        anchor.textContent = link.label || link.url;
        anchor.title = link.url;
        row.appendChild(anchor);
        linksList.appendChild(row);
      }
      linksSection.appendChild(linksList);
    }
    tree.appendChild(linksSection);

    // --- Documents section ---
    const docsSection = document.createElement('div');
    docsSection.className = 'node-info-section';
    const docsHeader = document.createElement('div');
    docsHeader.className = 'node-info-section-title';
    docsHeader.textContent = 'Documents';
    docsSection.appendChild(docsHeader);

    const partDocs = Array.isArray(part?.documents) ? part.documents : [];
    const docGroups = new Map();
    for (const file of files) {
      const category = file.category || 'Uploaded Documents';
      if (!docGroups.has(category)) docGroups.set(category, []);
      docGroups.get(category).push({ type: 'node', file });
    }
    for (const doc of partDocs) {
      const category = doc.folder || 'Part References';
      if (!docGroups.has(category)) docGroups.set(category, []);
      docGroups.get(category).push({ type: 'part', file: doc });
    }

    if (!docGroups.size) {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = emptyMessage;
      docsSection.appendChild(empty);
    } else {
      for (const [category, categoryFiles] of docGroups.entries()) {
        const group = document.createElement('div');
        group.className = 'doc-category';
        const header = document.createElement('div');
        header.className = 'doc-category-header';
        header.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>${App.esc(category)}</span>
          <span class="doc-cat-count">${categoryFiles.length}</span>`;
        header.addEventListener('click', () => group.classList.toggle('is-collapsed'));
        const list = document.createElement('ul');
        list.className = 'doc-file-list';
        for (const item of categoryFiles) {
          list.appendChild(item.type === 'part'
            ? App.buildIconDocumentItem(item.file)
            : App.buildFileItem(item.file));
        }
        group.append(header, list);
        docsSection.appendChild(group);
      }
    }
    tree.appendChild(docsSection);
  },

  renderLibraryPartInfo(part) {
    const tree = App.el('doc-tree');
    const title = App.el('doc-panel-title');
    if (!tree || !title || !part) return;

    title.textContent = 'Part Library';
    tree.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'part-info-summary';
    const preview = document.createElement('div');
    preview.className = 'part-info-preview';
    App.renderIcon(preview, part.icon, part.name);
    const summaryMain = document.createElement('div');
    summaryMain.className = 'part-info-summary-main';
    const name = document.createElement('div');
    name.className = 'part-info-title-main';
    name.textContent = part.name || 'Unnamed part';
    const meta = document.createElement('div');
    meta.className = 'part-info-meta';
    const docCount = (part.documents || []).length;
    const linkCount = (part.links || []).length;
    meta.textContent = [
      part.partNumber ? `Part number: ${part.partNumber}` : '',
      `Folder: ${App.partGroupName(part)}`,
      part.type === 'custom' ? App.partSourceFolderName(part) : '',
      `${(part.connectors || []).length} connection points`,
      docCount ? `${docCount} documents` : '',
      linkCount ? `${linkCount} links` : '',
    ].filter(Boolean).join(' | ');
    summaryMain.append(name, meta);
    summary.append(preview, summaryMain);
    tree.appendChild(summary);

    const description = App.cleanPartDescription(part.description);
    const descSection = document.createElement('div');
    descSection.className = 'node-info-section';
    const descHeader = document.createElement('div');
    descHeader.className = 'node-info-section-title';
    descHeader.textContent = 'Description';
    descSection.appendChild(descHeader);
    if (description || part.partNumber) {
      const p = document.createElement('p');
      p.className = 'node-description-view';
      p.textContent = [
        part.partNumber ? `Part number: ${part.partNumber}` : '',
        description,
      ].filter(Boolean).join('\n\n');
      descSection.appendChild(p);
    } else {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = 'No description saved for this part.';
      descSection.appendChild(empty);
    }
    tree.appendChild(descSection);

    const linksSection = document.createElement('div');
    linksSection.className = 'node-info-section';
    const linksHeader = document.createElement('div');
    linksHeader.className = 'node-info-section-title';
    linksHeader.textContent = 'Links';
    linksSection.appendChild(linksHeader);
    const links = App.normalizeLinks(part.links || []);
    if (links.length) {
      const linksList = document.createElement('div');
      linksList.className = 'node-links-list';
      for (const link of links) {
        const row = document.createElement('div');
        row.className = 'node-link-row';
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'node-link-anchor';
        anchor.textContent = link.label || link.url;
        anchor.title = link.url;
        row.appendChild(anchor);
        linksList.appendChild(row);
      }
      linksSection.appendChild(linksList);
    } else {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = 'No links saved for this part.';
      linksSection.appendChild(empty);
    }
    tree.appendChild(linksSection);

    const docsSection = document.createElement('div');
    docsSection.className = 'node-info-section';
    const docsHeader = document.createElement('div');
    docsHeader.className = 'node-info-section-title';
    docsHeader.textContent = 'Documents';
    docsSection.appendChild(docsHeader);

    const docGroups = new Map();
    for (const doc of part.documents || []) {
      const category = doc.folder || 'Part References';
      if (!docGroups.has(category)) docGroups.set(category, []);
      docGroups.get(category).push(doc);
    }
    if (!docGroups.size) {
      const empty = document.createElement('div');
      empty.className = 'node-info-empty';
      empty.textContent = 'No documents saved for this part.';
      docsSection.appendChild(empty);
    } else {
      for (const [category, docs] of docGroups.entries()) {
        const group = document.createElement('div');
        group.className = 'doc-category';
        const header = document.createElement('div');
        header.className = 'doc-category-header';
        header.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>${App.esc(category)}</span>
          <span class="doc-cat-count">${docs.length}</span>`;
        header.addEventListener('click', () => group.classList.toggle('is-collapsed'));
        const list = document.createElement('ul');
        list.className = 'doc-file-list';
        for (const doc of docs) list.appendChild(App.buildIconDocumentItem(doc));
        group.append(header, list);
        docsSection.appendChild(group);
      }
    }
    tree.appendChild(docsSection);
  },

  buildLinkRow(node, link, idx, onRefresh) {
    const row = document.createElement('div');
    row.className = 'node-link-row';

    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'node-link-anchor';
    anchor.textContent = link.label || link.url;
    anchor.title = link.url;
    row.appendChild(anchor);

    if (App.state.editMode) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'doc-file-delete';
      del.title = 'Remove link';
      del.textContent = 'x';
      del.style.display = 'flex';
      del.addEventListener('click', (e) => {
        e.preventDefault();
        node.links.splice(idx, 1);
        onRefresh();
      });
      row.appendChild(del);
    }
    return row;
  },

  buildFileItem(file) {
    const li = document.createElement('li');
    li.className = 'doc-file-item';

    const mainRow = document.createElement('div');
    mainRow.className = 'doc-file-main-row';

    const icon = document.createElement('span');
    icon.innerHTML = file.mime_type === 'application/pdf'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

    const name = document.createElement('span');
    name.className = 'doc-file-name';
    name.textContent = file.filename;
    name.title = file.filename;

    const size = document.createElement('span');
    size.className = 'doc-file-size';
    size.textContent = App.formatBytes(file.size_bytes);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'doc-file-delete';
    del.title = 'Delete file';
    del.textContent = 'x';
    del.addEventListener('click', (event) => {
      event.stopPropagation();
      App.deleteFile(file);
    });

    mainRow.append(icon, name, size, del);
    mainRow.addEventListener('click', () => App.openFile(file.id, file.filename, file.mime_type));
    li.appendChild(mainRow);

    if (App.state.editMode) {
      const notesInput = document.createElement('input');
      notesInput.type = 'text';
      notesInput.className = 'doc-file-notes-input tool-input';
      notesInput.placeholder = 'Add a note...';
      notesInput.maxLength = 500;
      notesInput.value = file.notes || '';
      let notesTimer = null;
      notesInput.addEventListener('click', (e) => e.stopPropagation());
      notesInput.addEventListener('input', () => {
        clearTimeout(notesTimer);
        notesTimer = setTimeout(async () => {
          try {
            await App.api(`/api/files/${file.id}/notes`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notes: notesInput.value.trim() || null }),
            });
          } catch (err) {
            App.toast(`Could not save note: ${err.message}`, 'error');
          }
        }, 800);
      });
      li.appendChild(notesInput);
    } else if (file.notes) {
      const notesView = document.createElement('div');
      notesView.className = 'doc-file-notes-view';
      notesView.textContent = file.notes;
      li.appendChild(notesView);
    }

    return li;
  },

  buildIconDocumentItem(doc) {
    const li = document.createElement('li');
    li.className = 'doc-file-item';

    const mainRow = document.createElement('div');
    mainRow.className = 'doc-file-main-row';

    const icon = document.createElement('span');
    icon.innerHTML = doc.mime_type === 'application/pdf'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

    const name = document.createElement('span');
    name.className = 'doc-file-name';
    name.textContent = doc.filename;
    name.title = doc.filename;

    const size = document.createElement('span');
    size.className = 'doc-file-size';
    size.textContent = App.formatBytes(doc.size_bytes || 0);

    mainRow.append(icon, name, size);
    mainRow.addEventListener('click', () => App.openIconDocument(doc.id, doc.filename, doc.mime_type));
    li.appendChild(mainRow);
    return li;
  },

  openFile(fileId, filename, mimeType) {
    App.openViewer(`/api/files/${fileId}`, filename || `file-${fileId}`, mimeType || '');
  },

  openProjectFile(file) {
    App.openViewer(`/api/project-files/${file.id}`, file.filename, file.mime_type);
  },

  openViewer(url, filename, mimeType) {
    const panel = App.el('file-viewer');
    const title = App.el('fv-title');
    const body  = App.el('fv-body');
    const dl    = App.el('fv-download');

    title.textContent = filename;
    dl.href = url;
    dl.download = filename;
    body.innerHTML = '';

    if (mimeType === 'application/pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      body.appendChild(iframe);
    } else if (mimeType && mimeType.startsWith('image/')) {
      const wrap = document.createElement('div');
      wrap.className = 'fv-img-wrap';
      const img = document.createElement('img');
      img.src = url;
      img.alt = filename;
      wrap.appendChild(img);
      body.appendChild(wrap);
    } else if (mimeType === 'text/plain' || mimeType === 'text/html' || filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.md')) {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      body.appendChild(iframe);
    } else {
      body.innerHTML = `
        <div class="fv-unsupported">
          <div class="fv-unsupported-icon">${App.fileEmoji(mimeType)}</div>
          <div class="fv-unsupported-name">${App.esc(filename)}</div>
          <a href="${url}" download="${App.esc(filename)}" class="btn btn-accent">Download</a>
        </div>`;
    }

    panel.classList.remove('hidden');
    document.body.classList.add('has-viewer');
  },

  closeViewer() {
    App.el('file-viewer').classList.add('hidden');
    document.body.classList.remove('has-viewer');
    App.el('fv-body').innerHTML = '';
  },

  async deleteFile(file) {
    if (!confirm(`Delete "${file.filename}"?`)) return;
    try {
      await App.api(`/api/files/${file.id}`, { method: 'DELETE' });
      App.toast('File deleted.', 'success');
      await App.loadNodeDocs(App.state.selectedNodeId);
    } catch (err) {
      App.toast(`Delete failed: ${err.message}`, 'error');
    }
  },

  partFolderNames() {
    const names = new Set(['Unsorted']);
    for (const folder of App.state.partFolders || []) {
      if (folder?.name && folder.name !== 'Built In') names.add(folder.name);
    }
    for (const icon of App.state.customIcons || []) {
      names.add(icon.folder || 'Unsorted');
    }
    return [...names].sort((a, b) => {
      if (a === 'Unsorted') return -1;
      if (b === 'Unsorted') return 1;
      return a.localeCompare(b);
    });
  },

  libraryFolderNames() {
    const names = new Set(App.partFolderNames());
    names.add('Built In');
    return [...names].sort((a, b) => {
      if (a === 'Unsorted') return -1;
      if (b === 'Unsorted') return 1;
      if (a === 'Built In') return 1;
      if (b === 'Built In') return -1;
      return a.localeCompare(b);
    });
  },

  renderCreatorFolderSelect(preferred) {
    const select = App.el('creator-folder-select');
    if (!select) return;
    const current = preferred || select.value || 'Unsorted';
    select.innerHTML = '';
    for (const folder of App.partFolderNames()) {
      const option = document.createElement('option');
      option.value = folder;
      option.textContent = folder;
      select.appendChild(option);
    }
    select.value = App.partFolderNames().includes(current) ? current : 'Unsorted';
  },

  async createPartFolder() {
    const input = App.el('folder-name-input');
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }

    try {
      const folder = await App.api('/api/icon-folders', {
        method: 'POST',
        body: { name },
      });
      input.value = '';
      App.state.collapsedPartFolders.delete(folder.name);
      await App.loadFolders();
      App.renderCreatorFolderSelect(folder.name);
      App.toast(`Created folder: ${folder.name}`, 'success');
    } catch (err) {
      App.toast(`Folder create failed: ${err.message}`, 'error');
    }
  },

  allParts() {
    const builtIns = Object.entries(ICON_DEFS).map(([key, def]) => ({
      key,
      name: def.label,
      icon: key,
      connectors: DEFAULT_CONNECTORS,
      folder: 'Built In',
      description: '',
      partNumber: '',
      links: [],
      documents: [],
      type: 'builtin',
    }));

    const custom = App.state.customIcons.map((icon) => ({
      key: `custom:${icon.id}`,
      name: icon.name,
      icon: `custom:${icon.id}`,
      connectors: App.cloneConnectors(icon.connectors),
      folder: icon.folder || 'Unsorted',
      description: icon.description || '',
      partNumber: icon.part_number || '',
      links: App.normalizeLinks(icon.links),
      documents: icon.documents || [],
      type: 'custom',
    }));

    return [...custom, ...builtIns];
  },

  libraryParts() {
    return App.allParts().filter((part) => !HIDDEN_LIBRARY_GROUPS.has(App.partGroupName(part)));
  },

  getSelectedPart() {
    const parts = App.libraryParts();
    return parts.find((part) => part.key === App.state.selectedPartKey) || parts[0] || null;
  },

  partSourceFolderName(part) {
    const number = String(part?.partNumber || '').trim();
    if (number && SOURCE_FOLDER_NAMES[number]) return SOURCE_FOLDER_NAMES[number];

    const raw = [part?.folder, part?.name, number].filter(Boolean).join('_');
    return raw
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'Unsorted';
  },

  partGroupName(part) {
    if (!part) return 'Unsorted';
    if (part.type === 'builtin') return 'Built In';
    if (part.folder && part.folder !== 'Unsorted') return part.folder;
    const text = [
      part.folder,
      part.name,
      part.partNumber,
      App.partSourceFolderName(part),
    ].filter(Boolean).join(' ').toLowerCase();

    if (/(pc|ipc|controller|vision|gateway|aiis|mic-)/.test(text)) return 'Computers & Controllers';
    if (/(switch|ethernet|network|firewall|serial|router|poe)/.test(text)) return 'Network';
    if (/(power|supply|psu|24v|qs40|sdr)/.test(text)) return 'Power';
    if (/(circuit|breaker|surge|protector|arrester)/.test(text)) return 'Protection';
    if (/(fuse|fused|hesi)/.test(text)) return 'Fused Terminals';
    if (/(din|rail|end.cover|end stop|end bracket|bracket)/.test(text)) return 'DIN Rail & Hardware';
    if (/(terminal|ground|knife|disconnect|multi.level|feed.thru|feed-through)/.test(text)) return 'Terminal Blocks';
    if (/(enclosure|cabinet|box)/.test(text)) return 'Enclosures';
    return (part.folder && part.folder !== 'Unsorted') ? part.folder : 'Unsorted';
  },

  partGroupSortKey(name) {
    const idx = PART_GROUP_ORDER.indexOf(name);
    return [idx === -1 ? PART_GROUP_ORDER.length : idx, name.toLowerCase()];
  },

  sortedPartGroupEntries(groups) {
    return [...groups.entries()].sort(([a], [b]) => {
      const ak = App.partGroupSortKey(a);
      const bk = App.partGroupSortKey(b);
      return ak[0] - bk[0] || ak[1].localeCompare(bk[1]);
    });
  },

  selectLibraryPart(part, { showInfo = true } = {}) {
    if (!part) return;
    App.state.selectedPartKey = part.key;
    App.state.expandedPartFolders.add(App.partGroupName(part));
    if (showInfo) App.renderLibraryPartInfo(part);
    App.renderPartsLibrary();
  },

  renderSelectedPartCard() {
    const card = App.el('selected-part-card');
    if (!card) return;
    const part = App.getSelectedPart();
    card.innerHTML = '';
    if (!part) return;

    const inner = document.createElement('div');
    inner.className = 'selected-part-inner';

    const preview = document.createElement('div');
    preview.className = 'selected-part-preview';
    App.renderIcon(preview, part.icon, part.name);

    const main = document.createElement('div');
    main.className = 'selected-part-main';
    const kicker = document.createElement('div');
    kicker.className = 'selected-part-kicker';
    kicker.textContent = App.partGroupName(part);
    const name = document.createElement('div');
    name.className = 'selected-part-name';
    name.textContent = part.name || 'Unnamed part';
    name.title = name.textContent;
    const meta = document.createElement('div');
    meta.className = 'selected-part-meta';
    const docCount = (part.documents || []).length;
    const linkCount = (part.links || []).length;
    meta.textContent = [
      App.partSourceFolderName(part),
      part.partNumber || '',
      `${(part.connectors || []).length} points`,
      docCount ? `${docCount} docs` : '',
      linkCount ? `${linkCount} links` : '',
    ].filter(Boolean).join(' | ');
    main.append(kicker, name, meta);

    const description = App.cleanPartDescription(part.description);
    if (description) {
      const desc = document.createElement('div');
      desc.className = 'selected-part-desc';
      desc.textContent = description;
      main.appendChild(desc);
    }

    const actions = document.createElement('div');
    actions.className = 'selected-part-actions';
    const infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'btn btn-ghost btn-sm';
    infoBtn.textContent = 'Show info';
    infoBtn.addEventListener('click', () => App.renderLibraryPartInfo(part));
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-accent btn-sm';
    addBtn.textContent = 'Add part';
    addBtn.addEventListener('click', App.addSelectedPartToDiagram);
    actions.append(infoBtn, addBtn);

    inner.append(preview, main, actions);
    card.appendChild(inner);
  },

  setPartFoldersOpen(open) {
    App.state.expandedPartFolders.clear();
    if (open) for (const part of App.libraryParts()) App.state.expandedPartFolders.add(App.partGroupName(part));
    App.renderPartsLibrary();
  },

  renderPartsLibrary() {
    const library = App.el('parts-library');
    if (!library) return;
    library.innerHTML = '';
    App.renderSelectedPartCard();

    const search = App.state.partSearch.trim().toLowerCase();
    const groups = new Map();

    for (const part of App.libraryParts()) {
      const folder = App.partGroupName(part);
      const sourceFolder = App.partSourceFolderName(part);
      const haystack = [
        part.name,
        folder,
        sourceFolder,
        part.folder,
        part.partNumber,
        part.description,
        ...(part.links || []).map((link) => `${link.label || ''} ${link.url || ''}`),
        ...(part.documents || []).map((doc) => `${doc.folder || ''} ${doc.filename || ''}`),
      ].join(' ').toLowerCase();
      if (search && !haystack.includes(search)) continue;
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(part);
    }

    if (!groups.size) {
      const empty = document.createElement('div');
      empty.className = 'parts-empty';
      empty.textContent = 'No matching parts';
      library.appendChild(empty);
      return;
    }

    for (const [folder, parts] of App.sortedPartGroupEntries(groups)) {
      const representative = parts.find((part) => part.key === App.state.selectedPartKey)
        || parts.find((part) => part.type === 'custom')
        || parts[0];
      const group = document.createElement('details');
      group.className = 'part-folder';
      group.open = Boolean(search) || App.state.expandedPartFolders.has(folder);

      const header = document.createElement('summary');
      header.className = 'part-folder-header';
      const folderThumb = document.createElement('span');
      folderThumb.className = 'part-folder-thumb';
      if (representative) App.renderIcon(folderThumb, representative.icon, representative.name);
      const titleWrap = document.createElement('span');
      titleWrap.className = 'part-folder-title';
      const folderName = document.createElement('span');
      folderName.className = 'part-folder-name';
      folderName.textContent = folder;
      const folderSubtitle = document.createElement('span');
      folderSubtitle.className = 'part-folder-subtitle';
      const docTotal = parts.reduce((total, part) => total + (part.documents || []).length, 0);
      folderSubtitle.textContent = `${docTotal} docs`;
      titleWrap.append(folderName, folderSubtitle);
      const count = document.createElement('span');
      count.className = 'part-folder-count';
      count.textContent = String(parts.length);
      header.append(folderThumb, titleWrap, count);
      group.addEventListener('toggle', () => {
        if (search) return;
        if (group.open) {
          App.state.expandedPartFolders.add(folder);
        } else {
          App.state.expandedPartFolders.delete(folder);
        }
      });
      group.appendChild(header);

      const items = document.createElement('div');
      items.className = 'part-folder-items';

      if (!parts.length) {
        const empty = document.createElement('div');
        empty.className = 'parts-empty part-folder-empty';
        empty.textContent = 'No parts in folder';
        items.appendChild(empty);
      }

      for (const part of parts) {
        const cell = document.createElement('div');
        cell.role = 'button';
        cell.tabIndex = 0;
        cell.className = 'part-cell';
        cell.dataset.partKey = part.key;
        cell.draggable = true;
        cell.classList.toggle('is-selected', part.key === App.state.selectedPartKey);

        const preview = document.createElement('div');
        preview.className = 'part-cell-preview';
        App.renderIcon(preview, part.icon, part.name);

        const label = document.createElement('span');
        label.className = 'part-cell-label';
        label.textContent = part.name;

        cell.append(preview, label);
        cell.title = [
          part.name,
          part.partNumber ? `Part number: ${part.partNumber}` : '',
          `Editor folder: ${App.partGroupName(part)}`,
          part.type === 'custom' ? `Parts Library folder: ${App.partSourceFolderName(part)}` : '',
        ].filter(Boolean).join('\n');
        cell.addEventListener('click', () => {
          App.selectLibraryPart(part);
        });
        cell.addEventListener('dblclick', () => {
          App.selectLibraryPart(part, { showInfo: false });
          App.addSelectedPartToDiagram();
        });
        cell.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          App.selectLibraryPart(part);
        });
        cell.addEventListener('dragstart', (event) => {
          event.dataTransfer.effectAllowed = 'copy';
          event.dataTransfer.setData('text/plain', part.key);
          event.dataTransfer.setData('application/x-offshore-part', part.key);
        });
        if (part.type === 'custom') {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'part-delete-btn';
          del.title = `Delete ${part.name}`;
          del.textContent = 'x';
          del.addEventListener('click', (event) => App.deleteCustomPart(part, event));
          cell.appendChild(del);
        }
        items.appendChild(cell);
      }

      group.appendChild(items);
      library.appendChild(group);
    }
  },

  addSelectedPartToDiagram() {
    const part = App.getSelectedPart();
    if (!part) return;
    App.setCanvasTool('select');

    const rect = App.el('diagram-stage').getBoundingClientRect();
    const jitter = (App.state._addCount++ % 7) * 22;
    const center = App.stageToBoard({ x: rect.width / 2, y: rect.height / 2 });
    const point = {
      x: Math.round(center.x - DEFAULT_NODE_W / 2 + jitter),
      y: Math.round(center.y - DEFAULT_NODE_H / 2 + jitter),
    };
    App.addPartToDiagram(part, point);
  },

  addBasicShapeToDiagram(shapeType) {
    App.setCanvasTool('select');
    const type = ['rect', 'pill', 'circle', 'textbox'].includes(shapeType) ? shapeType : 'rect';
    const rect = App.el('diagram-stage').getBoundingClientRect();
    const jitter = (App.state._addCount++ % 7) * 22;
    const center = App.stageToBoard({ x: rect.width / 2, y: rect.height / 2 });
    const size = type === 'circle'
      ? { w: 104, h: 104 }
      : type === 'textbox'
        ? { w: 180, h: 54 }
      : type === 'pill'
        ? { w: 156, h: 68 }
        : { w: 142, h: 76 };
    const label = type === 'circle'
      ? 'Circle'
      : type === 'textbox'
        ? 'Text'
      : type === 'pill'
        ? 'Process'
        : 'Shape';
    const node = {
      id: App.uid('node'),
      label,
      icon: `shape:${type}`,
      x: Math.round(center.x - size.w / 2 + jitter),
      y: Math.round(center.y - size.h / 2 + jitter),
      w: size.w,
      h: size.h,
      labelOffset: App.defaultLabelOffset(size),
      connectors: type === 'textbox' ? [] : App.cloneConnectors(SHAPE_CONNECTORS_8),
      textStyle: type === 'textbox' ? App.normalizeTextStyle(DEFAULT_TEXT_STYLE) : App.normalizeTextStyle(),
    };
    App.state.diagram.nodes.push(node);
    App.selectNode(node.id);
    App.renderDiagramTree();
  },

  addPartToDiagram(part, boardPoint) {
    if (!part) return;
    const node = {
      id: App.uid('node'),
      label: part.name,
      icon: part.icon,
      x: Math.round(boardPoint.x),
      y: Math.round(boardPoint.y),
      w: DEFAULT_NODE_W,
      h: DEFAULT_NODE_H,
      labelOffset: App.defaultLabelOffset({ h: DEFAULT_NODE_H }),
      connectors: App.cloneConnectors(part.connectors),
    };

    App.state.diagram.nodes.push(node);
    App.selectNode(node.id);
    App.renderDiagramTree();
  },

  isTextInputTarget(target) {
    const el = target instanceof Element ? target : null;
    if (!el) return false;
    return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
  },

  serializableNodeCopy(node) {
    if (!node) return null;
    return {
      label: String(node.label || 'Part'),
      icon: String(node.icon || 'generic'),
      w: App.clampNodeWidth(node.w),
      h: App.clampNodeHeight(node.h),
      labelOffset: App.normalizeLabelOffset(node.labelOffset, node),
      connectors: App.nodeConnectors(node),
      textStyle: App.normalizeTextStyle(node.textStyle),
      description: String(node.description || ''),
      links: App.normalizeLinks(node.links),
    };
  },

  copySelectedNode() {
    const node = App.findNode(App.state.selectedNodeId);
    if (!node) return false;
    App.state.copiedNode = App.serializableNodeCopy(node);
    App.state.pasteCount = 0;
    return true;
  },

  pasteCopiedNode() {
    if (!App.state.editMode || !App.state.copiedNode) return false;
    const source = App.findNode(App.state.selectedNodeId);
    const offset = 28 * ((App.state.pasteCount % 6) + 1);
    const baseX = source ? Number(source.x) || 0 : App.stageToBoard({
      x: App.el('diagram-stage').getBoundingClientRect().width / 2,
      y: App.el('diagram-stage').getBoundingClientRect().height / 2,
    }).x - App.clampNodeWidth(App.state.copiedNode.w) / 2;
    const baseY = source ? Number(source.y) || 0 : App.stageToBoard({
      x: App.el('diagram-stage').getBoundingClientRect().width / 2,
      y: App.el('diagram-stage').getBoundingClientRect().height / 2,
    }).y - App.clampNodeHeight(App.state.copiedNode.h) / 2;
    const copy = App.state.copiedNode;
    const node = {
      id: App.uid('node'),
      label: copy.label,
      icon: copy.icon,
      x: Math.round(baseX + offset),
      y: Math.round(baseY + offset),
      w: App.clampNodeWidth(copy.w),
      h: App.clampNodeHeight(copy.h),
      labelOffset: App.normalizeLabelOffset(copy.labelOffset, copy),
      connectors: App.isTextBoxNode(copy) ? [] : App.cloneConnectors(copy.connectors),
      textStyle: App.normalizeTextStyle(copy.textStyle),
      description: copy.description || '',
      links: App.normalizeLinks(copy.links),
    };
    App.state.diagram.nodes.push(node);
    App.state.pasteCount += 1;
    App.selectNode(node.id);
    App.renderDiagramTree();
    return true;
  },

  async deleteCustomPart(part, event) {
    event?.stopPropagation();
    if (!part?.key?.startsWith('custom:')) return;
    const iconId = part.key.slice('custom:'.length);
    const uses = App.state.diagram.nodes.filter((node) => node.icon === part.icon).length;
    const warning = uses
      ? `\n\nThis part is used ${uses} time${uses === 1 ? '' : 's'} on the current diagram.`
      : '';
    if (!confirm(`Delete "${part.name}" from the parts library?${warning}\n\nThis cannot be undone.`)) return;

    try {
      await App.api(`/api/icons/${encodeURIComponent(iconId)}`, { method: 'DELETE' });
      App.state.iconImageMetrics.delete(part.key);
      App.toast(`Deleted part: ${part.name}`, 'success');
      if (App.state.selectedPartKey === part.key) {
        App.state.selectedPartKey = 'generic';
      }
      if (Number(App.state.creator.selectedIconId) === Number(iconId)) App.resetCreator();
      await App.loadIcons();
      await App.loadFolders();
      App.renderDiagram();
      App.renderPartInfoPanel(App.findNode(App.state.selectedNodeId));
    } catch (err) {
      App.toast(`Part delete failed: ${err.message}`, 'error');
    }
  },

  openPasswordModal() {
    const modal = App.el('pwd-modal');
    App.el('pwd-input').value = '';
    App.el('pwd-error').classList.add('hidden');
    modal.classList.remove('hidden');
    App.el('pwd-input').focus();
  },

  closePasswordModal() {
    App.el('pwd-modal').classList.add('hidden');
  },

  async submitPassword() {
    const pwd = App.el('pwd-input').value;
    App.el('pwd-error').classList.add('hidden');
    try {
      await App.api('/api/auth/edit', { method: 'POST', body: { password: pwd } });
      App.closePasswordModal();
      App.setEditMode(true);
    } catch {
      const input = App.el('pwd-input');
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      App.el('pwd-error').classList.remove('hidden');
    }
  },

  setEditMode(on) {
    App.state.editMode = on;
    document.body.classList.toggle('is-editing', on);

    App.el('edit-badge').classList.toggle('hidden', !on);
    App.el('save-btn').classList.toggle('hidden', !on);
    App.el('editor-panel').classList.toggle('hidden', !on);
    App.el('add-platform-btn').classList.toggle('hidden', !on);

    const label = App.el('lock-label');
    const icon = App.el('lock-icon');
    if (on) {
      label.textContent = 'Lock';
      icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>';
    } else {
      label.textContent = 'Edit Mode';
      icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
      App.state.activeCanvasTool = 'select';
      App.el('diagram-stage')?.classList.remove('is-hand-tool');
      App.state.wireDraft = null;
      App.state.draftPoint = null;
      App.state.draggingNode = null;
      App.state.draggingWireEnd = null;
      App.state.wireDragActive = false;
      App.state.selectedWireId = null;
      App.state.selectedNodeIds.clear();
      App.state.editingTextNodeId = null;
      App.state.activeToolbarAction = null;
      document.body.classList.remove('is-wiring');
    }

    App.renderDiagram();
    App.renderSelectionTools();
    App.renderDiagramTree();
    if (!on) requestAnimationFrame(() => App.ensureDiagramContentVisible());
  },

  async saveDiagram({ quiet = false } = {}) {
    const platformId = App.state.currentPlatformId;
    if (platformId == null) return;
    const endpoint = App.state.currentDiagram.type === 'sub'
      ? `/api/subdiagrams/${App.state.currentDiagram.subdiagramId}/diagram`
      : `/api/platforms/${platformId}/diagram`;
    const drawflowJson = App.exportDiagram();
    const saved = await App.api(endpoint, {
      method: 'PUT',
      body: { drawflow_json: drawflowJson },
    });
    if (App.state.currentDiagram.type === 'sub') {
      App.state.expandedDiagramCache.set(
        String(App.state.currentDiagram.subdiagramId),
        App.normalizeDiagram(drawflowJson),
      );
    }
    await App.loadPlatformTree();
    if (!quiet) App.toast('Diagram saved.', 'success');
    return saved;
  },

  setEditorTab(tabName) {
    for (const tab of document.querySelectorAll('.editor-tab')) {
      tab.classList.toggle('is-active', tab.dataset.editorTab === tabName);
    }
    App.el('diagram-tools-tab').classList.toggle('hidden', tabName !== 'diagram');
    App.el('creator-tools-tab').classList.toggle('hidden', tabName !== 'creator');
    if (tabName === 'creator') App.renderCreatorPartsList();
  },

  initCreator() {
    App.el('creator-new-btn').addEventListener('click', App.resetCreator);
    App.el('creator-close-btn').addEventListener('click', () => App.setEditorTab('diagram'));
    App.el('creator-file-btn').addEventListener('click', () => App.el('creator-file-input').click());
    App.el('creator-file-input').addEventListener('change', App.onCreatorFileChange);
    App.el('creator-preview-img').addEventListener('load', App.updateCreatorImageMetricsFromElement);
    App.el('creator-docs-btn').addEventListener('click', () => App.el('creator-docs-input').click());
    App.el('creator-docs-input').addEventListener('change', App.onCreatorDocsChange);
    App.el('creator-images-btn').addEventListener('click', () => App.el('creator-images-input').click());
    App.el('creator-images-input').addEventListener('change', App.onCreatorImagesChange);
    App.el('creator-link-add-btn').addEventListener('click', App.addCreatorLink);
    App.el('creator-part-search-input').addEventListener('input', (event) => {
      App.state.creatorPartSearch = event.target.value;
      App.renderCreatorPartsList();
    });
    App.el('creator-doc-folder-btn').addEventListener('click', App.createCreatorDocFolder);
    App.el('creator-doc-folder-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') App.createCreatorDocFolder();
    });
    App.el('creator-doc-folder-select').addEventListener('change', (event) => {
      App.state.creator.selectedDocFolder = event.target.value || 'Documents';
    });
    App.el('creator-save-btn').addEventListener('click', App.saveCreatorPart);
    App.initCreatorCanvas();
    App.initCreatorDotControls();
  },

  onCreatorFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!App.isSupportedPartImageFile(file)) {
      App.toast('Part icons must be PNG, JPG, WEBP, or SVG files.', 'error');
      event.target.value = '';
      return;
    }

    if (App.state.creator.objectUrl) URL.revokeObjectURL(App.state.creator.objectUrl);
    App.state.creator.file = file;
    App.state.creator.objectUrl = URL.createObjectURL(file);
    App.state.creator.imageUrl = null;
    App.state.creator.imageMetrics = null;
    App.state.creator.imageTransform = { tx: 0, ty: 0, scale: 1, rotation: 0 };
    App.el('creator-file-name').textContent = file.name;
    if (!App.el('creator-name-input').value.trim()) {
      App.el('creator-name-input').value = file.name.replace(/\.[^.]+$/, '');
    }
    App.renderCreator();
    App.renderCreatorDotsList();
  },

  isSupportedPartImageFile(file) {
    const name = String(file?.name || '').toLowerCase();
    const type = String(file?.type || '').toLowerCase();
    return (
      ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(type) ||
      ['.png', '.jpg', '.jpeg', '.webp', '.svg'].some((ext) => name.endsWith(ext))
    );
  },

  onCreatorDocsChange(event) {
    const files = Array.from(event.target.files || []);
    const folder = App.state.creator.selectedDocFolder || 'Documents';
    for (const file of files) {
      App.state.creator.documents.push({
        id: App.uid('doc'),
        file,
        folder,
      });
    }
    event.target.value = '';
    App.renderCreatorDocs();
  },

  onCreatorImagesChange(event) {
    const files = Array.from(event.target.files || []);
    const previous = App.state.creator.selectedDocFolder;
    App.state.creator.selectedDocFolder = 'Images';
    if (!App.state.creator.docFolders.includes('Images')) App.state.creator.docFolders.push('Images');
    for (const file of files) {
      App.state.creator.documents.push({
        id: App.uid('doc'),
        file,
        folder: 'Images',
      });
    }
    App.state.creator.selectedDocFolder = previous || 'Images';
    event.target.value = '';
    App.renderCreatorDocFolderSelect();
    App.renderCreatorDocs();
  },

  addCreatorLink() {
    const urlInput = App.el('creator-link-url-input');
    const labelInput = App.el('creator-link-label-input');
    const url = urlInput.value.trim();
    if (!url) {
      urlInput.focus();
      return;
    }
    App.state.creator.links.push({
      url,
      label: labelInput.value.trim(),
    });
    urlInput.value = '';
    labelInput.value = '';
    App.renderCreatorLinks();
  },

  renderCreatorLinks() {
    const list = App.el('creator-links-list');
    if (!list) return;
    list.innerHTML = '';
    const links = App.state.creator.links || [];
    if (!links.length) {
      const empty = document.createElement('div');
      empty.className = 'node-links-edit-empty';
      empty.textContent = 'No links attached.';
      list.appendChild(empty);
      return;
    }
    links.forEach((link, idx) => {
      const row = document.createElement('div');
      row.className = 'node-links-edit-row';
      const text = document.createElement('span');
      text.className = 'node-links-edit-label';
      text.textContent = link.label || link.url;
      text.title = link.url;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'doc-file-delete';
      remove.style.display = 'flex';
      remove.title = 'Remove link';
      remove.textContent = 'x';
      remove.addEventListener('click', () => {
        App.state.creator.links.splice(idx, 1);
        App.renderCreatorLinks();
      });
      row.append(text, remove);
      list.appendChild(row);
    });
  },

  creatorDocFolderNames() {
    const names = new Set(['Documents']);
    const creator = App.state.creator;
    for (const folder of creator.docFolders || []) names.add(folder || 'Documents');
    for (const doc of creator.documents || []) names.add(doc.folder || 'Documents');
    for (const doc of creator.existingDocuments || []) names.add(doc.folder || 'Documents');
    return [...names].sort((a, b) => {
      if (a === 'Documents') return -1;
      if (b === 'Documents') return 1;
      return a.localeCompare(b);
    });
  },

  renderCreatorDocFolderSelect() {
    const select = App.el('creator-doc-folder-select');
    if (!select) return;
    const current = App.state.creator.selectedDocFolder || select.value || 'Documents';
    select.innerHTML = '';
    for (const folder of App.creatorDocFolderNames()) {
      const option = document.createElement('option');
      option.value = folder;
      option.textContent = folder;
      select.appendChild(option);
    }
    const next = App.creatorDocFolderNames().includes(current) ? current : 'Documents';
    select.value = next;
    App.state.creator.selectedDocFolder = next;
  },

  createCreatorDocFolder() {
    const input = App.el('creator-doc-folder-input');
    const name = input.value.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!name) {
      input.focus();
      return;
    }
    if (!App.state.creator.docFolders.includes(name)) {
      App.state.creator.docFolders.push(name);
    }
    App.state.creator.selectedDocFolder = name;
    App.state.creator.collapsedDocFolders.delete(name);
    input.value = '';
    App.renderCreatorDocFolderSelect();
    App.renderCreatorDocs();
  },

  updateCreatorDocFolder(docId, folder) {
    const doc = App.state.creator.documents.find((item) => item.id === docId);
    if (!doc) return;
    doc.folder = folder || 'Documents';
    App.renderCreatorDocFolderSelect();
    App.renderCreatorDocs();
  },

  removeCreatorDoc(docId) {
    App.state.creator.documents = App.state.creator.documents.filter((doc) => doc.id !== docId);
    App.renderCreatorDocs();
  },

  async deleteCreatorExistingDoc(doc) {
    if (!confirm(`Delete reference "${doc.filename}"?`)) return;
    try {
      await App.api(`/api/icon-documents/${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      App.state.creator.existingDocuments = App.state.creator.existingDocuments.filter((item) => item.id !== doc.id);
      await App.loadIcons();
      App.renderCreatorDocs();
      App.toast('Reference deleted.', 'success');
    } catch (err) {
      App.toast(`Reference delete failed: ${err.message}`, 'error');
    }
  },

  renderCreatorDocs() {
    const list = App.el('creator-docs-list');
    const docs = App.state.creator.documents || [];
    const existingDocs = App.state.creator.existingDocuments || [];
    list.innerHTML = '';
    App.renderCreatorDocFolderSelect();
    const folders = App.creatorDocFolderNames();

    if (!docs.length && !existingDocs.length && folders.length === 1) {
      const empty = document.createElement('div');
      empty.className = 'creator-doc-empty';
      empty.textContent = 'No references attached';
      list.appendChild(empty);
      return;
    }

    for (const folder of folders) {
      const folderDocs = docs.filter((doc) => (doc.folder || 'Documents') === folder);
      const folderExistingDocs = existingDocs.filter((doc) => (doc.folder || 'Documents') === folder);

      const group = document.createElement('details');
      group.className = 'creator-doc-folder';
      group.open = !App.state.creator.collapsedDocFolders.has(folder);

      const header = document.createElement('summary');
      header.className = 'creator-doc-folder-header';
      header.innerHTML = `<span>${App.esc(folder)}</span><span>${folderDocs.length + folderExistingDocs.length}</span>`;
      group.addEventListener('toggle', () => {
        if (group.open) {
          App.state.creator.collapsedDocFolders.delete(folder);
        } else {
          App.state.creator.collapsedDocFolders.add(folder);
        }
      });
      group.appendChild(header);

      const rows = document.createElement('div');
      rows.className = 'creator-doc-folder-files';

      if (!folderDocs.length && !folderExistingDocs.length) {
        const empty = document.createElement('div');
        empty.className = 'creator-doc-empty';
        empty.textContent = 'No references';
        rows.appendChild(empty);
      }

      for (const doc of folderExistingDocs) {
        const row = document.createElement('div');
        row.className = 'creator-doc-row';
        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'creator-doc-open';
        name.textContent = doc.filename;
        name.title = doc.filename;
        name.addEventListener('click', () => App.openIconDocument(doc.id));
        const size = document.createElement('span');
        size.textContent = App.formatBytes(doc.size_bytes || 0);
        const tag = document.createElement('span');
        tag.className = 'creator-doc-saved-tag';
        tag.textContent = 'Saved';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'creator-doc-remove';
        remove.title = `Delete ${doc.filename}`;
        remove.textContent = 'x';
        remove.addEventListener('click', () => App.deleteCreatorExistingDoc(doc));
        row.append(name, size, tag, remove);
        rows.appendChild(row);
      }

      for (const doc of folderDocs) {
        const file = doc.file;
        const row = document.createElement('div');
        row.className = 'creator-doc-row';
        const name = document.createElement('span');
        name.textContent = file.name;
        const size = document.createElement('span');
        size.textContent = App.formatBytes(file.size);
        const move = document.createElement('select');
        move.className = 'creator-doc-folder-select';
        for (const optionFolder of folders) {
          const option = document.createElement('option');
          option.value = optionFolder;
          option.textContent = optionFolder;
          move.appendChild(option);
        }
        move.value = folder;
        move.addEventListener('change', (event) => App.updateCreatorDocFolder(doc.id, event.target.value));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'creator-doc-remove';
        remove.title = `Remove ${file.name}`;
        remove.textContent = 'x';
        remove.addEventListener('click', () => App.removeCreatorDoc(doc.id));

        row.append(name, size, move, remove);
        rows.appendChild(row);
      }

      group.appendChild(rows);
      list.appendChild(group);
    }
  },

  renderCreator() {
    const creator = App.state.creator;
    const src = creator.objectUrl || creator.imageUrl;
    const wrap = App.el('creator-img-wrap');
    const hint = App.el('creator-canvas-hint');
    const img = App.el('creator-preview-img');
    if (src) {
      if (img.getAttribute('src') !== src) {
        App.state.creator.imageMetrics = null;
        img.src = src;
      } else if (!App.state.creator.imageMetrics && img.complete && img.naturalWidth) {
        App.updateCreatorImageMetricsFromElement();
      }
      wrap.hidden = false;
      App.applyCreatorTransform();
    } else {
      img.removeAttribute('src');
      App.state.creator.imageMetrics = null;
      wrap.hidden = true;
    }
    if (hint) hint.hidden = !!src;
    App.renderCreatorDots();
  },

  applyCreatorTransform() {
    const wrap = App.el('creator-img-wrap');
    if (!wrap) return;
    const { tx, ty, scale, rotation } = App.state.creator.imageTransform;
    wrap.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(${scale})`;
  },

  updateCreatorImageMetricsFromElement() {
    const img = App.el('creator-preview-img');
    if (!img?.naturalWidth || !img?.naturalHeight) return;
    const metrics = App.imageMetricsFromLoadedImage(img);
    App.state.creator.imageMetrics = metrics;
    if (App.state.creator.selectedIconId) {
      App.state.iconImageMetrics.set(`custom:${App.state.creator.selectedIconId}`, metrics);
    }
    App.renderCreatorDots();
  },

  creatorConnectorRect() {
    const wrap = App.el('creator-img-wrap');
    const w = Math.max(1, wrap?.offsetWidth || 1);
    const h = Math.max(1, wrap?.offsetHeight || 1);
    return App.containedImageContentRect(w, h, App.state.creator.imageMetrics);
  },

  positionCreatorDotElement(el, dot) {
    const rect = App.creatorConnectorRect();
    el.style.left = `${rect.x + App.clamp01(dot.x) * rect.w}px`;
    el.style.top = `${rect.y + App.clamp01(dot.y) * rect.h}px`;
  },

  initCreatorCanvas() {
    const preview = App.el('creator-preview');
    const wrap = App.el('creator-img-wrap');

    wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.creator-handle') || e.target.closest('.creator-dot')) return;
      if (App.state.creator.addingDot) return;
      e.preventDefault();
      e.stopPropagation();
      App.startCreatorImgDrag(e);
    });

    for (const handle of wrap.querySelectorAll('.creator-handle')) {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = handle.dataset.handle;
        if (type === 'rot') App.startCreatorRotate(e, handle);
        else App.startCreatorResize(e, handle);
      });
    }

    preview.addEventListener('click', (e) => {
      if (!App.state.creator.addingDot) return;
      if (e.target.closest('.creator-dot')) return;
      const frac = App.screenToLayerFraction(e.clientX, e.clientY);
      App.addCreatorDotAtFraction(frac.x, frac.y);
      App.state.creator.addingDot = false;
      preview.classList.remove('is-adding-dot');
      App.el('creator-add-dot-btn').textContent = '+ Add';
    });
  },

  initCreatorDotControls() {
    App.el('creator-add-dot-btn').addEventListener('click', () => {
      const src = App.state.creator.objectUrl || App.state.creator.imageUrl;
      if (!src) { App.toast('Load a PNG first.', 'warn'); return; }
      App.state.creator.addingDot = !App.state.creator.addingDot;
      App.el('creator-preview').classList.toggle('is-adding-dot', App.state.creator.addingDot);
      App.el('creator-add-dot-btn').textContent = App.state.creator.addingDot ? '✕ Cancel' : '+ Add';
    });

    App.el('creator-dot-delete-btn').addEventListener('click', App.deleteActiveCreatorDot);

    App.el('creator-dot-reset-btn').addEventListener('click', () => {
      if (!confirm('Reset connection dots to defaults?')) return;
      App.state.creator.connectors = DEFAULT_CONNECTORS.map((c) => ({ ...c }));
      App.state.creator.activeConnectorId = null;
      App.el('creator-dot-props').classList.add('hidden');
      App.el('creator-dot-delete-btn').disabled = true;
      App.renderCreatorDots();
      App.renderCreatorDotsList();
    });

    App.el('creator-dot-label').addEventListener('input', App.updateActiveCreatorDot);
    App.el('creator-dot-role').addEventListener('change', App.updateActiveCreatorDot);
    App.el('creator-dot-color').addEventListener('input', App.updateActiveCreatorDot);
    App.el('creator-dot-size').addEventListener('input', App.updateActiveCreatorDot);
  },

  screenToLayerFraction(clientX, clientY) {
    const wrap = App.el('creator-img-wrap');
    const style = window.getComputedStyle(wrap);
    const matrix = new DOMMatrix(style.transform);
    const inverse = matrix.inverse();
    const rect = wrap.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const local = inverse.transformPoint(new DOMPoint(clientX - centerX, clientY - centerY));
    const nw = wrap.offsetWidth;
    const nh = wrap.offsetHeight;
    const connectorRect = App.creatorConnectorRect();
    const localX = local.x + nw / 2;
    const localY = local.y + nh / 2;
    return {
      x: Math.max(0, Math.min(1, (localX - connectorRect.x) / connectorRect.w)),
      y: Math.max(0, Math.min(1, (localY - connectorRect.y) / connectorRect.h)),
    };
  },

  startCreatorImgDrag(startEvent) {
    const wrap = App.el('creator-img-wrap');
    wrap.setPointerCapture(startEvent.pointerId);
    const sx = startEvent.clientX;
    const sy = startEvent.clientY;
    const initTx = App.state.creator.imageTransform.tx;
    const initTy = App.state.creator.imageTransform.ty;
    const onMove = (e) => {
      App.state.creator.imageTransform.tx = initTx + (e.clientX - sx);
      App.state.creator.imageTransform.ty = initTy + (e.clientY - sy);
      App.applyCreatorTransform();
    };
    const onUp = () => {
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    };
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  },

  startCreatorResize(startEvent, handle) {
    handle.setPointerCapture(startEvent.pointerId);
    const wrap = App.el('creator-img-wrap');
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const initDist = Math.hypot(startEvent.clientX - cx, startEvent.clientY - cy) || 1;
    const initScale = App.state.creator.imageTransform.scale;
    const onMove = (e) => {
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      App.state.creator.imageTransform.scale = Math.max(0.05, Math.min(8, initScale * (dist / initDist)));
      App.applyCreatorTransform();
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  },

  startCreatorRotate(startEvent, handle) {
    handle.setPointerCapture(startEvent.pointerId);
    const wrap = App.el('creator-img-wrap');
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const initAngle = Math.atan2(startEvent.clientY - cy, startEvent.clientX - cx);
    const initRot = App.state.creator.imageTransform.rotation;
    const onMove = (e) => {
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      App.state.creator.imageTransform.rotation = (initRot + (angle - initAngle) * (180 / Math.PI)) % 360;
      App.applyCreatorTransform();
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  },

  renderCreatorDots() {
    const layer = App.el('creator-dot-layer');
    if (!layer) return;
    layer.innerHTML = '';
    for (const dot of App.state.creator.connectors || []) {
      const isActive = dot.id === App.state.creator.activeConnectorId;
      const size = Math.max(4, dot.size || 8);
      const el = document.createElement('div');
      el.className = `creator-dot role-${dot.role || 'neutral'}${isActive ? ' is-active' : ''}`;
      App.positionCreatorDotElement(el, dot);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.marginLeft = `-${size / 2}px`;
      el.style.marginTop = `-${size / 2}px`;
      el.style.borderColor = dot.color || '';
      if (isActive) el.style.background = dot.color || '';
      el.style.touchAction = 'none';
      el.dataset.dotId = dot.id;
      if (dot.label) {
        const lbl = document.createElement('span');
        lbl.className = 'creator-dot-label';
        lbl.textContent = dot.label;
        el.appendChild(lbl);
      }
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        App.selectCreatorDot(dot.id);
        App.startCreatorDotDrag(e, dot.id, el);
      });
      layer.appendChild(el);
    }
  },

  renderCreatorDotsList() {
    const list = App.el('creator-dots-list');
    if (!list) return;
    list.innerHTML = '';
    for (const dot of App.state.creator.connectors || []) {
      const isActive = dot.id === App.state.creator.activeConnectorId;
      const row = document.createElement('div');
      row.className = `creator-dot-list-row${isActive ? ' is-active' : ''}`;
      const indicator = document.createElement('span');
      indicator.className = 'creator-dot-list-dot';
      indicator.style.borderColor = dot.color || 'var(--border-2)';
      indicator.style.background = isActive ? (dot.color || 'var(--accent)') : 'transparent';
      const name = document.createElement('span');
      name.className = 'creator-dot-list-name';
      name.textContent = dot.label || dot.id;
      const role = document.createElement('span');
      role.className = 'creator-dot-list-role';
      role.textContent = dot.role || 'neutral';
      row.append(indicator, name, role);
      row.addEventListener('click', () => App.selectCreatorDot(dot.id));
      list.appendChild(row);
    }
  },

  selectCreatorDot(id) {
    App.state.creator.activeConnectorId = id;
    App.state.creator.addingDot = false;
    App.el('creator-preview').classList.remove('is-adding-dot');
    App.el('creator-add-dot-btn').textContent = '+ Add';
    const dot = (App.state.creator.connectors || []).find((c) => c.id === id);
    if (dot) {
      App.el('creator-dot-label').value = dot.label || '';
      App.el('creator-dot-role').value = dot.role || 'neutral';
      App.el('creator-dot-color').value = dot.color || '#7ea1c4';
      App.el('creator-dot-size').value = dot.size || 8;
      App.el('creator-dot-props').classList.remove('hidden');
      App.el('creator-dot-delete-btn').disabled = false;
    }
    App.renderCreatorDots();
    App.renderCreatorDotsList();
  },

  updateActiveCreatorDot() {
    const id = App.state.creator.activeConnectorId;
    if (!id) return;
    const dot = (App.state.creator.connectors || []).find((c) => c.id === id);
    if (!dot) return;
    dot.label = App.el('creator-dot-label').value;
    dot.role = App.el('creator-dot-role').value;
    dot.color = App.el('creator-dot-color').value;
    dot.size = Math.max(4, Math.min(24, parseInt(App.el('creator-dot-size').value, 10) || 8));
    App.renderCreatorDots();
    App.renderCreatorDotsList();
  },

  deleteActiveCreatorDot() {
    const id = App.state.creator.activeConnectorId;
    if (!id) return;
    App.state.creator.connectors = (App.state.creator.connectors || []).filter((c) => c.id !== id);
    App.state.creator.activeConnectorId = null;
    App.el('creator-dot-props').classList.add('hidden');
    App.el('creator-dot-delete-btn').disabled = true;
    App.renderCreatorDots();
    App.renderCreatorDotsList();
  },

  addCreatorDotAtFraction(x, y) {
    const id = App.uid('dot');
    const dot = { id, x: App.clamp01(x), y: App.clamp01(y), role: 'neutral', label: '', size: 5, color: '#7ea1c4' };
    if (!Array.isArray(App.state.creator.connectors)) App.state.creator.connectors = [];
    App.state.creator.connectors.push(dot);
    App.selectCreatorDot(id);
  },

  startCreatorDotDrag(startEvent, dotId, dotEl) {
    dotEl.setPointerCapture(startEvent.pointerId);
    const onMove = (e) => {
      const frac = App.screenToLayerFraction(e.clientX, e.clientY);
      const dot = (App.state.creator.connectors || []).find((c) => c.id === dotId);
      if (dot) {
        dot.x = frac.x;
        dot.y = frac.y;
        App.positionCreatorDotElement(dotEl, dot);
      }
    };
    const onUp = () => {
      dotEl.removeEventListener('pointermove', onMove);
      dotEl.removeEventListener('pointerup', onUp);
    };
    dotEl.addEventListener('pointermove', onMove);
    dotEl.addEventListener('pointerup', onUp);
  },

  populateCreatorFromIcon(icon, { keepPending = false } = {}) {
    if (!icon) return;
    if (App.state.creator.objectUrl) URL.revokeObjectURL(App.state.creator.objectUrl);
    const pendingDocs = keepPending ? App.state.creator.documents : [];
    App.state.creator = {
      ...App.state.creator,
      selectedIconId: icon.id,
      file: null,
      objectUrl: null,
      imageUrl: App.customIconSrc(`custom:${icon.id}`),
      documents: pendingDocs,
      existingDocuments: icon.documents || [],
      docFolders: ['Documents', 'Images'],
      selectedDocFolder: App.state.creator.selectedDocFolder || 'Documents',
      collapsedDocFolders: App.state.creator.collapsedDocFolders || new Set(),
      links: App.normalizeLinks(icon.links),
      connectors: App.cloneConnectors(icon.connectors),
      activeConnectorId: null,
      addingDot: false,
      imageTransform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
      imageMetrics: App.ensureIconImageMetrics(`custom:${icon.id}`),
    };
    for (const doc of icon.documents || []) {
      const folder = doc.folder || 'Documents';
      if (!App.state.creator.docFolders.includes(folder)) App.state.creator.docFolders.push(folder);
    }
    App.el('creator-file-input').value = '';
    App.el('creator-docs-input').value = '';
    App.el('creator-images-input').value = '';
    App.el('creator-name-input').value = icon.name || '';
    App.el('creator-part-number-input').value = icon.part_number || '';
    App.renderCreatorFolderSelect(icon.folder || 'Unsorted');
    App.el('creator-description-input').value = icon.description || '';
    App.el('creator-file-name').textContent = icon.filename ? `Current PNG: ${icon.filename}` : 'Current PNG loaded';
    App.el('creator-link-url-input').value = '';
    App.el('creator-link-label-input').value = '';
    App.renderCreator();
    App.renderCreatorLinks();
    App.renderCreatorDocFolderSelect();
    App.renderCreatorDocs();
    App.renderCreatorDotsList();
    App.renderCreatorPartsList();
  },

  renderCreatorPartsList() {
    const list = App.el('creator-parts-list');
    if (!list) return;
    list.innerHTML = '';
    const search = App.state.creatorPartSearch.trim().toLowerCase();
    const icons = [...(App.state.customIcons || [])]
      .filter((icon) => {
        const haystack = `${icon.name} ${icon.part_number || ''} ${icon.folder || ''}`.toLowerCase();
        return !search || haystack.includes(search);
      })
      .sort((a, b) => (a.folder || '').localeCompare(b.folder || '') || a.name.localeCompare(b.name));

    if (!icons.length) {
      const empty = document.createElement('div');
      empty.className = 'creator-doc-empty';
      empty.textContent = search ? 'No matching parts' : 'No custom parts saved yet';
      list.appendChild(empty);
      return;
    }

    for (const icon of icons) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'creator-part-row';
      row.classList.toggle('is-active', Number(icon.id) === Number(App.state.creator.selectedIconId));

      const preview = document.createElement('span');
      preview.className = 'creator-part-preview';
      const img = document.createElement('img');
      img.src = App.customIconSrc(`custom:${icon.id}`);
      img.alt = '';
      preview.appendChild(img);

      const text = document.createElement('span');
      text.className = 'creator-part-text';
      const name = document.createElement('span');
      name.className = 'creator-part-name';
      name.textContent = icon.name;
      const meta = document.createElement('span');
      meta.className = 'creator-part-meta';
      const refs = (icon.documents || []).length;
      meta.textContent = `${icon.part_number || 'No part number'} - ${refs} refs`;
      text.append(name, meta);

      row.append(preview, text);
      row.addEventListener('click', () => App.populateCreatorFromIcon(icon));
      list.appendChild(row);
    }
  },

  async saveCreatorPart() {
    const name = App.el('creator-name-input').value.trim();
    const creator = App.state.creator;
    if (!name) {
      App.el('creator-name-input').focus();
      return;
    }
    if (!creator.file && !creator.selectedIconId) {
      App.toast('Choose a PNG first.', 'warn');
      return;
    }

    const fd = new FormData();
    fd.append('name', name);
    if (creator.file) fd.append('file', creator.file, creator.file.name);
    fd.append('connectors_json', JSON.stringify(App.cloneConnectors(creator.connectors)));
    fd.append('folder', App.el('creator-folder-select').value || 'Unsorted');
    fd.append('part_number', App.el('creator-part-number-input').value.trim());
    fd.append('description', App.el('creator-description-input').value.trim());
    fd.append('links_json', JSON.stringify(App.normalizeLinks(creator.links)));
    for (const doc of creator.documents || []) {
      fd.append('documents', doc.file, doc.file.name);
      fd.append('document_folders', doc.folder || 'Documents');
    }

    try {
      const icon = creator.selectedIconId
        ? await App.api(`/api/icons/${encodeURIComponent(creator.selectedIconId)}`, { method: 'PUT', body: fd, form: true })
        : await App.api('/api/icons', { method: 'POST', body: fd, form: true });
      App.state.iconImageMetrics.delete(`custom:${icon.id}`);
      App.toast(`Saved part: ${icon.name}`, 'success');
      await App.loadIcons();
      App.cascadeIconRenameInDiagram(`custom:${icon.id}`, icon.name);
      App.state.selectedPartKey = `custom:${icon.id}`;
      App.populateCreatorFromIcon(icon);
      App.renderPartsLibrary();
      App.renderLibraryPartInfo(App.getSelectedPart());
    } catch (err) {
      App.toast(`Part save failed: ${err.message}`, 'error');
    }
  },

  cascadeIconRenameInDiagram(iconKey, newName) {
    const diagram = App.state.diagram;
    if (!diagram || !Array.isArray(diagram.nodes)) return;
    let changed = false;
    for (const node of diagram.nodes) {
      if (String(node?.icon || '') === iconKey && node.label !== newName) {
        node.label = newName;
        changed = true;
      }
    }
    if (changed) {
      if (App.state.selectedNodeId) {
        const sel = diagram.nodes.find((n) => String(n.id) === String(App.state.selectedNodeId));
        if (sel) {
          const labelInput = App.el('selected-node-label');
          if (labelInput && document.activeElement !== labelInput) labelInput.value = sel.label;
          App.el('doc-panel-title').textContent = sel.label || 'Text';
        }
      }
      App.renderDiagram();
      App.renderDiagramTree();
    }
  },

  resetCreator() {
    if (App.state.creator.objectUrl) URL.revokeObjectURL(App.state.creator.objectUrl);
    App.state.creator = {
      selectedIconId: null,
      file: null,
      objectUrl: null,
      imageUrl: null,
      documents: [],
      existingDocuments: [],
      docFolders: ['Documents'],
      selectedDocFolder: 'Documents',
      collapsedDocFolders: new Set(),
      links: [],
      connectors: DEFAULT_CONNECTORS.map((c) => ({ ...c })),
      activeConnectorId: null,
      addingDot: false,
      imageTransform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
      imageMetrics: null,
    };
    App.el('creator-file-input').value = '';
    App.el('creator-docs-input').value = '';
    App.el('creator-images-input').value = '';
    App.el('creator-name-input').value = '';
    App.el('creator-part-number-input').value = '';
    App.el('creator-folder-select').value = 'Unsorted';
    App.el('creator-description-input').value = '';
    App.el('creator-file-name').textContent = 'No PNG selected';
    App.el('creator-link-url-input').value = '';
    App.el('creator-link-label-input').value = '';
    App.el('creator-dot-props').classList.add('hidden');
    App.el('creator-dot-delete-btn').disabled = true;
    App.el('creator-preview').classList.remove('is-adding-dot');
    App.el('creator-add-dot-btn').textContent = '+ Add';
    App.renderCreatorDocFolderSelect();
    App.renderCreator();
    App.renderCreatorDocs();
    App.renderCreatorLinks();
    App.renderCreatorDotsList();
    App.renderCreatorPartsList();
  },

  bindEvents() {
    App.el('platform-select').addEventListener('change', App.onPlatformChange);
    App.el('theme-toggle-btn').addEventListener('click', App.toggleTheme);
    App.el('add-platform-btn').addEventListener('click', App.createPlatform);
    App.el('lock-btn').addEventListener('click', () => {
      App.state.editMode ? App.setEditMode(false) : App.openPasswordModal();
    });
    App.el('save-btn').addEventListener('click', () => App.saveDiagram().catch((err) => {
      App.toast(`Save failed: ${err.message}`, 'error');
    }));
    App.el('pwd-cancel').addEventListener('click', App.closePasswordModal);
    App.el('pwd-submit').addEventListener('click', App.submitPassword);
    App.el('pwd-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') App.submitPassword();
    });
    App.el('pwd-modal').addEventListener('click', (event) => {
      if (event.target === App.el('pwd-modal')) App.closePasswordModal();
    });

    App.el('diagram-stage').addEventListener('click', App.handleDiagramStageClick);
    App.el('diagram-stage').addEventListener('pointerdown', (event) => {
      const handDrag = App.state.activeCanvasTool === 'pan' && event.button === 0;
      if (event.button !== 1 && !handDrag) return;
      event.preventDefault();
      App.startPan(event);
    });
    App.el('diagram-stage').addEventListener('auxclick', (event) => {
      if (event.button === 1) event.preventDefault();
    });
    App.el('diagram-stage').addEventListener('wheel', App.zoomDiagram, { passive: false });
    App.el('diagram-stage').addEventListener('pointermove', (event) => {
      if (App.state.wireDraft) {
        App.state.draftPoint = App.pointInStage(event);
        App.renderWires();
      }
    });
    App.el('diagram-stage').addEventListener('dragover', (event) => {
      if (!App.state.editMode) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    App.el('node-layer').addEventListener('dragstart', (event) => {
      event.preventDefault();
    });
    App.el('diagram-stage').addEventListener('drop', (event) => {
      if (!App.state.editMode) return;
      event.preventDefault();
      const partKey = event.dataTransfer.getData('application/x-offshore-part') || event.dataTransfer.getData('text/plain');
      const part = App.allParts().find((item) => item.key === partKey);
      if (!part) return;
      const stagePoint = App.pointInStage(event);
      const boardPoint = App.stageToBoard(stagePoint);
      App.state.selectedPartKey = part.key;
      App.addPartToDiagram(part, {
        x: Math.round(boardPoint.x - DEFAULT_NODE_W / 2),
        y: Math.round(boardPoint.y - DEFAULT_NODE_H / 2),
      });
      App.renderPartsLibrary();
    });

    for (const tab of document.querySelectorAll('.editor-tab')) {
      tab.addEventListener('click', () => App.setEditorTab(tab.dataset.editorTab));
    }

    for (const btn of document.querySelectorAll('[data-basic-shape]')) {
      btn.addEventListener('click', () => App.addBasicShapeToDiagram(btn.dataset.basicShape));
    }
    for (const btn of document.querySelectorAll('[data-toolbar-action]')) {
      btn.addEventListener('click', () => App.handleToolbarAction(btn.dataset.toolbarAction));
    }

    App.el('add-selected-part-btn').addEventListener('click', App.addSelectedPartToDiagram);
    App.el('create-folder-btn').addEventListener('click', App.createPartFolder);
    App.el('folder-name-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') App.createPartFolder();
    });
    App.el('parts-search-input').addEventListener('input', (event) => {
      App.state.partSearch = event.target.value;
      App.renderPartsLibrary();
    });
    App.el('parts-expand-all-btn').addEventListener('click', () => App.setPartFoldersOpen(true));
    App.el('parts-collapse-all-btn').addEventListener('click', () => App.setPartFoldersOpen(false));
    App.el('selected-node-label').addEventListener('input', (event) => App.updateSelectedNodeLabel(event.target.value));
    App.el('selected-node-connector-count').addEventListener('input', (event) => App.updateSelectedNodeConnectorCount(event.target.value));
    App.el('delete-selected-node-btn').addEventListener('click', App.deleteSelectedNode);
    App.el('clear-selection-btn').addEventListener('click', App.clearSelection);
    App.el('delete-selected-wire-btn').addEventListener('click', App.deleteSelectedWire);
    App.el('selected-wire-type').addEventListener('change', (event) => App.updateSelectedWireType(event.target.value));
    App.el('selected-wire-style').addEventListener('change', (event) => App.updateSelectedWireStyle(event.target.value));
    App.el('selected-wire-color').addEventListener('input', (event) => App.updateSelectedWireColor(event.target.value));
    App.el('selected-wire-label').addEventListener('input', (event) => App.updateSelectedWireLabel(event.target.value));
    App.el('clear-wire-color-btn').addEventListener('click', App.clearSelectedWireColor);
    App.el('add-selected-subdiagram-btn').addEventListener('click', () => App.createSubdiagram(App.findNode(App.state.selectedNodeId)));
    App.el('text-font-family').addEventListener('change', (event) => App.updateSelectedTextStyle({ fontFamily: event.target.value }));
    App.el('text-font-size').addEventListener('input', (event) => App.updateSelectedTextStyle({ fontSize: event.target.value }));
    App.el('text-bold-btn').addEventListener('click', () => {
      const node = App.findNode(App.state.selectedNodeId);
      const style = App.normalizeTextStyle(node?.textStyle);
      App.updateSelectedTextStyle({ bold: !style.bold });
    });
    App.el('text-italic-btn').addEventListener('click', () => {
      const node = App.findNode(App.state.selectedNodeId);
      const style = App.normalizeTextStyle(node?.textStyle);
      App.updateSelectedTextStyle({ italic: !style.italic });
    });
    App.el('text-color-input').addEventListener('input', (event) => App.updateSelectedTextStyle({ color: event.target.value }));

    App.el('print-btn').addEventListener('click', App.printDiagram);
    App.el('fv-close').addEventListener('click', App.closeViewer);
    document.addEventListener('click', (e) => { if (App._ctxMenu && !App._ctxMenu.contains(e.target)) App.hideContextMenu(); });

    // Single document-level handler — prevents browser menu and shows custom one
    document.addEventListener('contextmenu', (e) => {
      const folderHdr  = e.target.closest('.nav-xfolder-header');
      const fileRow    = e.target.closest('.nav-xfile');
      const explorerBd = e.target.closest('.nav-explorer-body');
      if (!folderHdr && !fileRow && !explorerBd) return; // not our area

      e.preventDefault();
      App.hideContextMenu();

      if (folderHdr) {
        const folderId   = Number(folderHdr.dataset.xFolderId);
        const folderName = folderHdr.dataset.xFolderName || 'folder';
        const pid        = Number(folderHdr.dataset.xPid);
        const diagramRef = folderHdr.dataset.xRef || 'root';
        const wrap       = folderHdr.closest('.nav-explorer-wrap');
        const uploadHere = () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.multiple = true;
          inp.addEventListener('change', async () => {
            const files = Array.from(inp.files || []);
            let ok = 0;
            for (const f of files) {
              try {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('folder_id', String(folderId));
                fd.append('diagram_ref', diagramRef);
                await App.apiFd(`/api/platforms/${pid}/project-files`, fd);
                ok++;
              } catch (err) { App.toast(`Upload failed (${f.name}): ${err.message}`, 'error'); }
            }
            if (ok) { App.toast(`Uploaded ${ok} file${ok > 1 ? 's' : ''}`, 'success'); if (wrap) App.renderProjectExplorer(wrap, diagramRef); }
          });
          inp.click();
        };
        const items = App.state.editMode
          ? [
              { label: '📁  New subfolder',    action: () => App.createProjectFolder(pid, diagramRef, folderId, wrap) },
              { label: '📂  Upload files here', action: uploadHere },
              'sep',
              { label: '✏️  Rename',            action: () => App.renameProjectFolder(folderId, folderName, wrap, diagramRef, pid) },
              { label: '🗑️  Delete folder',     danger: true, action: async () => {
                if (!confirm(`Delete folder "${folderName}" and all its contents?`)) return;
                try { await App.api(`/api/project-folders/${folderId}`, { method: 'DELETE' }); if (wrap) App.renderProjectExplorer(wrap, diagramRef); }
                catch (err) { App.toast(`Delete failed: ${err.message}`, 'error'); }
              }},
            ]
          : [
              { label: '📂  Upload files here', action: uploadHere },
              'sep',
              { label: '🔒  Edit mode required', action: () => App.openPasswordModal() },
            ];
        App.showContextMenu(items, e.clientX, e.clientY);

      } else if (fileRow) {
        const fileId   = Number(fileRow.dataset.xFileId);
        const filename = fileRow.dataset.xFilename || '';
        const mime     = fileRow.dataset.xMime     || '';
        const pid      = Number(fileRow.dataset.xPid);
        const diagramRef = fileRow.dataset.xRef || 'root';
        const wrap     = fileRow.closest('.nav-explorer-wrap');
        const fileObj  = { id: fileId, filename, mime_type: mime };
        const items = [
          { label: '👁  Open',     action: () => App.openProjectFile(fileObj) },
          { label: '⬇️  Download', action: () => { const a = document.createElement('a'); a.href = `/api/project-files/${fileId}`; a.download = filename; a.click(); } },
        ];
        if (App.state.editMode) {
          items.push('sep');
          items.push({ label: '🗑️  Delete', danger: true, action: async () => {
            if (!confirm(`Delete "${filename}"?`)) return;
            try { await App.api(`/api/project-files/${fileId}`, { method: 'DELETE' }); if (wrap) App.renderProjectExplorer(wrap, diagramRef); }
            catch (err) { App.toast(`Delete failed: ${err.message}`, 'error'); }
          }});
        }
        App.showContextMenu(items, e.clientX, e.clientY);

      } else if (explorerBd) {
        const pid        = Number(explorerBd.dataset.explorerPid) || App.state.currentPlatformId;
        const diagramRef = explorerBd.dataset.explorerRef || 'root';
        const wrap       = explorerBd.closest('.nav-explorer-wrap');
        const upload = () => {
          if (!App.state.editMode) { App.openPasswordModal(); return; }
          const inp = document.createElement('input');
          inp.type = 'file'; inp.multiple = true;
          inp.addEventListener('change', async () => {
            const files = Array.from(inp.files || []);
            let ok = 0;
            for (const f of files) {
              try {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('diagram_ref', diagramRef);
                await App.apiFd(`/api/platforms/${pid}/project-files`, fd);
                ok++;
              } catch (err) { App.toast(`Upload failed (${f.name}): ${err.message}`, 'error'); }
            }
            if (ok) { App.toast(`Uploaded ${ok} file${ok > 1 ? 's' : ''}`, 'success'); if (wrap) App.renderProjectExplorer(wrap, diagramRef); }
          });
          inp.click();
        };
        App.showContextMenu([
          { label: '📁  New folder',   action: () => { if (!App.state.editMode) { App.openPasswordModal(); return; } App.createProjectFolder(pid, diagramRef, null, wrap); } },
          { label: '📂  Upload files', action: upload },
        ], e.clientX, e.clientY);
      }
    });
    document.addEventListener('pointermove', App.onPointerMove);
    document.addEventListener('pointerup', App.onPointerUp);
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !App.isTextInputTarget(event.target)) {
        const key = String(event.key || '').toLowerCase();
        if (key === 'c' && App.state.selectedNodeId) {
          event.preventDefault();
          App.copySelectedNode();
          return;
        }
        if (key === 'v' && App.state.editMode && App.state.copiedNode) {
          event.preventDefault();
          App.pasteCopiedNode();
          return;
        }
        if (key === 'g' && App.state.editMode) {
          event.preventDefault();
          if (event.shiftKey) App.ungroupSelected();
          else App.createGroupFromSelection();
          return;
        }
      }
      if (App.state.editMode && !App.isTextInputTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const key = String(event.key || '').toLowerCase();
        if (key === 'v') {
          event.preventDefault();
          App.setCanvasTool('select');
          return;
        }
        if (key === 'h') {
          event.preventDefault();
          App.setCanvasTool('pan');
          return;
        }
      }
      if (event.key === 'Escape') App.hideContextMenu();
      if (event.key === 'Escape' && App.state.editingTextNodeId) {
        event.preventDefault();
        App.exitTextBoxEdit();
        return;
      }
      if (event.key === 'Escape' && App.state.wireDraft) {
        App.state.wireDraft = null;
        App.state.wireDragActive = false;
        App.state.draftPoint = null;
        document.body.classList.remove('is-wiring');
        App.renderDiagram();
      }
      if (event.key === 'Delete' && App.state.editMode && !App.isTextInputTarget(event.target)) {
        if (App.state.selectedWireId) App.deleteSelectedWire();
        else if (App.state.selectedNodeId) App.deleteSelectedNode();
      }
    });
  },

  async init() {
    App.initTheme();
    App.bindEvents();
    App.initCreator();
    App.renderCreator();
    App.renderCreatorDocFolderSelect();
    App.renderCreatorDocs();
    App.renderCreatorLinks();
    App.renderCreatorFolderSelect();
    App.renderCreatorPartsList();

    try {
      await App.loadPlatforms();
      await App.loadPlatformTree();
      await App.loadFolders();
      await App.loadIcons();
      await App.loadDiagram();
    } catch (err) {
      console.error(err);
      App.toast(`Startup error: ${err.message}`, 'error');
    }

    App.setEditMode(false);
    App.renderPartsLibrary();
    App.renderDiagramTree();

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('is-printing');
      if (App._printSavedVp) {
        App.state.diagram.viewport = App._printSavedVp;
        App._printSavedVp = null;
        App.renderDiagram();
      }
    });
  },
};

function AppEmptyDiagram() {
  return { version: 2, nodes: [], wires: [], groups: [], viewport: { x: 0, y: 0, zoom: 1 } };
}

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
