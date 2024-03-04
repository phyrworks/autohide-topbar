import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import { DEBUG } from './logging.js';

export class PointerListener {
    #callback = null;
    #pointerWatcher = null;
    #listener = null;

    constructor(callback) {
        this.#callback = callback;
        this.#pointerWatcher = PointerWatcher.getPointerWatcher();
        this.#listener = null;
    }

    get isListening() {
        return !!this.#listener;
    }

    set isListening(value) {
        value ? this.start() : this.stop();
    }

    start() {
        DEBUG(`PointerListener.start()`);
        if (!this.#listener) {
            this.#listener = this.#pointerWatcher.addWatch(10, this.#callback);
        }
    }

    stop() {
        DEBUG(`PointerListener.stop()`);
        this.#listener && this.#pointerWatcher._removeWatch(this.#listener);
        this.#listener = null;
    }

    destroy() {
        this.stop();
        this.#pointerWatcher = null;
        this.#listener = null;
        this.#callback = null;
    }
}
