import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import { ShellActionMode } from './panelVisibilityManager.js';

export class PressureBarrier {
    #panelPressure = null;
    #panelBarrier = null;
    #settings = null;
    #topPanel = null;

    constructor(settings, topPanel) {
        this.#settings = settings;
        this.#topPanel = topPanel;
    }

    get enabled() { return Boolean(this.#panelBarrier && this.#panelPressure) }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    enable() {
        this.disable();
        this.#panelPressure = new Layout.PressureBarrier(
            settings.get_int('pressure-threshold'),
            settings.get_int('pressure-timeout'),
            ShellActionMode.NORMAL
        );
        panelPressure.connect(
            'trigger',
            (barrier) => {
                if (Main.layoutManager.primaryMonitor.inFullscreen
                    && (!settings.get_boolean('mouse-sensitive-fullscreen-window'))) {
                    return;
                }
                this.show(
                    settings.get_double('animation-time-autohide'),
                    "mouse-enter"
                );
            }
        );
        let anchor_y = topPanel.panelBox.get_pivot_point()[1], direction = Meta.BarrierDirection.POSITIVE_Y;
        if (anchor_y < 0) {
            anchor_y -= topPanel.panelBox.height;
            direction = Meta.BarrierDirection.NEGATIVE_Y;
        }
        this.#panelBarrier = new Meta.Barrier({
            display: global.display,
            x1: topPanel.panelBox.x,
            x2: topPanel.panelBox.x + topPanel.panelBox.width,
            y1: this._base_y - anchor_y,
            y2: this._base_y - anchor_y,
            directions: direction
        });
        this.#panelPressure.addBarrier(this.#panelBarrier);
    }

    disable() {
        if (this.enabled) {
            this.#panelPressure.removeBarrier(this.#panelBarrier);
            this.#panelBarrier.destroy();
            this.#panelBarrier = null;
            this.#panelPressure = null;
        }
    }

    destroy() {
        this.disable();
    }
}
