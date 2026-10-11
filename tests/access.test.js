const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeRegex, sameId, isChatMember, isGroupAdmin } = require("../utils/access");

test("escapeRegex treats search metacharacters as literals", () => {
    assert.equal(escapeRegex("a.b+c"), "a\\.b\\+c");
    assert.equal(escapeRegex("(a+)+$"), "\\(a\\+\\)\\+\\$");

    const pattern = new RegExp(escapeRegex("john.doe"));
    assert.equal(pattern.test("john.doe"), true);
    assert.equal(pattern.test("johnXdoe"), false);
});

test("sameId compares strings, hex ids, and populated documents", () => {
    const hex = "507f1f77bcf86cd799439011";
    const objectId = { toString() { return hex; } };

    assert.equal(sameId(objectId, hex), true);
    assert.equal(sameId({ _id: objectId }, hex), true);
    assert.equal(sameId(hex, "507f1f77bcf86cd799439012"), false);
    assert.equal(sameId(null, null), false);
    assert.equal(sameId(undefined, ""), false);
});

test("isChatMember does not use reference equality", () => {
    const hex = "507f1f77bcf86cd799439011";
    const storedId = { toString() { return hex; } };

    assert.equal([storedId].includes(hex), false);
    assert.equal(isChatMember([storedId], hex), true);
    assert.equal(isChatMember([{ _id: hex }], hex), true);
    assert.equal(isChatMember([storedId], "someone-else"), false);
    assert.equal(isChatMember(null, hex), false);
});

test("isGroupAdmin requires a matching admin id", () => {
    const admin = "507f1f77bcf86cd799439011";
    assert.equal(isGroupAdmin({ groupAdmin: { _id: admin } }, admin), true);
    assert.equal(isGroupAdmin({ groupAdmin: admin }, "other"), false);
    assert.equal(isGroupAdmin({ groupAdmin: null }, admin), false);
    assert.equal(isGroupAdmin(null, admin), false);
});
