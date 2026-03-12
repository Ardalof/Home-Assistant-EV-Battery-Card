# ⚡ EV Battery Charge Card for Home Assistant

<img width="505" height="712" alt="EV Battery Card Preview" src="https://github.com/user-attachments/assets/4d6ae4ad-ccbc-4595-a682-3ce6052080fe" />

An advanced, animated battery card specifically designed for Electric Vehicle charging visualization. It features dynamic liquid animations, rising bubbles, and a glowing "shimmer" effect to bring your dashboard to life.

---

## ✨ Features
* **Liquid Filling Animation:** The battery level visualizes as a rising liquid.
* **Charging Effects:** Animated bubbles and a pulsing lightning icon appear during active charging.
* **Shimmer Glow:** A modern light-shimmer effect inside the battery for a premium look.
* **Smart States:** * 🔵 **Charging:** Blue theme with flow animations.
    * 🟢 **Completed:** Turns green with a smooth "check-mark" (✓) animation.
* **Data Overlay:** Displays Amperes, Duration, and Cost directly below the battery.
* **OCPP Integration:** Designed to work seamlessly with chargers using the OCPP protocol for current adjustment.

---

## 🚀 Installation

### 1. Upload the File
Place the `ev-battery-card.js` file in your Home Assistant `www` directory:
`/config/www/ev-battery-card.js`

### 2. Add Resource Reference
Edit your resources (via SSH using `nano` or through the UI) and add:
* **URL:** `/local/ev-battery-card.js`
* **Type:** `JavaScript Module`

### 3. Restart
Restart Home Assistant to ensure the new custom card is loaded.

---

## 🛠️ Configuration Example

Add a **Manual Card** to your dashboard and use this configuration:

📋 Entity Mapping
Option	Description
energy_entity	Current energy delivered in the session (kWh).
target_entity	Your target charge limit (input_number).
ampere_entity	OCPP Managed: The sensor representing the current offered to the EV via the OCPP protocol.
duration_entity	Total charging time sensor.
cost_entity	Calculated cost of the current session.
charge_switch	The switch that controls the charger (for ON/OFF state).
voltage_entity	Real-time line voltage (V).

```yaml
type: custom:ev-battery-card
name: "Terra AC Charger"
energy_entity: sensor.charger_energy_session_2
target_entity: input_number.target_charge_energy
ampere_entity: sensor.charger_current_offered_2
duration_entity: sensor.charger_time_session_2
cost_entity: sensor.charging_cost_euro
charge_switch: switch.charger_charge_control
voltage_entity: sensor.charger_voltage

    [!TIP]
    OCPP Control: The charging current is dynamically adjusted via the OCPP protocol directly through the charger, allowing for precise power management within Home Assistant.
