import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

export const Animation = GObject.registerClass({
	GTypeName: 'Animation',
	Template: GLib.uri_resolve_relative(import.meta.url, '../ui/animationPage.ui', GLib.UriFlags.NONE),
	InternalChildren: [
        'animation_time_autohide'
	],
}, class Sensitivity extends Adw.PreferencesPage {
	constructor(settings) {
		super({});

		this.settings = settings;

		this.settings.bind(
			'animation-time-autohide',
			this._animation_time_autohide, 'value',
			Gio.SettingsBindFlags.DEFAULT
		);
	}
});