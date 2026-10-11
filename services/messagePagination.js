const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isBlank(value) {
    return value === undefined || value === null || value === "";
}

function parsePageLimit(raw) {
    if (typeof raw === "number" && Number.isInteger(raw)) {
        if (raw < 1 || raw > MAX_PAGE_SIZE) {
            throw httpError(400, "limit must be an integer between 1 and 100");
        }
        return raw;
    }

    if (typeof raw !== "string" || !/^[1-9]\d{0,2}$/.test(raw.trim())) {
        throw httpError(400, "limit must be an integer between 1 and 100");
    }

    const value = Number(raw.trim());
    if (value > MAX_PAGE_SIZE) {
        throw httpError(400, "limit must be an integer between 1 and 100");
    }
    return value;
}

function parseObjectId(value, label) {
    if (typeof value !== "string" || !OBJECT_ID.test(value)) {
        throw httpError(400, `${label} must be a valid id`);
    }
    return value;
}

function parseCursorId(before) {
    if (isBlank(before)) return null;
    return parseObjectId(before, "before");
}

// Newest-first pages walk backward. A matching createdAt also compares _id so
// messages saved in the same millisecond are not skipped or repeated.
function buildOlderThanFilter(chatId, cursor) {
    const filter = { chat: chatId };
    if (!cursor) return filter;

    filter.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ];
    return filter;
}

function shapeMessagePage(newestFirst, limit) {
    const hasMore = newestFirst.length > limit;
    const page = hasMore ? newestFirst.slice(0, limit) : newestFirst.slice();
    const oldest = page[page.length - 1];

    return {
        messages: page.slice().reverse(),
        hasMore,
        nextCursor: hasMore && oldest ? String(oldest._id) : null,
    };
}

module.exports = {
    MAX_PAGE_SIZE,
    DEFAULT_PAGE_SIZE,
    isBlank,
    parsePageLimit,
    parseObjectId,
    parseCursorId,
    buildOlderThanFilter,
    shapeMessagePage,
};
