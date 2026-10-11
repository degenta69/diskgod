const test = require("node:test");
const assert = require("node:assert/strict");
const {
    parsePageLimit,
    parseObjectId,
    parseCursorId,
    buildOlderThanFilter,
    shapeMessagePage,
} = require("../services/messagePagination");

const CHAT_ID = "617a077e18c25468bc7c4dd4";
const MESSAGE_ID = "617a518c4081150716472c78";

test("parsePageLimit accepts integers from 1 to 100", () => {
    assert.equal(parsePageLimit("1"), 1);
    assert.equal(parsePageLimit("100"), 100);
    assert.equal(parsePageLimit(50), 50);
    assert.equal(parsePageLimit(" 30 "), 30);
});

test("parsePageLimit rejects missing, fractional, and oversized values", () => {
    for (const value of ["0", "-1", "1.5", "101", "999", "", "fifty", 0, 101, 1.2]) {
        assert.throws(() => parsePageLimit(value), (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /limit must be an integer/);
            return true;
        });
    }
});

test("parseObjectId and parseCursorId only accept 24-character hex ids", () => {
    assert.equal(parseObjectId(CHAT_ID, "chatId"), CHAT_ID);
    assert.equal(parseCursorId(null), null);
    assert.equal(parseCursorId(""), null);
    assert.equal(parseCursorId(MESSAGE_ID), MESSAGE_ID);

    assert.throws(() => parseCursorId("not-an-id"), (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /before must be a valid id/);
        return true;
    });
    assert.throws(() => parseObjectId("123", "chatId"), (error) => {
        assert.equal(error.statusCode, 400);
        return true;
    });
});

test("buildOlderThanFilter pages backward without skipping equal timestamps", () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const cursor = { _id: MESSAGE_ID, createdAt };

    assert.deepEqual(buildOlderThanFilter(CHAT_ID, null), { chat: CHAT_ID });
    assert.deepEqual(buildOlderThanFilter(CHAT_ID, cursor), {
        chat: CHAT_ID,
        $or: [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: MESSAGE_ID } },
        ],
    });
});

test("shapeMessagePage returns a chronological page and a cursor when more exist", () => {
    const newestFirst = [
        { _id: "5", content: "newest" },
        { _id: "4", content: "fourth" },
        { _id: "3", content: "third" },
        { _id: "2", content: "second" },
        { _id: "1", content: "oldest" },
    ];

    const page = shapeMessagePage(newestFirst, 3);

    assert.equal(page.hasMore, true);
    assert.equal(page.nextCursor, "3");
    assert.deepEqual(
        page.messages.map((message) => message._id),
        ["3", "4", "5"]
    );
    assert.deepEqual(
        newestFirst.map((message) => message._id),
        ["5", "4", "3", "2", "1"]
    );
});

test("shapeMessagePage omits the cursor on the last page", () => {
    const page = shapeMessagePage(
        [
            { _id: "2", content: "newer" },
            { _id: "1", content: "older" },
        ],
        50
    );

    assert.equal(page.hasMore, false);
    assert.equal(page.nextCursor, null);
    assert.deepEqual(
        page.messages.map((message) => message.content),
        ["older", "newer"]
    );
});

test("shapeMessagePage handles an empty history", () => {
    assert.deepEqual(shapeMessagePage([], 50), {
        messages: [],
        hasMore: false,
        nextCursor: null,
    });
});
