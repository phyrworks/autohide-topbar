import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import { ShellActionMode } from './panelVisibilityManager.js';

export class PressureBarrier {
    panelPressure = null;
    panelBarrier = null;
    #settings = null;
    #topPanel = null;
    #callback = null;

    constructor(settings, topPanel, callback) {
        this.#settings = settings;
        this.#topPanel = topPanel;
        this.#callback = callback;
    }

    get enabled() { return Boolean(this.panelBarrier && this.panelPressure) }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    enable() {
        this.disable();
        this.panelPressure = new Layout.PressureBarrier(
            this.#settings.pressureThreshold,
            this.#settings.pressureTimeout,
            ShellActionMode.NORMAL
        );

        this.panelPressure.connect(
            'trigger',
            (barrier) => {
                if (Main.layoutManager.primaryMonitor.inFullscreen
                    && (!this.#settings.mouseSensitiveFullscreenWindow)) {
                    return;
                }
                this.#callback && this.#callback();
            }
        );
        let anchor_y = this.#topPanel.anchor.y, direction = Meta.BarrierDirection.POSITIVE_Y;
        if (anchor_y < 0) {
            anchor_y -= this.#topPanel.panelBox.height;
            direction = Meta.BarrierDirection.NEGATIVE_Y;
        }
        this.panelBarrier = new Meta.Barrier({
            display: global.display,
            x1: this.#topPanel.x,
            x2: this.#topPanel.x + this.#topPanel.width,
            y1: this._base_y - anchor_y,
            y2: this._base_y - anchor_y,
            directions: direction
        });
        this.panelPressure.addBarrier(this.panelBarrier);
    }

    disable() {
        if (this.enabled) {
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
