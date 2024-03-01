import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

export const AutohidePrefs = GObject.registerClass({
	GTypeName: 'AutohidePrefs',
	Template: GLib.uri_resolve_relative(import.meta.url, '../ui/AutohidePrefs.ui', GLib.UriFlags.NONE),
	InternalChildren: [
		'enable_active_window',
		'mouse_sensitive',
		'mouse_sensitive_fullscreen_window',
		'show_in_overview',
		'hot_corner',
		'animation_time_autohide',
		'pressure_threshold',
		'pressure_timeout'
	],
}, class AutohidePrefs extends Adw.PreferencesPage {
	constructor(preferences) {
		super({});

		this.preferences = preferences;

		print(JSON.stringify(this.preferences, null, 4));

		this.preferences.settings.bind(
			'enable-active-window', 
			this._enable_active_window, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.settings.bind(
			'show-in-overview', 
			this._show_in_overview, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.settings.bind(
			'hot-corner',
			this._hot_corner, 'active',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.pointer.settings.bind(
			'mouse-sensitive', 
			this._mouse_sensitive, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.pointer.settings.bind(
			'mouse-sensitive-fullscreen-window', 
			this._mouse_sensitive_fullscreen_window, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.pointer.settings.bind(
			'pressure-threshold',
			this._pressure_threshold, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.pointer.settings.bind(
			'pressure-timeout',
			this._pressure_timeout, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.preferences.animation.settings.bind(
			'animation-time-autohide',
			this._animation_time_autohide, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);
	}
});