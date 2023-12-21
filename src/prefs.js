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

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { Animation } from './preferences/animation.js';
import { Sensitivity } from './preferences/sensitivity.js';

// const Gettext = imports.gettext.domain('hidetopbar');
// const _ = Gettext.gettext;

// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

export default class HideTopBar_Preferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {

        const preferences = this.getSettings();

        window.add(new Sensitivity(preferences));
        window.add(new Animation(preferences));

        // let builder = new Gtk.Builder();
        // builder.set_translation_domain("hidetopbar");
        // let settingsPath = this.dir.get_child("ui").get_path() ;
        // builder.add_from_file(this.uiPath + "/sensitivity.ui");

        // // let notebook = builder.get_object("settings_notebook");

        // // Create a preferences page, with a single group
        // const page = new Adw.PreferencesPage({
        //     title: _('Appearance'),
        //     icon_name: 'dialog-information-symbolic',
        // });

        // window.add(page);

        // let prefs_page = builder.get_object("sensitivity_page");

        // window.add(prefs_page);




    //     const group = new Adw.PreferencesGroup({
    //         title: _('Appearance'),
    //         description: _('Configure the appearance of the extension'),
    //     });
    //     page.add(group);

    //     group.add(notebook);

    // /******************************************************************************
    //  ************************************** Section Sensitivity *******************
    // ******************************************************************************/

    //     ['mouse-sensitive',
    //     'mouse-sensitive-fullscreen-window',
    //     'show-in-overview',
    //     'hot-corner',
    //     'mouse-triggers-overview',
    //     'keep-round-corners'
    //     ].forEach((s) => {
    //         let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
    //         settings_onoff.set_active(this.settings.get_boolean(s));
    //         settings_onoff.connect('notify::active', (w) => {
    //             this.settings.set_boolean(s, w.active);
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_onoff.set_active(this.settings.get_boolean(b));
    //         });
    //     });

    //     ['pressure-threshold',
    //     'pressure-timeout'
    //     ].forEach((s) => {
    //         let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
    //         settings_spin.set_value(this.settings.get_int(s));
    //         settings_spin.connect('value-changed', (w) => {
    //             this.settings.set_int(s, w.get_value());
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_spin.set_value(this.settings.get_int(b));
    //         });
    //     });

    // /******************************************************************************
    //  ************************************** Section Animation *********************
    // ******************************************************************************/

    //     ['animation-time-overview',
    //     'animation-time-autohide',
    //     ].forEach((s) => {
    //         let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
    //         settings_spin.set_value(this.settings.get_double(s));
    //         settings_spin.connect('value-changed', (w) => {
    //             this.settings.set_double(s, w.get_value());
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_spin.set_value(this.settings.get_double(b));
    //         });
    //     });

    // /******************************************************************************
    //  ************************************** Section Shortcuts *********************
    // ******************************************************************************/

    // /* ++++++++++++++++++++++++++++++++++++ Keyboard accelerator +++++ */

    //     let model = builder.get_object("store_shortcut_keybind");
    //     let model_row = model.get_iter_first()[1];
    //     let binding = this.settings.get_strv('shortcut-keybind')[0],
    //         binding_key,
    //         binding_mods;
    //     if (binding) {
    //         [binding_key, binding_mods] = Gtk.accelerator_parse(binding);
    //     } else {
    //         [binding_key, binding_mods] = [0, 0];
    //     }
    //     model.set(model_row, [0, 1], [binding_mods, binding_key]);

    //     let cellrend = builder.get_object("accel_shortcut_keybind");

    //     cellrend.connect('accel-edited', (rend, iter, binding_key, binding_mods) => {
    //         let value = Gtk.accelerator_name(binding_key, binding_mods);
    //         let [succ, iterator] = model.get_iter_from_string(iter);

    //         if (!succ) {
    //             throw new Error("Error updating keybinding");
    //         }

    //         model.set(iterator, [0, 1], [binding_mods, binding_key]);
    //         this.settings.set_strv('shortcut-keybind', [value]);
    //     });

    //     cellrend.connect('accel-cleared', (rend, iter, binding_key, binding_mods) => {
    //         let [succ, iterator] = model.get_iter_from_string(iter);

    //         if (!succ) {
    //             throw new Error("Error clearing keybinding");
    //         }

    //         model.set(iterator, [0, 1], [0, 0]);
    //         this.settings.set_strv('shortcut-keybind', []);
    //     });

    //     this.settings.connect('changed::shortcut-keybind', (k, b) => {
    //         let binding = this.settings.get_strv('shortcut-keybind')[0];
    //         let binding_key = binding_mods = 0;
    //         if (binding) {
    //             [binding_key, binding_mods] = Gtk.accelerator_parse(binding);
    //         }
    //         model.set(model_row, [0, 1], [binding_mods, binding_key]);
    //     });

    // /* ++++++++++++++++++++++++++++++++++++ End: Keyboard accelerator +++++ */

    //     ['shortcut-delay',
    //     ].forEach((s) => {
    //         let settings_spin = builder.get_object("spin_" + s.replace(/-/g, "_"));
    //         settings_spin.set_value(this.settings.get_double(s));
    //         settings_spin.connect('value-changed', (w) => {
    //             this.settings.set_double(s, w.get_value());
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_spin.set_value(this.settings.get_double(b));
    //         });
    //     });

    //     ['shortcut-toggles',
    //     ].forEach((s) => {
    //         let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
    //         settings_onoff.set_active(this.settings.get_boolean(s))
    //         settings_onoff.connect('notify::active', (w) => {
    //             this.settings.set_boolean(s, w.active);
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_onoff.set_active(this.settings.get_boolean(b));
    //         });
    //     });

    // /******************************************************************************
    //  ************************************** Section Intellihide *******************
    // ******************************************************************************/

    //     ['enable-intellihide',
    //     'enable-active-window',
    //     ].forEach((s) => {
    //         let settings_onoff = builder.get_object("toggle_" + s.replace(/-/g, "_"));
    //         settings_onoff.set_active(this.settings.get_boolean(s))
    //         settings_onoff.connect('notify::active', (w) => {
    //             this.settings.set_boolean(s, w.active);
    //         });
    //         this.settings.connect('changed::' + s, (k,b) => {
    //             settings_onoff.set_active(this.settings.get_boolean(b));
    //         });
    //     });
    }
}