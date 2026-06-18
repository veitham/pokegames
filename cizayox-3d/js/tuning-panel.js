import { tuningState } from './tuning-state.js';

const STORAGE_HEIGHT = 'cizayox-height';
const STORAGE_AIM = 'cizayox-aim-distance';
const STORAGE_ZOROARK = 'cizayox-zoroark-tuning';

const DEFAULT_BONES = {
  leftShoulder: { x: 0, y: 0, z: 0 },
  leftArm: { x: 0, y: 0, z: 0 },
  leftForeArm: { x: 0, y: 0, z: 0 },
  rightShoulder: { x: 0, y: 0, z: 0 },
  rightArm: { x: 0, y: 0, z: 0 },
  rightForeArm: { x: 0, y: 0, z: 0 },
  neck: { x: 0, y: 0, z: 0 },
  maneBase: { x: 0, y: 0, z: 0 },
  maneMid: { x: 0, y: 0, z: 0 },
  maneTip: { x: 0, y: 0, z: 0 },
};

const ZOROARK_DEFAULTS = {
  zoroarkScale: 0.14,
  zoroarkHitRadius: 0.95,
  zoroarkHitCenterY: 1.25,
  playerHitRadius: 0.85,
  playerHitCenterY: 1.2,
  showHitboxes: true,
  zoroarkBones: structuredClone(DEFAULT_BONES),
};

/** @type {{ section: string, bones: { key: string, label: string }[] }[]} */
const BONE_SECTIONS = [
  {
    section: 'Bras gauche',
    bones: [
      { key: 'leftShoulder', label: 'Épaule' },
      { key: 'leftArm', label: 'Bras' },
      { key: 'leftForeArm', label: 'Avant-bras' },
    ],
  },
  {
    section: 'Bras droit',
    bones: [
      { key: 'rightShoulder', label: 'Épaule' },
      { key: 'rightArm', label: 'Bras' },
      { key: 'rightForeArm', label: 'Avant-bras' },
    ],
  },
  {
    section: 'Crinière',
    bones: [
      { key: 'neck', label: 'Cou' },
      { key: 'maneBase', label: 'Base' },
      { key: 'maneMid', label: 'Milieu' },
      { key: 'maneTip', label: 'Pointe' },
    ],
  },
];

function buildBoneControlsHtml() {
  return BONE_SECTIONS.map((section) => `
    <h4 class="tuning__subsection">${section.section}</h4>
    ${section.bones.map(({ key, label }) => {
      const rot = tuningState.zoroarkBones[key] ?? { x: 0, y: 0, z: 0 };
      return `
        <div class="tuning__bone-group">
          <span class="tuning__bone-label">${label}</span>
          ${['x', 'y', 'z'].map((axis) => `
            <label class="tuning__axis">
              <span>${axis.toUpperCase()}</span>
              <input type="range" id="bone-${key}-${axis}" min="-1.8" max="1.8" step="0.05" value="${rot[axis]}" />
              <span class="tuning__axis-val" id="bone-${key}-${axis}-val">${Number(rot[axis]).toFixed(2)}</span>
            </label>
          `).join('')}
        </div>
      `;
    }).join('')}
  `).join('');
}

/** @param {() => void} [onChange] */
export function initTuningPanel(onChange) {
  const existing = document.getElementById('tuning-panel');
  if (existing) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'tuning-toggle';
  toggle.className = 'tuning-toggle';
  toggle.textContent = 'Réglages';
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('aside');
  panel.id = 'tuning-panel';
  panel.className = 'tuning-panel';
  panel.innerHTML = `
    <header class="tuning-panel__header">
      <h2>Réglages</h2>
      <p>Cizayox, visée, Zoroark, squelette et hitboxes.</p>
    </header>
    <div class="tuning-panel__body">
      <h3 class="tuning__section">Cizayox</h3>
      <label class="tuning__row">
        <span class="tuning__row-label">Hauteur au sol</span>
        <input type="range" id="tune-height" min="-0.5" max="0.5" step="0.01" value="${tuningState.height}" />
        <span class="tuning__val" id="tune-height-val">${tuningState.height.toFixed(2)}</span>
      </label>
      <button type="button" class="tuning-btn tuning-btn--ghost" id="tuning-reset-height">Réinit. hauteur</button>

      <label class="tuning__row tuning__row--spaced">
        <span class="tuning__row-label">Zoom visée</span>
        <input type="range" id="tune-aim-distance" min="0.45" max="1.5" step="0.01" value="${tuningState.aimDistance}" />
        <span class="tuning__val" id="tune-aim-distance-val">${tuningState.aimDistance.toFixed(2)}</span>
      </label>
      <button type="button" class="tuning-btn tuning-btn--ghost" id="tuning-reset-aim">Réinit. zoom visée</button>

      <h3 class="tuning__section tuning__section--spaced">Zoroark</h3>
      <label class="tuning__row">
        <span class="tuning__row-label">Taille</span>
        <input type="range" id="tune-zoroark-scale" min="0.02" max="1.2" step="0.01" value="${tuningState.zoroarkScale}" />
        <span class="tuning__val" id="tune-zoroark-scale-val">${tuningState.zoroarkScale.toFixed(2)}</span>
      </label>

      <h3 class="tuning__section tuning__section--spaced">Squelette Zoroark</h3>
      <div id="zoroark-bone-controls">${buildBoneControlsHtml()}</div>
      <button type="button" class="tuning-btn tuning-btn--ghost" id="tuning-reset-bones">Réinit. squelette</button>

      <h3 class="tuning__section tuning__section--spaced">Hitboxes</h3>
      <label class="tuning__row tuning__row--check">
        <input type="checkbox" id="tune-show-hitboxes" ${tuningState.showHitboxes ? 'checked' : ''} />
        <span>Afficher les hitboxes</span>
      </label>
      <label class="tuning__row">
        <span class="tuning__row-label">Zoroark rayon</span>
        <input type="range" id="tune-zoroark-hit" min="0.2" max="2.5" step="0.05" value="${tuningState.zoroarkHitRadius}" />
        <span class="tuning__val" id="tune-zoroark-hit-val">${tuningState.zoroarkHitRadius.toFixed(2)}</span>
      </label>
      <label class="tuning__row">
        <span class="tuning__row-label">Zoroark centre Y</span>
        <input type="range" id="tune-zoroark-hit-y" min="0.4" max="3.5" step="0.05" value="${tuningState.zoroarkHitCenterY}" />
        <span class="tuning__val" id="tune-zoroark-hit-y-val">${tuningState.zoroarkHitCenterY.toFixed(2)}</span>
      </label>
      <label class="tuning__row">
        <span class="tuning__row-label">Joueur rayon</span>
        <input type="range" id="tune-player-hit" min="0.2" max="2" step="0.05" value="${tuningState.playerHitRadius}" />
        <span class="tuning__val" id="tune-player-hit-val">${tuningState.playerHitRadius.toFixed(2)}</span>
      </label>
      <label class="tuning__row">
        <span class="tuning__row-label">Joueur centre Y</span>
        <input type="range" id="tune-player-hit-y" min="0.4" max="2.5" step="0.05" value="${tuningState.playerHitCenterY}" />
        <span class="tuning__val" id="tune-player-hit-y-val">${tuningState.playerHitCenterY.toFixed(2)}</span>
      </label>
      <button type="button" class="tuning-btn tuning-btn--ghost" id="tuning-reset-zoroark">Réinit. tout Zoroark</button>
    </div>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const savedHeight = localStorage.getItem(STORAGE_HEIGHT);
  if (savedHeight !== null) {
    const val = Number(savedHeight);
    if (Number.isFinite(val)) setRange('tune-height', 'tune-height-val', val, (v) => { tuningState.height = v; });
  }

  const savedAim = localStorage.getItem(STORAGE_AIM);
  if (savedAim !== null) {
    const val = Number(savedAim);
    if (Number.isFinite(val)) setRange('tune-aim-distance', 'tune-aim-distance-val', val, (v) => { tuningState.aimDistance = v; });
  }

  loadZoroarkTuning(panel);

  function setRange(inputId, labelId, val, apply) {
    apply(val);
    const input = panel.querySelector(`#${inputId}`);
    const label = panel.querySelector(`#${labelId}`);
    if (input) input.value = String(val);
    if (label) label.textContent = Number(val).toFixed(2);
  }

  function syncZoroarkInputs(root) {
    const map = [
      ['tune-zoroark-scale', 'tune-zoroark-scale-val', 'zoroarkScale'],
      ['tune-zoroark-hit', 'tune-zoroark-hit-val', 'zoroarkHitRadius'],
      ['tune-zoroark-hit-y', 'tune-zoroark-hit-y-val', 'zoroarkHitCenterY'],
      ['tune-player-hit', 'tune-player-hit-val', 'playerHitRadius'],
      ['tune-player-hit-y', 'tune-player-hit-y-val', 'playerHitCenterY'],
    ];
    map.forEach(([inputId, labelId, key]) => {
      const input = root.querySelector(`#${inputId}`);
      const label = root.querySelector(`#${labelId}`);
      if (input) input.value = String(tuningState[key]);
      if (label) label.textContent = Number(tuningState[key]).toFixed(2);
    });
    const check = root.querySelector('#tune-show-hitboxes');
    if (check) check.checked = tuningState.showHitboxes;
    syncBoneInputs(root);
  }

  function syncBoneInputs(root) {
    BONE_SECTIONS.forEach((section) => {
      section.bones.forEach(({ key }) => {
        ['x', 'y', 'z'].forEach((axis) => {
          const val = tuningState.zoroarkBones[key]?.[axis] ?? 0;
          const input = root.querySelector(`#bone-${key}-${axis}`);
          const label = root.querySelector(`#bone-${key}-${axis}-val`);
          if (input) input.value = String(val);
          if (label) label.textContent = Number(val).toFixed(2);
        });
      });
    });
  }

  function saveZoroarkTuning() {
    localStorage.setItem(STORAGE_ZOROARK, JSON.stringify({
      zoroarkScale: tuningState.zoroarkScale,
      zoroarkHitRadius: tuningState.zoroarkHitRadius,
      zoroarkHitCenterY: tuningState.zoroarkHitCenterY,
      playerHitRadius: tuningState.playerHitRadius,
      playerHitCenterY: tuningState.playerHitCenterY,
      showHitboxes: tuningState.showHitboxes,
      zoroarkBones: tuningState.zoroarkBones,
    }));
    onChange?.();
  }

  function loadZoroarkTuning(root) {
    const saved = localStorage.getItem(STORAGE_ZOROARK);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.zoroarkScale !== undefined) tuningState.zoroarkScale = data.zoroarkScale;
      if (data.zoroarkHitRadius !== undefined) tuningState.zoroarkHitRadius = data.zoroarkHitRadius;
      if (data.zoroarkHitCenterY !== undefined) tuningState.zoroarkHitCenterY = data.zoroarkHitCenterY;
      if (data.playerHitRadius !== undefined) tuningState.playerHitRadius = data.playerHitRadius;
      if (data.playerHitCenterY !== undefined) tuningState.playerHitCenterY = data.playerHitCenterY;
      if (data.showHitboxes !== undefined) tuningState.showHitboxes = data.showHitboxes;
      if (data.zoroarkBones) {
        Object.keys(tuningState.zoroarkBones).forEach((key) => {
          if (data.zoroarkBones[key]) {
            tuningState.zoroarkBones[key] = { ...data.zoroarkBones[key] };
          }
        });
      }
      syncZoroarkInputs(root);
      onChange?.();
    } catch { /* ignore */ }
  }

  const notifyHeight = () => {
    localStorage.setItem(STORAGE_HEIGHT, String(tuningState.height));
    onChange?.();
  };

  const notifyAim = () => {
    localStorage.setItem(STORAGE_AIM, String(tuningState.aimDistance));
    onChange?.();
  };

  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('tuning-panel--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  panel.querySelector('#tune-height')?.addEventListener('input', (e) => {
    tuningState.height = Number(e.target.value);
    panel.querySelector('#tune-height-val').textContent = tuningState.height.toFixed(2);
    notifyHeight();
  });

  panel.querySelector('#tuning-reset-height')?.addEventListener('click', () => {
    setRange('tune-height', 'tune-height-val', -0.14, (v) => { tuningState.height = v; });
    notifyHeight();
  });

  panel.querySelector('#tune-aim-distance')?.addEventListener('input', (e) => {
    tuningState.aimDistance = Number(e.target.value);
    panel.querySelector('#tune-aim-distance-val').textContent = tuningState.aimDistance.toFixed(2);
    notifyAim();
  });

  panel.querySelector('#tuning-reset-aim')?.addEventListener('click', () => {
    setRange('tune-aim-distance', 'tune-aim-distance-val', 0.88, (v) => { tuningState.aimDistance = v; });
    notifyAim();
  });

  panel.querySelector('#tune-zoroark-scale')?.addEventListener('input', (e) => {
    tuningState.zoroarkScale = Number(e.target.value);
    panel.querySelector('#tune-zoroark-scale-val').textContent = tuningState.zoroarkScale.toFixed(2);
    saveZoroarkTuning();
  });

  BONE_SECTIONS.forEach((section) => {
    section.bones.forEach(({ key }) => {
      ['x', 'y', 'z'].forEach((axis) => {
        panel.querySelector(`#bone-${key}-${axis}`)?.addEventListener('input', (e) => {
          if (!tuningState.zoroarkBones[key]) {
            tuningState.zoroarkBones[key] = { x: 0, y: 0, z: 0 };
          }
          tuningState.zoroarkBones[key][axis] = Number(e.target.value);
          const label = panel.querySelector(`#bone-${key}-${axis}-val`);
          if (label) label.textContent = tuningState.zoroarkBones[key][axis].toFixed(2);
          saveZoroarkTuning();
        });
      });
    });
  });

  panel.querySelector('#tuning-reset-bones')?.addEventListener('click', () => {
    tuningState.zoroarkBones = structuredClone(DEFAULT_BONES);
    syncBoneInputs(panel);
    saveZoroarkTuning();
  });

  panel.querySelector('#tune-show-hitboxes')?.addEventListener('change', (e) => {
    tuningState.showHitboxes = e.target.checked;
    saveZoroarkTuning();
  });

  panel.querySelector('#tune-zoroark-hit')?.addEventListener('input', (e) => {
    tuningState.zoroarkHitRadius = Number(e.target.value);
    panel.querySelector('#tune-zoroark-hit-val').textContent = tuningState.zoroarkHitRadius.toFixed(2);
    saveZoroarkTuning();
  });

  panel.querySelector('#tune-zoroark-hit-y')?.addEventListener('input', (e) => {
    tuningState.zoroarkHitCenterY = Number(e.target.value);
    panel.querySelector('#tune-zoroark-hit-y-val').textContent = tuningState.zoroarkHitCenterY.toFixed(2);
    saveZoroarkTuning();
  });

  panel.querySelector('#tune-player-hit')?.addEventListener('input', (e) => {
    tuningState.playerHitRadius = Number(e.target.value);
    panel.querySelector('#tune-player-hit-val').textContent = tuningState.playerHitRadius.toFixed(2);
    saveZoroarkTuning();
  });

  panel.querySelector('#tune-player-hit-y')?.addEventListener('input', (e) => {
    tuningState.playerHitCenterY = Number(e.target.value);
    panel.querySelector('#tune-player-hit-y-val').textContent = tuningState.playerHitCenterY.toFixed(2);
    saveZoroarkTuning();
  });

  panel.querySelector('#tuning-reset-zoroark')?.addEventListener('click', () => {
    tuningState.zoroarkScale = ZOROARK_DEFAULTS.zoroarkScale;
    tuningState.zoroarkHitRadius = ZOROARK_DEFAULTS.zoroarkHitRadius;
    tuningState.zoroarkHitCenterY = ZOROARK_DEFAULTS.zoroarkHitCenterY;
    tuningState.playerHitRadius = ZOROARK_DEFAULTS.playerHitRadius;
    tuningState.playerHitCenterY = ZOROARK_DEFAULTS.playerHitCenterY;
    tuningState.showHitboxes = ZOROARK_DEFAULTS.showHitboxes;
    tuningState.zoroarkBones = structuredClone(DEFAULT_BONES);
    syncZoroarkInputs(panel);
    saveZoroarkTuning();
  });
}
