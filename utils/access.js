function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idString(value) {
    if (value == null) return "";
    if (typeof value === "object" && value._id != null) return String(value._id);
    return String(value);
}

function sameId(left, right) {
    const a = idString(left);
    const b = idString(right);
    return a !== "" && a === b;
}

function isChatMember(users, userId) {
    if (!Array.isArray(users)) return false;
    return users.some((user) => sameId(user, userId));
}

function isGroupAdmin(chat, userId) {
    if (!chat || chat.groupAdmin == null) return false;
    return sameId(chat.groupAdmin, userId);
}

module.exports = { escapeRegex, sameId, isChatMember, isGroupAdmin };
