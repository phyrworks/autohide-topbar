import Clutter from 'gi://Clutter';

export class TargetBox {
    constructor() {
        this.box = new Clutter.ActorBox();
    }

    destroy() {
        this.box.destroy();
    }

    get x() { return this.box.x; }
    get y() { return this.box.y; }
    get width() { return this.box.width; }
    get height() { return this.box.height; }
    get rect() {
        return { 
            x: this.box.x,
            y: this.box.y, 
            width: this.box.width, 
            height: this.box.height 
        };
    }

    set rect(value) {
        this.box.init_rect(value.x, value.y, value.width, value.height);
    }

    contains(x, y) { return this.box.contains(x, y); }
    overlaps(rect) {
        return (rect.x < this.box.x + this.box.width) &&
            (rect.x + rect.width > this.box.x) &&
            (rect.y < this.box.y + this.box.width) &&
            (rect.y + rect.height > this.box.y);
    }

}
