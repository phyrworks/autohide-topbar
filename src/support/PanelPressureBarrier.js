import Meta from 'gi://Meta';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import { ShellActionMode } from './panelVisibilityManager.js';
import { DEBUG } from './convenience.js';

export class PanelPressureBarrier {
    panelPressure = null;
    panelBarrier = null;
    #callback = null;
    #settings = null;
    #topPanel = null;

    constructor(settings, topPanel, callback) {
        this.#settings = settings;
        this.#topPanel = topPanel;
        this.#callback = callback;
    }

    get enabled() { return Boolean(this.panelBarrier && this.panelPressure) }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    get callback() { return this.#callback; }
    get threshold() { return this.#settings.pressureThreshold; }
    get timeout() { return this.#settings.pressureTimeout; }

    enable() {
        DEBUG(`PanelPressureBarrier.enable(): {threshold: ${this.threshold}, timeout: ${this.timeout}}`);
        this.disable();
        this.panelPressure = new Layout.PressureBarrier(
            this.threshold, 
            this.timeout, 
            ShellActionMode.NORMAL
        );

        this.panelPressure.connect('trigger',this.#callback);

        let anchor_y = this.#topPanel.anchor.y;
        let direction = Meta.BarrierDirection.POSITIVE_Y;
        if (anchor_y < 0) {
            anchor_y -= this.#topPanel.height;
            direction = Meta.BarrierDirection.NEGATIVE_Y;
        }
        let y = this.#topPanel.base_y - anchor_y;

        DEBUG(`PanelPressureBarrier: {x1: ${this.#topPanel.x1}, x2: ${this.#topPanel.x2}, y1:${y}, y2:${y}, direction: ${direction}}`);

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
            this.panelPressure.removeBarrier(this.panelBarrier);
            this.panelBarrier.destroy();
            this.panelBarrier = null;
            this.panelPressure = null;
        }
    }

    destroy() {
        this.disable();
    }
}
