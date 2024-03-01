/**
 * This file is part of Hide Top Bar
 *
 * Copyright 2020 Thomas Vogt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// const Gtk = imports.gi.Gtk;
// const GObject = imports.gi.GObject;

import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { Settings } from './conveniences/settings.js';
import { Keys } from './conveniences/keys.js';

import { AutohidePrefs } from './support/AutohidePrefs.js';

export default class HideTopBarPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        // load the icon theme
        let iconPath = this.dir.get_child("icons").get_path();
        let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(iconPath);
    }

    fillPreferencesWindow(window) {
        const preferences = new Settings(Keys, this.getSettings());
        

        window.add(new AutohidePrefs(preferences));
    }
}