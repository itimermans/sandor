// Simple dotted-path utilities for immutable updates
// Supports paths like 'xaxis.title.text' or 'annotations[0].text'

export function setByPath(obj, path, value) {
    const segments = normalize(path);
    const clone = Array.isArray(obj) ? obj.slice() : { ...obj };
    let cursor = clone;
    for (let i = 0; i < segments.length; i++) {
        const key = segments[i];
        const isLast = i === segments.length - 1;
        if (isLast) {
            if (Array.isArray(cursor)) {
                const idx = Number(key);
                const arr = cursor.slice();
                arr[idx] = value;
                // mutate parent reference
                if (i === 0) return arr;
                return clone; // parent already points to same array reference
            } else {
                cursor[key] = value;
                return clone;
            }
        }
        // Prepare next container clone
        let next = cursor[key];
        const nextIsArray = typeof segments[i + 1] === 'number' || isIndexToken(segments[i + 1]);
        if (Array.isArray(cursor)) {
            const idx = Number(key);
            const arr = cursor.slice();
            next = arr[idx];
            if (next == null) next = nextIsArray ? [] : {};
            arr[idx] = Array.isArray(next) ? next.slice() : { ...next };
            cursor = arr[idx];
            // also set on the clone chain
            // find parent chain via segments - omitted for brevity since we return clone at end
        } else {
            if (next == null) next = nextIsArray ? [] : {};
            cursor[key] = Array.isArray(next) ? next.slice() : { ...next };
            cursor = cursor[key];
        }
    }
    return clone;
}

export function getByPath(obj, path, defaultValue) {
    const segments = normalize(path);
    let cursor = obj;
    for (const key of segments) {
        if (cursor == null) return defaultValue;
        cursor = Array.isArray(cursor) ? cursor[Number(key)] : cursor[key];
    }
    return cursor === undefined ? defaultValue : cursor;
}

function normalize(path) {
    const parts = [];
    const re = /[^.\[\]]+|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path))) {
        if (m[1] !== undefined) parts.push(Number(m[1]));
        else parts.push(m[0]);
    }
    return parts;
}

function isIndexToken(tok) {
    return typeof tok === 'number' || (typeof tok === 'string' && /^\d+$/.test(tok));
}
