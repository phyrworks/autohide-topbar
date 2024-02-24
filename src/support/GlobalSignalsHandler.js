// try to simplify global signals handling
export class GlobalSignalsHandler {
    constructor() {
        this._signals = new Object();
    }

    destroy() {
        for (let [, sigs] of Object.entries(this._signals)) {
            this._removeSignals(sigs);
        }
        delete this._signals;
    }

    add( ...args/* unlimited 3-long array arguments in the form [GObject, event, callback] */) {
        this._addSignals('generic', args);
    }

    bindWithLabel(label, ...elements/* plus unlimited 3-long array arguments in the form [GObject, event, callback] */) {
        this._addSignals(label, elements);
    }

    unbindWithLabel(label) {
        let sig = this._signals[label];
        if (sig) {
            this._removeSignals(sig);
            delete this._signals[label];
        }
    }

    _addSignals(label, elements) {
        if (!this._signals[label])
            this._signals[label] = new Array();
        let sigs = this._signals[label];
        for (let [obj, event, callback] of elements) {
            let id = obj.connect(event, callback);
            sigs.push([obj, id]);
        }
    }

    _removeSignals(sigs) {
        if (sigs) {
            for (let [object, id] of sigs) {
                object.disconnect(id);
            }
        }
    }
}
