import Clutter from 'gi://Clutter';
import {DEBUG} from './convenience.js';

export class TargetBox {
    #box = null;
    constructor() {
        this.#box = new Clutter.ActorBox();
    }

    destroy() {
    }

    get x() { return this.#box.get_x(); }
    get y() { return this.#box.get_y(); }
    get width() { return this.#box.get_width(); }
    get height() { return this.#box.get_height(); }
    get rect() {
        return { 
            x: this.#box.get_x(),
            y: this.#box.get_y(), 
            width: this.#box.get_width(), 
            height: this.#box.get_height() 
        };
    }

    set rect(value) {
        DEBUG(`BEFORE: set TargetBox.rect({x: ${value.x}, y: ${value.y}, width: ${value.width}, height: ${value.height}})`);
        this.#box.init_rect(value.x, value.y, value.width, value.height);
        DEBUG(`AFTER: TargetBox.rect(${this.toString()})`);
    }

    contains(x, y) { return this.#box.contains(x, y); }
    overlaps(rect) {
        return (rect.x < this.x + this.width) &&
            (rect.x + rect.width > this.x) &&
            (rect.y < this.y + this.height) &&
            (rect.y + rect.height > this.y);
    }

    toString() {
        return `{x: ${this.x}, y: ${this.y}, width: ${this.width}, height: ${this.height}}`;
    }

}
