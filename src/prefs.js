import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { Settings } from './conveniences/settings.js';
import { PreferencesKeys } from './support/PreferencesKeys.js';

import { AutohidePrefs } from './support/AutohidePrefs.js';

export default class AutohideTopbarPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        // load the icon theme
        let iconPath = this.dir.get_child("icons").get_path();
        let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(iconPath);
    }

    fillPreferencesWindow(window) {
        const preferences = new Settings(PreferencesKeys, this.getSettings());
        
        window.add(new AutohidePrefs(preferences));
    }
}