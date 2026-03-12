(function () {
  "use strict";

  function injectFont() {
    const id = "ev-battery-font";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Share+Tech+Mono&family=Nunito:wght@600;700&display=swap";
      document.head.appendChild(link);
    }
  }

  function injectKeyframes() {
    const id = "ev-battery-kf";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes ev-pulse-green {
        0%,100% { box-shadow: 0 0 12px #00c87588, inset 0 0 20px #00c87522; }
        50%      { box-shadow: 0 0 28px #00c875cc, inset 0 0 32px #00c87544; }
      }
      @keyframes ev-bubble {
        0%   { transform: translateY(0) scale(1); opacity: 0.6; }
        100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
      }
      @keyframes ev-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes ev-done-pop {
        0%   { transform: scale(0.8); opacity:0; }
        60%  { transform: scale(1.1); }
        100% { transform: scale(1); opacity:1; }
      }
      @keyframes ev-fill-flow {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes ev-gloss {
        0%   { transform: translateX(-100%) skewX(-15deg); opacity:0; }
        20%  { opacity:0.5; }
        80%  { opacity:0.5; }
        100% { transform: translateX(300%) skewX(-15deg); opacity:0; }
      }
    `;
    document.head.appendChild(s);
  }

  class EvBatteryCard extends HTMLElement {
    constructor() {
      super();
      this._config = {};
      this._hass = null;
      this._bubbleTimer = null;
    }

    static getStubConfig() {
      return {
        energy_entity: "sensor.charger_energy_session_2",
        target_entity: "input_number.target_charge_energy",
        ampere_entity: "sensor.charger_current_offered_2",
        duration_entity: "sensor.charger_time_session_2",
        cost_entity: "sensor.charging_cost_euro",
        charge_switch: "switch.charger_charge_control",
      };
    }

    setConfig(config) {
      this._config = {
        name: config.name || "EV Charger",
        energy_entity: config.energy_entity,
        target_entity: config.target_entity,
        ampere_entity: config.ampere_entity,
        duration_entity: config.duration_entity,
        cost_entity: config.cost_entity,
        charge_switch: config.charge_switch,
        voltage_entity: config.voltage_entity,
        maintenance_entity: config.maintenance_entity || "input_boolean.maintenance_mode",
        max_current_entity: config.max_current_entity || "number.charger_maximum_current",
        reset_entity: config.reset_entity || "button.charger_reset",
        unlock_entity: config.unlock_entity || "button.charger_unlock",
        ...config,
      };
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    connectedCallback() { this._startBubbles(); }
    disconnectedCallback() { if (this._bubbleTimer) clearInterval(this._bubbleTimer); }
    getCardSize() { return 6; }

    _val(entity, def = 0) {
      const s = this._hass?.states[entity];
      if (!s) return def;
      const v = parseFloat(s.state);
      return isNaN(v) ? def : v;
    }

    _str(entity, def = "-") {
      return this._hass?.states[entity]?.state ?? def;
    }

    _startBubbles() {
      if (this._bubbleTimer) clearInterval(this._bubbleTimer);
      this._bubbleTimer = setInterval(() => {
        const container = this.querySelector(".ev-bubble-container");
        if (!container) return;
        const isCharging = this._hass?.states[this._config.charge_switch]?.state === "on";
        if (!isCharging) return;
        const bubble = document.createElement("div");
        const size = 4 + Math.random() * 7;
        const left = 8 + Math.random() * 84;
        const dur = 1.5 + Math.random() * 2;
        bubble.style.cssText = `position:absolute;bottom:4px;left:${left}%;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.3);animation:ev-bubble ${dur}s ease-out forwards;pointer-events:none;`;
        container.appendChild(bubble);
        setTimeout(() => bubble.remove(), dur * 1000);
      }, 500);
    }

    _render() {
      if (!this._hass || !this._config) return;
      injectFont();
      injectKeyframes();

      const cfg = this._config;
      const energy    = this._val(cfg.energy_entity);
      const target    = this._val(cfg.target_entity, 50);
      const duration  = this._str(cfg.duration_entity);
      const cost      = this._val(cfg.cost_entity);
      const isCharging = this._hass?.states[cfg.charge_switch]?.state === "on";
      const isMaint    = this._hass?.states[cfg.maintenance_entity]?.state === "on";
      const maxAmpere  = this._val(cfg.max_current_entity, 16);

      const pct  = Math.min(100, Math.round((energy / target) * 100));
      const done = pct >= 100;
      const color = "#00c875";

      // Auto stop charge when done
      if (done && isCharging) {
        this._hass.callService("switch", "turn_off", { entity_id: cfg.charge_switch });
      }

      const pulseAnim = done ? "ev-pulse-green 2s ease-in-out infinite" : "none";
      const pctTextColor = pct > 45 ? "rgba(255,255,255,0.95)" : color;

      const fillStyle = isCharging && !done
        ? "background:linear-gradient(90deg,#00c875,#f59e0b,#00c875,#f59e0b);background-size:300% 100%;animation:ev-fill-flow 2s ease infinite;"
        : done
          ? "background:linear-gradient(90deg,#00c875,#f59e0b,#00c875);background-size:300% 100%;animation:ev-fill-flow 3s ease infinite;"
          : `background:${color};`;

      const doneHTML = done ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;animation:ev-done-pop 0.5s ease-out"><span style="font-size:36px">?</span></div>` : "";

      const statusText  = done ? "CHARGED" : isCharging ? "CHARGING" : "STANDBY";
      const statusColor = done ? "#00c875" : isCharging ? "#f59e0b" : "rgba(255,255,255,0.3)";
      const statusDot   = done ? "#00c875" : isCharging ? "#f59e0b" : "rgba(255,255,255,0.2)";

      this.innerHTML = `
        <ha-card style="background:#0d0f14;border-radius:20px;padding:20px 20px 16px;border:1px solid rgba(255,255,255,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)">

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4)">${cfg.name}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:7px;height:7px;border-radius:50%;background:${statusDot};box-shadow:${isCharging||done?`0 0 8px ${statusDot}`:'none'}${isCharging?';animation:ev-spin 3s linear infinite':''}"></div>
              <span style="font-family:'Orbitron',sans-serif;font-size:10px;color:${statusColor};letter-spacing:0.1em">${statusText}</span>
            </div>
          </div>

          <!-- Battery SVG — horizontal, styled like reference image -->
          <div style="margin-bottom:10px">
            <svg width="100%" viewBox="0 0 400 130" style="display:block;overflow:visible">
              <defs>
                <linearGradient id="ev-fill-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stop-color="#5eff78"/>
                  <stop offset="30%"  stop-color="#00e04a"/>
                  <stop offset="70%"  stop-color="#00b830"/>
                  <stop offset="100%" stop-color="#008a22"/>
                </linearGradient>
                <linearGradient id="ev-gloss-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stop-color="rgba(255,255,255,0.35)"/>
                  <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                </linearGradient>
                <clipPath id="ev-inner-clip">
                  <rect x="6" y="6" width="382" height="118" rx="18"/>
                </clipPath>
              </defs>

              <!-- Outer border -->
              <rect x="2" y="2" width="390" height="126" rx="22"
                fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>

              <!-- Body background -->
              <rect x="4" y="4" width="388" height="122" rx="20" fill="#0d0f14"/>

              <!-- Fill area (bottom portion, left to right) -->
              <g clip-path="url(#ev-inner-clip)">
                <!-- pct fill -->
                <rect x="6" y="6" width="${Math.round(382*(pct/100))}" height="118"
                  fill="url(#ev-fill-grad)"
                  style="${isCharging&&!done ? 'animation:ev-fill-flow 2s ease infinite' : ''}"/>

                <!-- Gloss top overlay on fill -->
                <rect x="6" y="6" width="${Math.round(382*(pct/100))}" height="48"
                  fill="url(#ev-gloss-grad)"/>

                <!-- Sweep gloss when charging -->
                ${isCharging||done ? `
                  <rect x="-80" y="6" width="90" height="118" rx="6"
                    fill="rgba(255,255,255,0.12)"
                    style="animation:ev-gloss 2.2s ease-in-out infinite"/>
                ` : ""}

                <!-- Glow pulse center when charging -->
                ${isCharging && !done ? `
                  <ellipse cx="${Math.round(6 + 382*(pct/100)*0.5)}" cy="65"
                    rx="${Math.round(382*(pct/100)*0.35)}" ry="55"
                    fill="rgba(255,255,255,0.07)"
                    style="animation:ev-fill-flow 1.5s ease-in-out infinite"/>
                ` : ""}
              </g>

              <!-- Segment dividers -->
              ${[1,2,3,4].map(i => `
                <line x1="${6+Math.round(i*382/5)}" y1="6"
                      x2="${6+Math.round(i*382/5)}" y2="124"
                      stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
              `).join("")}

              <!-- Percentage — top dark area -->
              <text x="200" y="52" text-anchor="middle" dominant-baseline="central"
                font-family="'Share Tech Mono',monospace" font-size="34" font-weight="700"
                fill="${pct > 55 ? 'rgba(255,255,255,0.95)' : '#00e04a'}"
                style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9))">${pct}%</text>

              <!-- kWh — inside green fill area -->
              <text x="200" y="92" text-anchor="middle" dominant-baseline="central"
                font-family="'Share Tech Mono',monospace" font-size="34"
                fill="${pct > 30 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}"
                style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.8))">${energy.toFixed(1)} kWh</text>



              <!-- Cap (right side) -->
              <rect x="393" y="42" width="8" height="46" rx="3"
                fill="rgba(255,255,255,0.2)"/>
            </svg>
          </div>

          <!-- Progress bar -->
          <div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.07);overflow:hidden;margin-bottom:14px">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 1.2s ease;box-shadow:0 0 6px ${color}"></div>
          </div>

          <!-- Stats: Duration + Cost -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 15H11v-6h1.5V17zm0-8H11V7h1.5v2z" fill="${color}"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4)">Duration</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:15px;color:white;font-weight:700">${duration}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="${color}"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4)">Cost</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:15px;color:white;font-weight:700">&#8364;${cost.toFixed(2)}</span>
            </div>
          </div>

          <!-- Divider -->
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);margin-bottom:12px"></div>

          <!-- Charge toggle -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="${isCharging?'#f59e0b':'rgba(255,255,255,0.3)'}"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7)">Charge</span>
            </div>
            <div data-toggle="${cfg.charge_switch}" data-domain="switch" style="width:44px;height:24px;border-radius:12px;position:relative;cursor:pointer;background:${isCharging?'#f59e0b':'rgba(255,255,255,0.1)'};box-shadow:${isCharging?'0 0 10px #f59e0b66':'none'};transition:background 0.3s;flex-shrink:0">
              <div style="position:absolute;top:3px;${isCharging?'left:23px':'left:3px'};width:18px;height:18px;border-radius:50%;background:white;transition:left 0.25s;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
            </div>
          </div>

          <!-- Maintenance toggle -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M13.78 15.3L19.78 21.3L21.89 19.14L15.89 13.14L13.78 15.3M17.5 11.19L16.09 9.78L11.11 14.77L8.29 11.95L13.28 6.96L11.86 5.55C10.5 4.16 8.47 3.9 6.82 4.74L9.63 7.55L7.51 9.67L4.7 6.86C3.85 8.5 4.12 10.55 5.5 11.93C6.88 13.31 8.91 13.58 10.56 12.74L13.38 15.56C12.53 17.2 12.8 19.23 14.18 20.61C15.56 21.99 17.59 22.26 19.24 21.42L16.43 18.61L18.55 16.49L21.36 19.3C22.21 17.66 21.93 15.63 20.55 14.25C19.18 12.87 17.16 12.59 15.5 13.42L13.78 15.3M2.81 2.81L1.39 4.22L8 10.83L10.12 8.71L2.81 2.81Z" fill="${isMaint?'#f59e0b':'rgba(255,255,255,0.3)'}"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7)">Maintenance (100%)</span>
            </div>
            <div data-toggle="${cfg.maintenance_entity}" data-domain="input_boolean" style="width:44px;height:24px;border-radius:12px;position:relative;cursor:pointer;background:${isMaint?'#f59e0b':'rgba(255,255,255,0.1)'};box-shadow:${isMaint?'0 0 10px #f59e0b66':'none'};transition:background 0.3s;flex-shrink:0">
              <div style="position:absolute;top:3px;${isMaint?'left:23px':'left:3px'};width:18px;height:18px;border-radius:50%;background:white;transition:left 0.25s;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
            </div>
          </div>

          <!-- Target slider -->
          <div style="padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7)">Target Limit</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${color}">${target} kWh</span>
            </div>
            <input type="range"
              min="${this._hass.states[cfg.target_entity]?.attributes?.min||0}"
              max="${this._hass.states[cfg.target_entity]?.attributes?.max||80}"
              step="${this._hass.states[cfg.target_entity]?.attributes?.step||1}"
              value="${target}" data-input="${cfg.target_entity}"
              style="width:100%;height:4px;border-radius:2px;outline:none;border:none;cursor:pointer;accent-color:${color};background:rgba(255,255,255,0.1)">
          </div>

          <!-- Output Ampere slider -->
          <div style="padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7)">Output Ampere</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${color}">${maxAmpere.toFixed(0)} A</span>
            </div>
            <input type="range"
              min="${this._hass.states[cfg.max_current_entity]?.attributes?.min||6}"
              max="${this._hass.states[cfg.max_current_entity]?.attributes?.max||32}"
              step="${this._hass.states[cfg.max_current_entity]?.attributes?.step||1}"
              value="${maxAmpere}" data-input="${cfg.max_current_entity}" data-domain="number"
              style="width:100%;height:4px;border-radius:2px;outline:none;border:none;cursor:pointer;accent-color:${color};background:rgba(255,255,255,0.1)">
          </div>

          <!-- Reset + Unlock -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div data-button="${cfg.reset_entity}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);cursor:pointer;-webkit-tap-highlight-color:transparent">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="#ef4444"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:#ef4444">Reset</span>
            </div>
            <div data-button="${cfg.unlock_entity}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,0.03);border:${done?'1px solid #00c87566':'1px solid rgba(255,255,255,0.06)'};cursor:pointer;-webkit-tap-highlight-color:transparent;${done?'box-shadow:0 0 12px #00c87533;animation:ev-pulse-green 2s ease-in-out infinite;':''}">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" fill="${done?'#00c875':'#22c55e'}"/></svg>
              <span style="font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:${done?'#00c875':'#22c55e'}">${done?'UNLOCK!':'Unlock'}</span>
            </div>
          </div>

        </ha-card>
      `;

      // Toggles
      this.querySelectorAll("[data-toggle]").forEach(el => {
        el.addEventListener("click", () => {
          const entity = el.dataset.toggle;
          const domain = el.dataset.domain;
          const isOn = this._hass.states[entity]?.state === "on";
          this._hass.callService(domain, isOn ? "turn_off" : "turn_on", { entity_id: entity });
        });
      });

      // Buttons
      this.querySelectorAll("[data-button]").forEach(el => {
        el.addEventListener("click", () => {
          el.style.transform = "scale(0.92)";
          setTimeout(() => el.style.transform = "scale(1)", 150);
          this._hass.callService("button", "press", { entity_id: el.dataset.button });
        });
      });

      // Sliders
      this.querySelectorAll("[data-input]").forEach(el => {
        el.addEventListener("change", () => {
          const entity = el.dataset.input;
          const domain = entity.startsWith("number.") ? "number" : "input_number";
          this._hass.callService(domain, "set_value", { entity_id: entity, value: parseFloat(el.value) });
        });
      });
    }
  }

  if (!customElements.get("ev-battery-card")) {
    customElements.define("ev-battery-card", EvBatteryCard);
    console.info("%c EV-BATTERY-CARD %c Loaded ", "background:#00c875;color:#000;font-weight:bold;padding:2px 6px", "background:#0d0f14;color:#00c875;padding:2px 6px");
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.find(c => c.type === "ev-battery-card")) {
    window.customCards.push({ type: "ev-battery-card", name: "EV Battery Card", description: "Animated EV charging battery card", preview: true });
  }
})();