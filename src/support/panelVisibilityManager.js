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

import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DEBUG} from './convenience.js';
import {Intellihide} from './intellihide.js';
import {DesktopIconsUsableAreaClass} from './desktopIconsIntegration.js';
import { PointerListener } from './PointerListener.js';
import { PanelPressureBarrier } from './PanelPressureBarrier.js';
import { TopPanelManager } from './TopPanelManager.js';
import { SimpleTimeout } from './SimpleTimeout.js';
import { HotCornerManager } from './HotCornerManager.js';
import { PanelVisibilitySettings } from './PanelVisibilitySettings.js';

// const MessageTray = Main.messageTray;
export const ShellActionMode = (Shell.ActionMode)?Shell.ActionMode:Shell.KeyBindingMode;
const _searchEntryBin = Main.overview._overview._controls._searchEntryBin;

const TriggerType = {
    hidingOverview: "hiding-overview",
    init: "init",
    intellihide: "intellihide",
    mouseExitedMenu: "mouse-exited-menu",
    mouseSensitive: "mouse-sensitive",
    showingOverview: "showing-overview",
}

export class PanelVisibilityManager {
    #settings = null;
    #hotCorner = new HotCornerManager();
    #topPanel = null;
    #panelPressureBarrier = null;
    #desktopIconsUsableArea = null;
    #intellihide = null;
    #pointerListener = null;
    #bindTimeout = null;

    constructor(settings, monitorIndex, uuid) {
        this.#settings = new PanelVisibilitySettings(settings);
        this.#topPanel = new TopPanelManager(this.#hotCorner);
        this.pressureBarrier = new PanelPressureBarrier(
            this.#settings, 
            this.#topPanel,
            (_) => this.autoShowEnabled && 
                    this.show(TriggerType.mouseSensitive)
        );

        this.#desktopIconsUsableArea = new DesktopIconsUsableAreaClass(uuid);
        this.#intellihide = new Intellihide(this.#settings, monitorIndex);

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

        this.#panelPressureBarrier = new PanelPressureBarrier(this.#settings, this.#topPanel, () => 
            this.autoShowEnabled && this.show(TriggerType.mouseSensitive)
        );

        // Load settings
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();
        this._updateSearchEntryPadding();
        this._updateIntellihideBox();
        this.#bindTimeout = new SimpleTimeout(100, this._bindUIChanges.bind(this));
    }

    destroy() {
        DEBUG(`PanelVisibilityManager.destroy()`);
        this.#bindTimeout.destroy();
        this.#intellihide.destroy();
        this.#settings.destroy();
        Main.wm.removeKeybinding("shortcut-keybind");
        this.#pointerListener.destroy();
        this.#panelPressureBarrier.destroy();

        if (_searchEntryBin) {
          _searchEntryBin.style = null;
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
        return !fullscreen && this.#settings.mouseSensitive || (fullscreen && this.#settings.mouseSensitiveFullscreenWindow); 
    }

    hide(trigger, animationTime) {
        DEBUG(`hide(${trigger})`);
        if (!this.#topPanel.visible) return; // Already hidden

        this.#pointerListener.stop();

        this.#topPanel.hide(animationTime ?? this.#settings.animationTimeAutohide);
    }

    show(trigger, animationTime) {
        DEBUG(`show(${trigger})`);
        if (this.#topPanel.visible) return; // Already visible

        if (trigger == TriggerType.showingOverview
            && this.#topPanel.contains(...global.get_pointer())
            && this.#settings.hotCorner
        ) {
            this.#topPanel.reset();
        } else {
            this.#topPanel.show(animationTime ?? this.#settings.animationTimeAutohide, () => {
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

        this.#desktopIconsUsableArea.resetMargins();
        this.#desktopIconsUsableArea.setMargins(-1, this.#topPanel.height, 0, 0, 0);
    }

    _updateSettingsMouseSensitive() {
        DEBUG(`_updateSettingsMouseSensitive()`);
        this.#panelPressureBarrier.enabled = this.#settings.mouseSensitive;
    }

    _updateSearchEntryPadding() {
        DEBUG(`_updateSearchEntryPadding()`);
        if (!_searchEntryBin) return;
        const scale = Main.layoutManager.primaryMonitor.geometry_scale;
        const offset = this.#topPanel.height / scale; 
        _searchEntryBin.set_style(this.#settings.showInOverview ? `padding-top: ${offset}px;` : null);
    }

    _updateIntellihideStatus() {
        if(this.#settings.enableIntellihide) {
            this.#intellihide.enable();
        } else {
            this.#intellihide.disable();
        }
    }

    _autohideStatusChanged() {
        DEBUG(`_autohideStatusChanged()`);
        if (this.#intellihide.overlaps) {
            this.hide(TriggerType.intellihide);
        } else if (this.#settings.showInOverview || !Main.overview.visible) {
            this.show(TriggerType.intellihide);
        }
    }

    _bindUIChanges() {
        this.#settings.add(
            [
                Main.overview,
                'showing',
                () => {
                    if (this.#settings.showInOverview) {
                        this.#topPanel.reset();
                    } else {
                        this.hide(TriggerType.showingOverview, 0);
                    } 
                }
            ],
            [
                Main.overview,
                'hiding',
                () => {
                    if (this.#intellihide.overlaps && this.#intellihide.isPointerOutsideBox()) {
                        this.hide(TriggerType.hidingOverview);
                    } else {
                        this.show(TriggerType.hidingOverview);
                    }
                }
            ],
            [
                Main.panel,
                'leave-event',
                this._handleMenus.bind(this)
            ],
            [
                this.#topPanel.panelBox,
                'notify::anchor-y',
                () => {
                    this._updateIntellihideBox();
                    this._updateSettingsMouseSensitive();
                }
            ],
            [
                this.#topPanel.panelBox,
                'notify::height',
                this._updateSearchEntryPadding.bind(this)
            ],
            [
                Main.layoutManager,
                'monitors-changed',
                () => {
                    this._base_y = this.#topPanel.y;
                    this._updateIntellihideBox();
                    this._updateSettingsMouseSensitive();
                }
            ],
            [
                this.#intellihide,
                'status-changed',
                this._autohideStatusChanged.bind(this)
            ]
        );

        if (!this.#topPanel.panelBox.has_allocation()) {
          // after login, allocating the panel can take a second or two
          let tmp_handle = this.#topPanel.panelBox.connect("notify::allocation", () => {
            this._updateIntellihideStatus();
            this.#topPanel.panelBox.disconnect(tmp_handle);
          });
        } else {
          this._updateIntellihideStatus();
        }

        this.#bindTimeout.disable();
        return false;
    }

    _bindSettingsChanges() {
        this.#settings.bindSettings(
            [
                'changed::hot-corner',
                (value) => this.#hotCorner.isAlwaysEnabled = value
            ],
            [
                'changed::mouse-sensitive',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                'changed::pressure-timeout',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                'changed::pressure-threshold',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [ 
                'changed::show-in-overview',
                this._updateSearchEntryPadding.bind(this)
            ],
            [
                'changed::enable-intellihide',
                this._updateIntellihideStatus.bind(this)
            ],
            [
                'changed::enable-active-window',
                this._updateIntellihideStatus.bind(this)
            ]
        );
    }
};
