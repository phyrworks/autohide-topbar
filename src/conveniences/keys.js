import { Type } from './settings.js';

// This lists the preferences keys
export const Keys = [
    {
        component: "general", schemas: [
            { type: Type.I, name: "enable_active_window" },
            { type: Type.D, name: "show_in_overview" },
            { type: Type.C, name: "hot_corner" },
        ]
    },
    {
        component: "pointer", schemas: [
            { type: Type.B, name: "mouse_sensitive" },
            { type: Type.B, name: "mouse_sensitive_fullscreen_window" },
            { type: Type.I, name: "pressure_threshold" },
            { type: Type.D, name: "pressure_timeout" },
        ]
    },
    {
        component: "animation", schemas: [
            { type: Type.B, name: "animation_time_autohide" },
        ]
    },
];