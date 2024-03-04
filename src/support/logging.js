import Meta from 'gi://Meta';

export function DEBUG(message) {
    // Enable for debugging purposes.
    print(`${Date().substring(16,24)} [autohide-topbar]:  ${message}`);
}

export function WARN(message) {
    console.warn(`[autohide-topbar]:  ${message}`);
}

export function ERROR(message) {
    console.error(`[autohide-topbar]:  ${message}`);
}

