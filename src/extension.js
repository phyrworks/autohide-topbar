import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {PanelVisibilityManager} from './support/panelVisibilityManager.js';
import { Settings } from './conveniences/settings.js';
import { PreferencesKeys } from './support/PreferencesKeys.js';
import {DEBUG} from './support/logging.js';

export default class AutohideTopbar_Extension extends Extension {
  constructor(metaData) {
    super(metaData);
  }

  enable() {
      DEBUG("enable()");
      this.preferences = new Settings(PreferencesKeys, this.getSettings());
      this.pvManager = new PanelVisibilityManager(this.preferences, this.uuid);
  }

  disable() {
      DEBUG("disable()");
      this.pvManager.destroy();
      this.preferences.disconnect_all_settings();
  }

  destroy() {
    this.disable();
  }
}
