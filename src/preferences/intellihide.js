import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

export const Intellihide = GObject.registerClass({
	GTypeName: 'Intellihide',
	Template: GLib.uri_resolve_relative(import.meta.url, '../ui/intellihidePage.ui', GLib.UriFlags.NONE),
	InternalChildren: [
		'enable_active_window',
	],
}, class Intellihide extends Adw.PreferencesPage {
	constructor(settings) {
		super({});

		this.settings = settings;

		this.settings.bind(
			'enable-active-window', 
			this._enable_active_window, 'active', 
			Gio.SettingsBindFlags.DEFAULT
		);
	}
});