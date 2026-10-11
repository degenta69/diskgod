function validateEnv(env = {}) {
    const errors = [];
    const mongoUri = typeof env.MONGO_URI === "string" ? env.MONGO_URI.trim() : "";
    const jwtSecret = typeof env.JWT_SECRET === "string" ? env.JWT_SECRET.trim() : "";
    const port = env.PORT === undefined || env.PORT === null ? "" : String(env.PORT).trim();

    if (!mongoUri) errors.push("MONGO_URI is required");
    if (jwtSecret.length < 32) {
        errors.push("JWT_SECRET is required and must be at least 32 characters");
    }
    if (port && !/^\d+$/.test(port)) errors.push("PORT must be a positive integer");

    return errors;
}

function assertEnv(env = process.env) {
    const errors = validateEnv(env);
    if (errors.length === 0) return;

    console.error("Refusing to start: invalid environment.");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

module.exports = { validateEnv, assertEnv };
