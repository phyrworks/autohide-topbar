import { GlobalSignalsHandler } from './GlobalSignalsHandler.js';

export class PanelVisibilitySettings extends GlobalSignalsHandler {
    constructor(settings) {
        super();
        this.settings = settings;
    }

    get animationTimeAutohide() { return this.settings.get_double('animation-time-autohide'); }
    get enableActiveWindow() { return this.settings.get_boolean('enable-active-window') }
    get enableIntellihide() { return this.settings.get_boolean('enable-intellihide'); }
    get hotCorner() { return this.settings.get_boolean('hot-corner'); }
    get mouseSensitive() { return this.settings.get_boolean('mouse-sensitive'); }
    get mouseSensitiveFullscreenWindow() { return this.settings.get_boolean('mouse-sensitive-fullscreen-window') }
    get pressureThreshold() { return this.settings.get_int('pressure-threshold'); }
    get pressureTimeout() { return this.settings.get_int('pressure-timeout'); }
    get showInOverview() { return this.settings.get_boolean('show-in-overview'); }

    bindSettings(...elements/* plus unlimited 2-long array arguments in the form [event, callback].  this.settings is used for the GObject. */ ) {
        this._addSignals("settings", elements.map(v => [this.settings, v[0], v[1]]));
    }

    unbindSettings() {
        this.unbindWithLabel("settings");
    }
}
