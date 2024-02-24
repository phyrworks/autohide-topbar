import GLib from 'gi://GLib';

export class SimpleTimeout {
    #callback = null;
    #timeout = 0;
    #bindTimeoutId = 0;
    constructor(timeout, callback) {
        this.#callback = callback;
        this.#timeout = timeout;
        this.#bindTimeoutId = 0;
        this.enable();
    }

    destroy() {
        this.disable();
    }

    get enabled() { return this.#bindTimeoutId != 0; }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    enable() {
        this.disable();
        this.#bindTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.#timeout,
            this.#callback
        );
    }

    disable() {
        if (this.enabled) {
            GLib.source_remove(this.#bindTimeoutId);
            this.#bindTimeoutId = 0;
        }
    }

}
