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

// Note that the code in this file is taken from the Dash to Dock Gnome Shell
// extension (https://github.com/micheleg/dash-to-dock) with only minor
// modifications. Dash to Dock is distributed under the terms of the GNU
// General Public License, version 2 or later.


import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

const Signals = imports.signals;

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {getMonitorManager, DEBUG} from './convenience.js';
import { TargetBox } from './TargetBox.js';

// A good compromise between reactivity and efficiency; to be tuned.
const INTELLIHIDE_CHECK_INTERVAL = 100;

const OverlapStatus = {
    UNDEFINED: -1,
    FALSE: 0,
    TRUE: 1
};

const IntellihideMode = {
    ALL_WINDOWS: 0,
    FOCUS_APPLICATION_WINDOWS: 1,
    MAXIMIZED_WINDOWS : 2
};

// List of windows type taken into account. Order is important (keep the original
// enum order).
const handledWindowTypes = [
    Meta.WindowType.NORMAL,
    Meta.WindowType.DOCK,
    Meta.WindowType.DIALOG,
    Meta.WindowType.MODAL_DIALOG,
    Meta.WindowType.TOOLBAR,
    Meta.WindowType.MENU,
    Meta.WindowType.UTILITY,
    Meta.WindowType.SPLASHSCREEN
];

/**
 * A rough and ugly implementation of the intellihide behaviour.
 * Intellihide object: emit 'status-changed' signal when the overlap of windows
 * with the provided targetBoxClutter.ActorBox changes;
 */
export class Intellihide {
    #settings = null;
    #monitorIndex = null;
    #tracker = Shell.WindowTracker.get_default();
    #focusApp = null; // The application whose window is focused.
    #topApp = null; // The application whose window is on top on the monitor with the dock.
    #isEnabled = false;
    #status = OverlapStatus.UNDEFINED;
    #targetBox = new TargetBox();
    #checkOverlapTimeoutContinue = false;
    #checkOverlapTimeoutId = 0;
    #trackedWindows = new Map();

    constructor(settings, monitorIndex) {
        // Load settings
        this.#settings = settings;
        this.#monitorIndex = monitorIndex;

        // Connect global signals
        this.#settings.bindWithLabel('intellihide', [
            // Listen for notification banners to appear or disappear
            Main.messageTray,
            'show',
            this._checkOverlap.bind(this)
        ], [
            Main.messageTray,
            'hide',
            this._checkOverlap.bind(this)
        ], [
            // Add signals on windows created from now on
            global.display,
            'window-created',
            this._windowCreated.bind(this)
        ], [
            // triggered for instance when the window list order changes,
            // included when the workspace is switched
            global.display,
            'restacked',
            this._checkOverlap.bind(this)
        ], [
            // when windows are alwasy on top, the focus window can change
            // without the windows being restacked. Thus monitor window focus change.
            this.#tracker,
            'notify::focus-app',
            this._checkOverlap.bind(this)
        ], [
            // updates when monitor changes, for instance in multimonitor, when monitors are attached
            getMonitorManager(),
            'monitors-changed',
            this._checkOverlap.bind(this)
        ]);
    }

    destroy() {
        // Disconnect global signals
        this.#settings.unbindWithLabel('intellihide');

        this.#targetBox.destroy();

        // Remove  residual windows signals
        this.disable();
    }

    get enabled() { return this.#isEnabled; }
    set enabled(value) {
        value ? this.enable() : this.disable();
    }

    enable() {
        this.#isEnabled = true;
        this.#status = OverlapStatus.UNDEFINED;
        for (let wa of global.get_window_actors()) {
            this._addWindowSignals(wa);
        }
        this._doCheckOverlap();
    }

    disable() {
        this.#isEnabled = false;

        for (const wa of this.#trackedWindows.keys()) {
            this._removeWindowSignals(wa);
        }
        this.#trackedWindows.clear();

        if (this.#checkOverlapTimeoutId > 0) {
            GLib.source_remove(this.#checkOverlapTimeoutId);
            this.#checkOverlapTimeoutId = 0;
        }
    }

    isPointerInsideBox(point) {
        const [x, y] = point || global.get_pointer();
        return this.#targetBox.contains(x, y);
    }

    isPointerOutsideBox(point) {
        return !this.isPointerInsideBox(point);
    }

    _windowCreated(_, metaWindow) {
        this._addWindowSignals(metaWindow.get_compositor_private());
        this._doCheckOverlap();
    }

    _addWindowSignals(wa) {
        if (!this._handledWindow(wa)) return;
        const signalId = wa.connect('notify::allocation', this._checkOverlap.bind(this));
        this.#trackedWindows.set(wa, signalId);
        wa.connect('destroy', this._removeWindowSignals.bind(this));
    }

    _removeWindowSignals(wa) {
        if (this.#trackedWindows.get(wa)) {
           wa.disconnect(this.#trackedWindows.get(wa));
           this.#trackedWindows.delete(wa);
        }
    }

    get targetRect() { return this.#targetBox.rect; }

    /**
     * @param {Number[]} rect
     */
    set targetRect(rect) {
        DEBUG(`before: set targetRect({x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height}})`);
        this.#targetBox.rect = rect;

        this._checkOverlap();
    }

    forceUpdate() {
        this.#status = OverlapStatus.UNDEFINED;
        this._doCheckOverlap();
    }

    get overlaps() {
        return (this.#status == OverlapStatus.TRUE);
    }

    _checkOverlap() {
        DEBUG("_checkOverlap()");
        if (!this.enabled) return;

        /* Limit the number of calls to the doCheckOverlap function */
        if (this.#checkOverlapTimeoutId) {
            this.#checkOverlapTimeoutContinue = true;
            return;
        }

        this._doCheckOverlap();

        this.#checkOverlapTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, INTELLIHIDE_CHECK_INTERVAL, () => {
            this._doCheckOverlap();
            if (this.#checkOverlapTimeoutContinue) {
                this.#checkOverlapTimeoutContinue = false;
                return GLib.SOURCE_CONTINUE;
            } else {
                this.#checkOverlapTimeoutId = 0;
                return GLib.SOURCE_REMOVE;
            }
        });
    }

    _doCheckOverlap() {
        DEBUG("_doCheckOverlap()");
        if (!this.enabled) return;

        let overlaps = OverlapStatus.FALSE;
        let windows = global.get_window_actors().filter(wa => this._handledWindow(wa));

        /*
            * Get the top window on the monitor where the dock is placed.
            * The idea is that we dont want to overlap with the windows of the topmost application,
            * event is it's not the focused app -- for instance because in multimonitor the user
            * select a window in the secondary monitor.
            */

        let topWindow = windows.findLast(
            (win) => {
                const metaWin = win.get_meta_window();
                return metaWin.get_monitor() === this.#monitorIndex;
            })?.get_meta_window();
        if (topWindow) {
            this.#topApp = this.#tracker.get_window_app(topWindow);
            // If there isn't a focused app, use that of the window on top
            this.#focusApp = this.#tracker.focus_app || this.#topApp;

            windows = windows.filter(win => this._intellihideFilterInteresting(win));

            if (windows.some((win) => this.#targetBox.overlaps(win.get_meta_window().get_frame_rect()))) {
                overlaps = OverlapStatus.TRUE;
            }
        }

        // Check if notification banner overlaps
        if (overlaps != OverlapStatus.TRUE && Main.messageTray.visible) {
            if (this.#targetBox.overlaps(Main.messageTray._bannerBin.get_allocation_box())) {
                overlaps = OverlapStatus.TRUE;
            }
        }

        if (this.#status !== overlaps) {
            this.#status = overlaps;
            DEBUG(`Intellihide.emit status-changed to ${this.#status.toString()}`);
            this.emit('status-changed', this.#status);
        }
    }

    // Filter interesting windows to be considered for intellihide.
    // Consider all windows visible on the current workspace.
    // Optionally skip windows of other applications
    _intellihideFilterInteresting(wa) {
        let meta_win = wa.get_meta_window();
        if (!this._handledWindow(wa)) return false;

        let currentWorkspace = global.workspace_manager.get_active_workspace_index();
        let wksp_index = meta_win.get_workspace().index();

        // Depending on the intellihide mode, exclude non-relevent windows
        if (this.#settings.enableActiveWindow) {
                // Skip windows of other apps
                if (this.#focusApp) {
                    // The DropDownTerminal extension is not an application per se
                    // so we match its window by wm class instead
                    if (meta_win.get_wm_class() == 'DropDownTerminalWindow')
                        return true;

                    let currentApp = this.#tracker.get_window_app(meta_win);
                    let focusWindow = global.display.get_focus_window();

                    // Consider half maximized windows side by side
                    // and windows which are always on top
                    if((currentApp != this.#focusApp) && (currentApp != this.#topApp)
                        && !((focusWindow && focusWindow.maximized_vertically && !focusWindow.maximized_horizontally)
                              && (meta_win.maximized_vertically && !meta_win.maximized_horizontally)
                              && meta_win.get_monitor() == focusWindow.get_monitor())
                        && !meta_win.is_above())
                        return false;
                }
        }

        return ( wksp_index == currentWorkspace && meta_win.showing_on_its_workspace() );
    }

    // Filter windows by type
    // inspired by Opacify@gnome-shell.localdomain.pl
    _handledWindow(wa) {
        let metaWindow = wa.get_meta_window();

        if (!metaWindow) return false;

        const ignoreApps = [ "com.rastersoft.ding", "com.desktop.ding" ];
        const wmApp = metaWindow.get_gtk_application_id();
        if (ignoreApps.includes(wmApp) && metaWindow.is_skip_taskbar())
            return false;

        // The DropDownTerminal extension uses the POPUP_MENU window type hint
        // so we match its window by wm class instead
        if (metaWindow.get_wm_class() == 'DropDownTerminalWindow')
            return true;

        let wtype = metaWindow.get_window_type();
        for (const hwtype of handledWindowTypes) {
            if (hwtype == wtype)
                return true;
            else if (hwtype > wtype)
                return false;
        }

        return false;
    }
};

Signals.addSignalMethods(Intellihide.prototype);
