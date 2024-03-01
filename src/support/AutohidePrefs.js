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
		'spin_pressure_threshold',
		'spin_pressure_timeout'
	],
}, class AutohidePrefs extends Adw.PreferencesPage {
	constructor(settings) {
		super({});

		this.settings = settings;

		this.settings.bind(
			'enable-active-window', 
			this._enable_active_window, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'mouse-sensitive', 
			this._mouse_sensitive, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'mouse-sensitive-fullscreen-window', 
			this._mouse_sensitive_fullscreen_window, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'show-in-overview', 
			this._show_in_overview, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'hot-corner',
			this._hot_corner, 'active',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'animation-time-autohide',
			this._animation_time_autohide, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'pressure-threshold',
			this._spin_pressure_threshold, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);

		this.settings.bind(
			'pressure-timeout',
			this._spin_pressure_timeout, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);
	}
});