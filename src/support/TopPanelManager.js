import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { HotCornerManager } from './HotCornerManager.js';

export class TopPanelManager {
    #animationActive = false;
    #hotCorner = null;
    #base_y = 0;

    constructor(hotCornerManager, allocationCallback) {
        this.#hotCorner = hotCornerManager ?? new HotCornerManager(this.panelBox.height);
        this.#hotCorner.panelVisible = true;
        this._resetChrome(false);
        this.#base_y = this.panelBox.y;

        if (!this.panelBox.has_allocation()) {
            // after login, allocating the panel can take a second or two
            let tmp_handle = this.panelBox.connect("notify::allocation", () => {
                allocationCallback && allocationCallback(this);
                this.panelBox.disconnect(tmp_handle);
              });
        } else {
            allocationCallback && allocationCallback(this);
        }
    }

    destroy() {
        this._resetChrome(true);
    }

    _resetChrome(affectsStruts) {
        Main.layoutManager.removeChrome(this.panelBox);
        Main.layoutManager.addChrome(this.panelBox, {
            affectsStruts: affectsStruts,
            trackFullscreen: true
        });
    }

    get base_y() { return this.#base_y; }
    get panelBox() { return Main.layoutManager.panelBox; }
    get visible() { 
        return this.panelBox.is_visible(); 
    }
    set visible(value) {
        value ? this.show() : this.hide();
    }

    // Geometry wrappers
    get adjustedRect() {
        return {
            x: this.x - 1, 
            y: this.y-this.anchor.y - 1, 
            width: this.width + 1, 
            height: this.height + 1
        };
    }
    get anchor() {
        let [x, y] = this.panelBox.get_pivot_point();
        return {x, y};
    }
    get x() { return this.panelBox.x; }
    get y() { return this.panelBox.y; }
    get height() { return this.panelBox.height; }
    get width() { return this.panelBox.width; }
    get x1() { return this.panelBox.x; }
    get x2() { return this.panelBox.x + this.panelBox.width; }
    get y1() { return this.panelBox.y; }
    get y2() { return this.panelBox.y + this.panelBox.height; }

    contains(_, y) { 
        return y < this.height;
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
                this.panelBox.panelVisible = false;
                completion && completion();
            }
        });
    }


    reset() {
        this.stop();
        this.panelBox.show();
        this.#hotCorner.panelVisible = true;
        this.panelBox.y = this.#base_y;
    }

    show(animationTime, completion) {
        this.stop();
        this.panelBox.show();
        this.#animationActive = true;
        this.panelBox.ease({
            y: this.#base_y,
            duration: animationTime * 1000,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this.#animationActive = false;
                this.#hotCorner.panelVisible = true;
                completion && completion();
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
