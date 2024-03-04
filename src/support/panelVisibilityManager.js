// Note that the code in this file is taken from the HideTopBar Gnome Shell
// extension (https://gitlab.gnome.org/tuxor1337/hidetopbar) 
// but with significant modification. 
// HideTopbar is distributed under the terms of the GNU
// General Public License, version 3 or later.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Connections} from '../conveniences/connections.js';
import {DEBUG} from './logging.js';
import {Intellihide} from './intellihide.js';
import {DesktopIconsUsableAreaClass} from './desktopIconsIntegration.js';
import { PointerListener } from './PointerListener.js';
import { PanelPressureBarrier } from './PanelPressureBarrier.js';
import { TopPanelManager } from './TopPanelManager.js';
import { HotCornerManager } from './HotCornerManager.js';

// const MessageTray = Main.messageTray;

const TriggerType = {
    hidingOverview: "hiding-overview",
    init: "init",
    intellihide: "intellihide",
    mouseExitedMenu: "mouse-exited-menu",
    mouseSensitive: "mouse-sensitive",
    showingOverview: "showing-overview",
}

export class PanelVisibilityManager {
    #preferences = null;
    #hotCorner = new HotCornerManager();
    #topPanel = null;
    #panelPressureBarrier = null;
    #desktopIconsUsableArea = null;
    #intellihide = null;
    #pointerListener = null;
    #connection = new Connections();
    #mouseSensitive = true;
    #pressureThreshold = 100;
    #pressureTimeout = 1000;

    constructor(preferences, uuid) {
        this.#preferences = preferences;

        this.#desktopIconsUsableArea = new DesktopIconsUsableAreaClass(uuid);
        this.#intellihide = new Intellihide(this.#preferences, Main.layoutManager.primaryIndex);

        this.#topPanel = new TopPanelManager(this.#hotCorner, () => {
            this._bindUIChanges();
            this.#intellihide.enable();
        });


        // We lost the original notification's position because of PanelBox->affectsStruts = false
        // and now it appears beneath the top bar, fix it
        // this._oldTween = MessageTray._tween;
        // MessageTray._tween = function(actor, statevar, value, params)
        // {
        //     params.y += (PanelBox.y < 0 ? 0 : PanelBox.height);
        //     this._oldTween.apply(MessageTray, arguments);
        // }.bind(this);

        this.#pointerListener = new PointerListener((x,y) =>
            !this._animationActive && this.#intellihide.isPointerOutsideBox([x, y]) && this._handleMenus()
        );

        this.#panelPressureBarrier = new PanelPressureBarrier(
            this.#preferences, this.#topPanel, 
            () => this.autoShowEnabled && !this.#topPanel.visible && this.show(TriggerType.mouseSensitive)
        );

        // Load settings
        this._bindSettingsChanges();
        this.#pressureThreshold = this.#preferences.pointer.PRESSURE_THRESHOLD;
        this.#pressureTimeout = this.#preferences.pointer.PRESSURE_TIMEOUT;
        this.mouseSensitive = this.#preferences.pointer.MOUSE_SENSITIVE;
        this._updateSearchEntryPadding();
        this._updateIntellihideBox();
    }

    destroy() {
        DEBUG(`PanelVisibilityManager.destroy()`);
        this.#connection.disconnect_all();
        this.#intellihide.destroy();
        this.#preferences.disconnect_all_settings();
        this.#pointerListener.destroy();
        this.#panelPressureBarrier.destroy();

        if (this._searchEntryBin) {
          this._searchEntryBin.style = null;
        }

        // MessageTray._tween = this._oldTween;
        this.#topPanel.reset();
        this.#topPanel.destroy();
        this.#desktopIconsUsableArea.destroy();
        this.#desktopIconsUsableArea = null;
    }

    get autoShowEnabled() { 
        DEBUG(`PanelVisibilityManger.autoShowEnabled()`);
        let fullscreen = Main.layoutManager.primaryMonitor.inFullscreen;
        return !fullscreen && this.mouseSensitive || (fullscreen && this.#preferences.pointer.MOUSE_SENSITIVE_FULLSCREEN_WINDOW); 
    }

    get _searchEntryBin() {
        return Main.overview._overview._controls._searchEntryBin;
    }
    
    get mouseSensitive() { return this.#mouseSensitive; }
    set mouseSensitive(value) {
        this.#panelPressureBarrier.enabled = value;
        this.#mouseSensitive = value;
    }

    get pressureThreshold() { return this.#pressureThreshold; }
    set pressureThreshold(value) {
        if (this.#pressureThreshold !== value) {
            this.#pressureThreshold = value;
            // Calling enabled will reset the #panelPressureBarrier with new threshold
            this.#panelPressureBarrier.enabled = this.mouseSensitive;
        }
    }

    get pressureTimeout() { return this.#pressureTimeout; }
    set pressureTimeout(value) {
        if (this.#pressureTimeout !== value) {
            this.#pressureTimeout = value;
            // Calling enabled will reset the #panelPressureBarrier with new timeout
            this.#panelPressureBarrier.enabled = this.mouseSensitive;
        }
    }

    hide(trigger, animationTime) {
        DEBUG(`hide(${trigger})`);
        if (!this.#topPanel.visible) return; // Already hidden

        this.#pointerListener.stop();

        this.#topPanel.hide(animationTime ?? this.#preferences.animation.ANIMATION_TIME_AUTOHIDE);
    }

    show(trigger, animationTime) {
        DEBUG(`show(${trigger})`);
        if (this.#topPanel.visible) return; // Already visible

        if (trigger == TriggerType.showingOverview
            && this.#topPanel.contains(...global.get_pointer())
            && this.#preferences.HOTCORNER
        ) {
            this.#topPanel.reset();
        } else {
            this.#topPanel.show(animationTime ?? this.#preferences.animation.ANIMATION_TIME_AUTOHIDE, () => {
                this._updateIntellihideBox();

                if(this.#intellihide.isPointerOutsideBox())
                {
                    // The cursor has already left the panel, so we can
                    // start hiding the panel immediately.
                    this._handleMenus();
                } else {
                    // The cursor is still on the panel. Start watching the
                    // pointer so we know when it leaves the panel.
                    this.#pointerListener.start();
                }
            })
        }
    }

    _handleMenus() {
        if (Main.overview.visible) return;

        DEBUG(`_handleMenus()`);
        
        let blocker = Main.panel.menuManager.activeMenu;
        if (blocker) {
            this._blockerMenu = blocker;
            this._menuEvent = this._blockerMenu.connect(
                'open-state-changed',
                (menu, open) => {
                    if(!open && this._blockerMenu) {
                        this._blockerMenu.disconnect(this._menuEvent);
                        this._menuEvent=null;
                        this._blockerMenu=null;
                        this._handleMenus();
                    }
                }
            );
        } else if (this.#intellihide.overlaps && this.#intellihide.isPointerOutsideBox()) {
            this.hide(TriggerType.mouseExitedMenu);
        }
    }

    _updateIntellihideBox() {
        DEBUG("_updateIntellihideBox()");
        this.#intellihide.targetRect = this.#topPanel.adjustedRect;

        this.#desktopIconsUsableArea?.resetMargins();
        this.#desktopIconsUsableArea?.setMargins(-1, this.#topPanel.height, 0, 0, 0);
        // Calling enabled will reset the #panelPressureBarrier with new values
        this.#panelPressureBarrier.enabled = this.mouseSensitive;
    }

    _updateSearchEntryPadding() {
        DEBUG(`_updateSearchEntryPadding()`);
        const scale = Main.layoutManager.primaryMonitor.geometry_scale;
        const offset = this.#topPanel.height / scale; 
        this._searchEntryBin?.set_style(this.#preferences.SHOW_IN_OVERVIEW ? `padding-top: ${offset}px;` : null);
    }

    _autohideStatusChanged() {
        DEBUG(`_autohideStatusChanged()`);
        if (this.#intellihide.overlaps) {
            this.hide(TriggerType.intellihide);
        } else if (this.#preferences.SHOW_IN_OVERVIEW || !Main.overview.visible) {
            this.show(TriggerType.intellihide);
        }
    }

    _bindUIChanges() {
        this.#connection.connect(
            Main.overview,
            'showing',
            () => {
                if (this.#preferences.SHOW_IN_OVERVIEW) {
                    this.#topPanel.reset();
                } else {
                    this.hide(TriggerType.showingOverview, 0);
                } 
            }
        );
        this.#connection.connect(
            Main.overview,
            'hiding',
            () => {
                if (this.#intellihide.overlaps && this.#intellihide.isPointerOutsideBox()) {
                    this.hide(TriggerType.hidingOverview);
                } else {
                    this.show(TriggerType.hidingOverview);
                }
            }
        );
        this.#connection.connect(
            Main.panel,
            'leave-event',
            this._handleMenus.bind(this)
        );
        this.#connection.connect(
            this.#topPanel.panelBox,
            'notify::anchor-y',
            () => {
                this._updateIntellihideBox();
            }
        );
        this.#connection.connect(
            this.#topPanel.panelBox,
            'notify::height',
            this._updateSearchEntryPadding.bind(this)
        );
        this.#connection.connect(
            Main.layoutManager,
            'monitors-changed',
            () => {
                this._base_y = this.#topPanel.y;
                this._updateIntellihideBox();
            }
        );
        this.#connection.connect(
            this.#intellihide,
            'status-changed',
            this._autohideStatusChanged.bind(this)
        );
    }

    _bindSettingsChanges() {
        this.#preferences.ENABLE_ACTIVE_WINDOW_changed(
            () => this.#intellihide.forceUpdate()
        );
        this.#preferences.HOT_CORNER_changed(
            (value) => this.#hotCorner.isAlwaysEnabled = value
        );
        this.#preferences.SHOW_IN_OVERVIEW_changed(
            () => this._updateSearchEntryPadding()
        );
        this.#preferences.pointer.MOUSE_SENSITIVE_changed(
            (value) => this.mouseSensitive = value
        );
        this.#preferences.pointer.PRESSURE_THRESHOLD_changed(
            (value) => this.pressureThreshold = value
        );
        this.#preferences.pointer.PRESSURE_TIMEOUT_changed(
            (value) => this.#pressureTimeout = value
        );
    }
};
