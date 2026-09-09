require("dotenv").config();
const { admin, firestore, FieldValue } = require("../config/firebase");
const { runPublicPrivacyMigration } = require("../services/publicPrivacyMigrationService");

async function main() {
    const apply = process.argv.includes("--apply");
    const emailToUid = new Map();
    let pageToken;
    do {
        const page = await admin.auth().listUsers(1000, pageToken);
        for (const user of page.users) if (user.email) emailToUid.set(user.email.toLocaleLowerCase("tr-TR"), user.uid);
        pageToken = page.pageToken;
    } while (pageToken);

    const result = await runPublicPrivacyMigration({
        firestore,
        FieldValue,
        dryRun: !apply,
        resolveUidByEmail: async (email) => emailToUid.get(String(email).toLocaleLowerCase("tr-TR")) || null
    });
    console.log(JSON.stringify({
        mode: result.dryRun ? "dry-run" : "apply",
        changeCount: result.changeCount,
        appliedCount: result.appliedCount,
        unresolvedCount: result.unresolvedCount,
        unresolved: result.unresolved
    }, null, 2));
}

main().catch((error) => {
    console.error("Public privacy migration başarısız:", error.message);
    process.exitCode = 1;
});
