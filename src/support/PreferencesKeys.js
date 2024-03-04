import { Type } from '../conveniences/settings.js';

// This lists the preferences keys
export const PreferencesKeys = [
    {
        component: "general", schemas: [
            { type: Type.B, name: "enable-active-window" },
            { type: Type.B, name: "show-in-overview" },
            { type: Type.B, name: "hot-corner" },
        ]
    },
    {
        component: "pointer", schemas: [
            { type: Type.B, name: "mouse-sensitive" },
            { type: Type.B, name: "mouse-sensitive-fullscreen-window" },
            { type: Type.I, name: "pressure-threshold" },
            { type: Type.I, name: "pressure-timeout" },
        ]
    },
    {
        component: "animation", schemas: [
            { type: Type.D, name: "animation-time-autohide" },
        ]
    },
];