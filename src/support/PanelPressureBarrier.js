import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import { DEBUG } from './logging.js';

export class PanelPressureBarrier {
    panelPressure = null;
    panelBarrier = null;
    #callback = null;
    #preferences = null;
    #topPanel = null;

    constructor(preferences, topPanel, callback) {
        this.#preferences = preferences;
        this.#topPanel = topPanel;
        this.#callback = callback;
    }

    get enabled() { return Boolean(this.panelBarrier && this.panelPressure) }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    get callback() { return this.#callback; }
    get shellActionMode() { return Shell.ActionMode || Shell.KeyBindingMode; }
    get threshold() { return this.#preferences.pointer.PRESSURE_THRESHOLD; }
    get timeout() { return this.#preferences.pointer.PRESSURE_TIMEOUT; }

    enable() {
        DEBUG(`PanelPressureBarrier.enable()`);
        this.disable();
        this.panelPressure = new Layout.PressureBarrier(
            this.threshold, 
            this.timeout, 
            this.shellActionMode.NORMAL
        );

        this.panelPressure.connect('trigger',this.#callback);

        let anchor_y = this.#topPanel.anchor.y;
        let direction = Meta.BarrierDirection.POSITIVE_Y;
        if (anchor_y < 0) {
            anchor_y -= this.#topPanel.height;
            direction = Meta.BarrierDirection.NEGATIVE_Y;
        }
        let y = this.#topPanel.base_y - anchor_y;

        this.panelBarrier = new Meta.Barrier({
            display: global.display,
            x1: this.#topPanel.x1,
            x2: this.#topPanel.x2,
            y1: y,
            y2: y,
            directions: direction
        });

        this.panelPressure.addBarrier(this.panelBarrier);
    }

    disable() {
        if (this.enabled) {
            DEBUG(`PanelPressureBarrier.disable()`);
            this.panelBarrier ?? this.panelPressure.removeBarrier(this.panelBarrier);
            this.panelBarrier?.destroy();
            this.panelBarrier = null;
            this.panelPressure = null;
        }
    }

    destroy() {
        this.disable();
    }
}
