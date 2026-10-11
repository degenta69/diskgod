const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnv, assertEnv } = require("../config/env");

const SECRET = "0123456789abcdef0123456789abcdef";

test("validateEnv accepts a complete configuration", () => {
    assert.deepEqual(
        validateEnv({
            MONGO_URI: "mongodb://127.0.0.1:27017/diskgod",
            JWT_SECRET: SECRET,
            PORT: "6453",
        }),
        []
    );
});

test("validateEnv reports missing database, short secret, and bad port", () => {
    assert.deepEqual(
        validateEnv({ MONGO_URI: "  ", JWT_SECRET: "too-short", PORT: "abc" }),
        [
            "MONGO_URI is required",
            "JWT_SECRET is required and must be at least 32 characters",
            "PORT must be a positive integer",
        ]
    );
});

test("validateEnv allows PORT to be omitted", () => {
    assert.deepEqual(validateEnv({ MONGO_URI: "mongodb://localhost/diskgod", JWT_SECRET: SECRET }), []);
});

test("assertEnv exits when the process would otherwise boot unsafely", () => {
    const logged = [];
    const exits = [];
    const originalExit = process.exit;
    const originalError = console.error;
    console.error = (line) => logged.push(String(line));
    process.exit = (code) => {
        exits.push(code);
        throw new Error("exit");
    };

    try {
        assertEnv({});
        assert.fail("expected the process to exit");
    } catch (error) {
        assert.equal(error.message, "exit");
    } finally {
        process.exit = originalExit;
        console.error = originalError;
    }

    assert.deepEqual(exits, [1]);
    assert.ok(logged.some((line) => line.includes("JWT_SECRET")));
});
