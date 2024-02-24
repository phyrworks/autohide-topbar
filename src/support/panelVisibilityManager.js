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
import { PressureBarrier } from './PressureBarrier.js';
import { TopPanelManager } from './TopPanelManager.js';
import { SimpleTimeout } from './SimpleTimeout.js';
import { HotCornerManager } from './HotCornerManager.js';
import { PanelVisibilitySettings } from './PanelVisibilitySettings.js';

// const MessageTray = Main.messageTray;
export const ShellActionMode = (Shell.ActionMode)?Shell.ActionMode:Shell.KeyBindingMode;
const _searchEntryBin = Main.overview._overview._controls._searchEntryBin;

const TriggerType = {
    destroy: "destroy",
    hidingOverview: "hiding-overview",
    init: "init",
    intellihide: "intellihide",
    mouseEnter: "mouse-enter",
    mouseLeft: "mouse-left",
    showingOverview: "showing-overview",
}

export class PanelVisibilityManager {
    #preventHide = false;
    #settings = null;
    #hotCorner = new HotCornerManager();
    #topPanel = null;
    pressureBarrier = null;
    #desktopIconsUsableArea = null;
    #intellihide = null;
    #pointerListener = null;
    #bindTimeout = null;

    constructor(settings, monitorIndex, uuid) {
        this.#settings = new PanelVisibilitySettings(settings);
        this.#topPanel = new TopPanelManager(this.#hotCorner);
        this.pressureBarrier = new PressureBarrier(
            this.#settings, 
            this.#topPanel,
            () => this.show(this.#settings.animationTimeAutohide,TriggerType.mouseEnter)
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
            !this._animationActive && !this.#intellihide.isPointerInsideBox([x, y]) && this._handleMenus()
        );

        // Load settings
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();
        this._updateSearchEntryPadding();
        this._updateIntellihideBox();
        this.#bindTimeout = new SimpleTimeout(100, this._bindUIChanges.bind(this));
    }

    destroy() {
        this.#bindTimeout.destroy();
        this.#intellihide.destroy();
        this.#settings.destroy();
        Main.wm.removeKeybinding("shortcut-keybind");
        this.#pointerListener.destroy();
        this.pressureBarrier.destroy();

        if (_searchEntryBin) {
          _searchEntryBin.style = null;
        }

        // MessageTray._tween = this._oldTween;
        this.show(0, TriggerType.destroy);

        this.#topPanel.destroy();

        this.#desktopIconsUsableArea.destroy();
        this.#desktopIconsUsableArea = null;
    }

    hide(animationTime, trigger) {
        DEBUG("hide(" + trigger + ")");
        if(this.#preventHide) return;

        if(trigger == TriggerType.mouseLeft && this.#intellihide.isPointerInsideBox()) return;

        this.#pointerListener.stop();

        this.#topPanel.hide(animationTime);
    }

    show(animationTime, trigger) {
        DEBUG("show(" + trigger + ")");
        if(trigger == TriggerType.mouseEnter
           && this.#settings.mouseTriggersOverview) {
            Main.overview.show();
        }

        if (
            trigger == TriggerType.destroy
            || (
                trigger == TriggerType.showingOverview
                && global.get_pointer()[1] < this.#topPanel.height
                && this.#settings.hotCorner
                )
          ) {
            this.#topPanel.reset();
        } else {
            this.#topPanel.show(animationTime, () => {
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
        if(!Main.overview.visible) {
            let blocker = Main.panel.menuManager.activeMenu;
            if(!blocker) {
                this.hide(
                    this.#settings.animationTimeAutohide,
                    TriggerType.mouseLeft
                );
            } else {
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
            }
        }
    }

    _updateIntellihideBox() {
        DEBUG("_updateIntellihideBox()");
        this.#intellihide.targetRect = this.#topPanel.adjustedRect;

        this.#desktopIconsUsableArea.resetMargins();
        this.#desktopIconsUsableArea.setMargins(-1, this.#topPanel.height, 0, 0, 0);
    }

    _updateSettingsMouseSensitive() {
        this.pressureBarrier.enabled = this.#settings.mouseSensitive;
    }

    _updateSearchEntryPadding() {
        if (!_searchEntryBin) return;
        const scale = Main.layoutManager.primaryMonitor.geometry_scale;
        const offset = this.#topPanel.height / scale; 
        _searchEntryBin.set_style(this.#settings.showInOverview ? `padding-top: ${offset}px;` : null);
    }

    _updateIntellihideStatus() {
        if(this.#settings.enableIntellihide) {
            this.#preventHide = false;
            this.#intellihide.enable();
        } else {
            this.#intellihide.disable();
            this.#preventHide = false;
            this.hide(0, TriggerType.init);
        }
    }

    _updatePreventHide() {
        if(!this.#intellihide.enabled) return;

        this.#preventHide = !this.#intellihide.overlaps;

        let animTime = this.#settings.animationTimeAutohide;
        if(this.#preventHide) {
            if (this.#settings.showInOverview || !Main.overview.visible)
                this.show(animTime, TriggerType.intellihide);
        } else if(!Main.overview.visible)
            this.hide(animTime, TriggerType.intellihide);
    }

    _bindUIChanges() {
        this.#settings.add(
            [
                Main.overview,
                'showing',
                () => {
                    this.show(
                        this.#settings.animationTimeOverview,
                        TriggerType.showingOverview
                    );
                }
            ],
            [
                Main.overview,
                'hiding',
                () => {
                    this.hide(
                        this.#settings.animationTimeOverview,
                        TriggerType.hidingOverview
                    );
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
                this._updatePreventHide.bind(this)
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
