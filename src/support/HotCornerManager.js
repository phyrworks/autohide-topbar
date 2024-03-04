import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class HotCornerManager {
    #panelIsVisible = false;
    #alwaysEnabled = false;
    #height = 0;

    constructor(height) {
        this.#height = height || 0;
    }

    destroy() {
        this.#enable();
    }

    get isHotCornerEnabled() { return this.#panelIsVisible || this.#alwaysEnabled; }

    get height() { 
        return this.#height; 
    }

    set height(value) { 
        this.#height = value; 
        if (this.isHotCornerEnabled) {
            this.#enable();
        }
    }

    get panelVisible() {
        return this.#panelIsVisible;
    }

    set panelVisible(value) {
        this.#panelIsVisible = value;
        this.#update();
    }

    get isAlwaysEnabled() {
        return this.#alwaysEnabled;
    }

    set isAlwaysEnabled(value) {
        this.#alwaysEnabled = value;
        this.#update();
    }

    #enable() {
        let hotCorner = this.#findHotCorner();
        hotCorner?.setBarrierSize(this.height);
    }

    #disable() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            let hotCorner = this.#findHotCorner();
            hotCorner?.setBarrierSize(0);
        });
    }

    #findHotCorner() {
        return Main.layoutManager.hotCorners.find((hc) => !!hc);
    }

    #update() {
        this.isHotCornerEnabled ? this.#enable() : this.#disable();
    }
}
