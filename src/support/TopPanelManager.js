import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { HotCornerManager } from './HotCornerManager';

export class TopPanelManager {
    #animationActive = false;
    #hotCorner = null;

    constructor(hotCornerManager) {
        this.#hotCorner = hotCornerManager || new HotCornerManager();
        Main.layoutManager.removeChrome(this.panelBox);
        Main.layoutManager.addChrome(this.panelBox, {
            affectsStruts: false,
            trackFullscreen: true
        });
    }

    destroy() {
        Main.layoutManager.removeChrome(this.panelBox);
        Main.layoutManager.addChrome(this.panelBox, {
            affectsStruts: true,
            trackFullscreen: true
        });
    }


    get #base_y() { return this.panelBox.y; }
    get panelBox() { return Main.layoutManager.panelBox; }
    get visible() { return this.panelBox.isVisible(); }
    set visible (value) {
        value ? this.show() : this.hide();
    }

    // Geometry wrappers
    get adjustedRect() {
        return [this.panelBox.x, this.panelBox.y-this.anchor.y, this.panelBox.width, this.panelBox.height];
    }
    get anchor() {
        let [x, y] = this.panelBox.get_pivot_point();
        return {x, y};
    }
    get x() { return this.panelBox.x; }
    get y() { return this.panelBox.y; }
    get height() { return this.panelBox.height; }
    get width() { return this.panelBox.width; }

    setAlwaysEnableHotCorner(enabled) {
        this.#hotCorner.isAlwaysEnabled = enabled;
    }

    hide(animationTime, completion) {
        this.stop();
        let delta_y = -this.panelBox.height;
        if (this.anchor.y < 0) delta_y = -delta_y;

        this.#animationActive = true;
        this.panelBox.ease({
            y: this.#base_y + delta_y,
            duration: animationTime * 1000,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this.#animationActive = false;
                this.panelBox.hide();
                this.#hotCorner.visible = false;
                completion || completion();
            }
        });
    }


    reset() {
        this.stop();
        this.panelBox.show();
        this.#hotCorner.setVisible(true);
        this.panelBox.y = this.#base_y;
    }

    show(animationTime, completion) {
        this.stop();
        this.panelBox.show();
        this.#animationActive = true;
        PanelBox.ease({
            y: this.#base_y,
            duration: animationTime * 1000,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this.#animationActive = false;
                this.#hotCorner.isVisible = true;
                completion || completion();
            }
        });
    }

    stop() {
        if (this.#animationActive) {
            this.panelBox.remove_all_transitions();
            this.#animationActive = false;
        }
    }
}
