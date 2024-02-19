import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class HotCornerManager {
    #panelIsVisible = false;
    #alwaysEnabled = false;

    destroy() {
        this.#enable();
    }

    get isHotCornerEnabled() { return this.#panelIsVisible || this.#alwaysEnabled; }

    get isVisible() {
        return this.#panelIsVisible;
    }

    set isVisible(visible) {
        this.#panelIsVisible = visible;
        this.#update();
    }

    get isAlwaysEnabled() {
        return this.#alwaysEnabled;
    }

    set isAlwaysEnabled(always) {
        this.#alwaysEnabled = always;
        this.#update();
    }

    #enable() {
        let hotCorner = this.#findHotCorner();
        hotCorner && hotCorner.setBarrierSize(this.panelBox.height);
    }

    #disable() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, function () {
            let hotCorner = this.#findHotCorner();
            hotCorner && hotCorner.setBarrierSize(0);
        });
    }

    #findHotCorner() {
        return Main.layoutManager.hotCorner.find((hc) => hc != null);
    }

    #update() {
        this.isHotCornerEnabled ? this.#enable() : this.#disable();
    }
}
