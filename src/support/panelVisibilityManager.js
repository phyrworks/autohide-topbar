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

import {DEBUG, GlobalSignalsHandler} from './convenience.js';
import {Intellihide} from './intellihide.js';
import {DesktopIconsUsableAreaClass} from './desktopIconsIntegration.js';
import { PointerListener } from './PointerListener.js';
import { PressureBarrier } from './PressureBarrier.js';
import { TopPanelManager } from './TopPanelManager.js';
import { SimpleTimeout } from './SimpleTimeout.js';
import { HotCornerManager } from './HotCornerManager.js';

// const MessageTray = Main.messageTray;
export const ShellActionMode = (Shell.ActionMode)?Shell.ActionMode:Shell.KeyBindingMode;
const _searchEntryBin = Main.overview._overview._controls._searchEntryBin;

export class PanelVisibilityManager {

    constructor(settings, monitorIndex, uuid) {
        this._settings = settings;
        this._preventHide = false;
        this._showInOverview = true;
        this._hotCorner = new HotCornerManager();
        this._topPanel = new TopPanelManager(this._hotCorner);
        this._pressureBarrier = PressureBarrier(settings, this._topPanel);

        this._desktopIconsUsableArea = new DesktopIconsUsableAreaClass(uuid);

        // We lost the original notification's position because of PanelBox->affectsStruts = false
        // and now it appears beneath the top bar, fix it
        // this._oldTween = MessageTray._tween;
        // MessageTray._tween = function(actor, statevar, value, params)
        // {
        //     params.y += (PanelBox.y < 0 ? 0 : PanelBox.height);
        //     this._oldTween.apply(MessageTray, arguments);
        // }.bind(this);

        this._pointerListener = new PointerListener(this._handlePointer.bind(this));

        // Load settings
        this._bindSettingsChanges();
        this._updateSettingsMouseSensitive();
        this._updateSettingsShowInOverview();
        this._intellihide = new Intellihide(this._settings, monitorIndex);

        this._updateHotCorner(false);
        this._updateIntellihideBox();
        this._bindTimeout = new SimpleTimeout(100, this._bindUIChanges.bind(this));
    }

    hide(animationTime, trigger) {
        DEBUG("hide(" + trigger + ")");
        if(this._preventHide) return;

        if(trigger == "mouse-left" && this._intellihide.isPointerInsideBox()) return;

        this._pointerListener.stop();

        this._topPanel.hide(animationTime, () => this._updateHotCorner(true));
    }

    show(animationTime, trigger) {
        DEBUG("show(" + trigger + ")");
        if(trigger == "mouse-enter"
           && this._settings.get_boolean('mouse-triggers-overview')) {
            Main.overview.show();
        }

        this._updateHotCorner(false);
        if(trigger == "destroy"
           || (
               trigger == "showing-overview"
               && global.get_pointer()[1] < this._topPanel.panelBox.height
               && this._settings.get_boolean('hot-corner')
              )
          ) {
            this._topPanel.reset();
        } else {
            this._topPanel.show(animationTime, () => {
                this._updateIntellihideBox();

                if(this._intellihide.isPointerOutsideBox())
                {
                    // The cursor has already left the panel, so we can
                    // start hiding the panel immediately.
                    this._handleMenus();
                } else {
                    // The cursor is still on the panel. Start watching the
                    // pointer so we know when it leaves the panel.
                    this._pointerListener.start();
                }
            })
        }
    }

    _handlePointer(x, y) {
        if(!this._animationActive && !this._intellihide.isPointerInsideBox([x, y])) {
            this._handleMenus();
        }
    }

    _handleMenus() {
        if(!Main.overview.visible) {
            let blocker = Main.panel.menuManager.activeMenu;
            if(blocker == null) {
                this.hide(
                    this._settings.get_double('animation-time-autohide'),
                    "mouse-left"
                );
            } else {
                this._blockerMenu = blocker;
                this._menuEvent = this._blockerMenu.connect(
                    'open-state-changed',
                    (menu, open) => {
                        if(!open && this._blockerMenu !== null) {
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
        this._intellihide.targetRect = this._topPanel.adjustedRect;

        this._desktopIconsUsableArea.resetMargins();
        this._desktopIconsUsableArea.setMargins(-1, this._topPanel.height, 0, 0, 0);
    }

    _updateHotCorner(panel_hidden) {
        DEBUG("_updateHotCorner(" + panel_hidden + ")");
        let hotCorner = Main.layoutManager.hotCorner.find((hc) => hc != null);
        if(hotCorner) {
          if(!panel_hidden || this._settings.get_boolean('hot-corner')) {
              hotCorner.setBarrierSize(this._topPanel.panelBox.height);
          } else {
              GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, function () {
                  hotCorner.setBarrierSize(0)
              });
          }
        }
    }

    // _updateSettingsHotCorner() {
    //     this.hide(0.1, "hot-corner-setting-changed");
    // }

    _updateSettingsMouseSensitive(value) {
        this._pressureBarrier.enabled = this._settings.get_boolean('mouse-sensitive');
    }
    
    _updateSettingsShowInOverview() {
        this._showInOverview = this._settings.get_boolean('show-in-overview');
        this._updateSearchEntryPadding();
    }

    _updateSearchEntryPadding() {
        if (!_searchEntryBin) return;
        const scale = Main.layoutManager.primaryMonitor.geometry_scale;
        const offset = this._topPanel.panelBox.height / scale; 
        _searchEntryBin.set_style(this._showInOverview ? `padding-top: ${offset}px;` : null);
    }

    _updateIntellihideStatus() {
        if(this._settings.get_boolean('enable-intellihide')) {
            this._preventHide = false;
            this._intellihide.enable();
        } else {
            this._intellihide.disable();
            this._preventHide = false;
            this.hide(0, "init");
        }
    }

    _updatePreventHide() {
        if(!this._intellihide.isEnabled()) return;

        this._preventHide = !this._intellihide.overlapStatus;

        let animTime = this._settings.get_double('animation-time-autohide');
        if(this._preventHide) {
            if (this._showInOverview || !Main.overview.visible)
                this.show(animTime, "intellihide");
        } else if(!Main.overview.visible)
            this.hide(animTime, "intellihide");
    }

    _bindUIChanges() {
        this._signalsHandler = new GlobalSignalsHandler();
        this._signalsHandler.add(
            [
                Main.overview,
                'showing',
                () => {
                    this.show(
                        this._settings.get_double('animation-time-overview'),
                        "showing-overview"
                    );
                }
            ],
            [
                Main.overview,
                'hiding',
                () => {
                    this.hide(
                        this._settings.get_double('animation-time-overview'),
                        "hiding-overview"
                    );
                }
            ],
            [
                Main.panel,
                'leave-event',
                this._handleMenus.bind(this)
            ],
            [
                this._topPanel.panelBox,
                'notify::anchor-y',
                () => {
                    this._updateIntellihideBox();
                    this._updateSettingsMouseSensitive();
                }
            ],
            [
                this._topPanel.panelBox,
                'notify::height',
                this._updateSearchEntryPadding.bind(this)
            ],
            [
                Main.layoutManager,
                'monitors-changed',
                () => {
                    this._base_y = this._topPanel.panelBox.y;
                    this._updateIntellihideBox();
                    this._updateSettingsMouseSensitive();
                }
            ],
            [
                this._intellihide,
                'status-changed',
                this._updatePreventHide.bind(this)
            ]
        );

        if (!this._topPanel.panelBox.has_allocation()) {
          // after login, allocating the panel can take a second or two
          let tmp_handle = this._topPanel.panelBox.connect("notify::allocation", () => {
            this._updateIntellihideStatus();
            this._topPanel.panelBox.disconnect(tmp_handle);
          });
        } else {
          this._updateIntellihideStatus();
        }

        this._bindTimeout.disable();
        return false;
    }

    _bindSettingsChanges() {
        this._signalsHandler = new GlobalSignalsHandler();
        this._signalsHandler.addWithLabel("settings",
            [
                this._settings,
                'changed::hot-corner',
                this._hotCorner.isAlwaysEnabled(this)
            ],
            [
                this._settings,
                'changed::mouse-sensitive',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                this._settings,
                'changed::pressure-timeout',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [
                this._settings,
                'changed::pressure-threshold',
                this._updateSettingsMouseSensitive.bind(this)
            ],
            [ 
                this._settings,
                'changed::show-in-overview',
                this._updateSettingsShowInOverview.bind(this)
            ],
            [
                this._settings,
                'changed::enable-intellihide',
                this._updateIntellihideStatus.bind(this)
            ],
            [
                this._settings,
                'changed::enable-active-window',
                this._updateIntellihideStatus.bind(this)
            ]
        );
    }

    destroy() {
        this._bindTimeout.destroy();
        this._intellihide.destroy();
        this._signalsHandler.destroy();
        Main.wm.removeKeybinding("shortcut-keybind");
        this._pointerListener.destroy();
        this._pressureBarrier.destroy();

        if (_searchEntryBin) {
          _searchEntryBin.style = null;
        }

        // MessageTray._tween = this._oldTween;
        this.show(0, "destroy");

        this._topPanel.destroy();

        this._desktopIconsUsableArea.destroy();
        this._desktopIconsUsableArea = null;
    }
};
