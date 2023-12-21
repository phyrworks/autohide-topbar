import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

export const Sensitivity = GObject.registerClass({
	GTypeName: 'Sensitivity',
	Template: GLib.uri_resolve_relative(import.meta.url, '../ui/sensitivity.ui', GLib.UriFlags.NONE),
	InternalChildren: [
		'mouse_sensitive',
		'mouse_sensitive_fullscreen_window',
		'show_in_overview',
		'hot_corner',
		'mouse_triggers_overview',
		'keep_round_corners',
		'spin_pressure_threshold',
		'spin_pressure_timeout'
	],
}, class Sensitivity extends Adw.PreferencesPage {
	constructor(settings) {
		super({});

		this.settings = settings;

		this.settings.bind(
			'mouse-sensitive', this._mouse_sensitive, 'active', 
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
			'mouse-triggers-overview',
			this._mouse_triggers_overview, 'active',
			Gio.SettingsBindFlags.DEFAULT
		);
		this.settings.bind(
			"keep-round-corners",
			this._keep_round_corners, 'active',
			Gio.SettingsBindFlags.DEFAULT
		);
		this.settings.bind(
			'spin-pressure-threshold',
			this._spin_pressure_threshold, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);
		this.settings.bind(
			'spin-pressure-timeout',
			this._spin_pressure_timeout, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);
	}
});