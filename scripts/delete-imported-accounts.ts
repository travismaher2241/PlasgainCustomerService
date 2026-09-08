/**
 * Safe script to back up and delete the imported accounts and contacts
 * from the batch imported on 2026-09-08 (seed: 1788904501688).
 *
 * Usage:
 *   npx tsx scripts/delete-imported-accounts.ts           # Dry run, prints count and details
 *   npx tsx scripts/delete-imported-accounts.ts --apply   # Backs up to JSON, then deletes
 */

import { writeFileSync } from "fs";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, ensureFirebaseAuth } from "../src/utils/firebase.js";

const IMPORT_SEED = "1788904501688";
const apply = process.argv.includes("--apply");

async function main() {
  console.log("Connecting to Firebase...");
  await ensureFirebaseAuth();

  console.log("Loading all accounts from crm_accounts...");
  const accSnap = await getDocs(collection(db, "crm_accounts"));
  const allAccounts: any[] = [];
  accSnap.forEach((d) => allAccounts.push({ id: d.id, ...d.data() }));

  console.log("Loading all contacts from crm_contacts...");
  const conSnap = await getDocs(collection(db, "crm_contacts"));
  const allContacts: any[] = [];
  conSnap.forEach((d) => allContacts.push({ id: d.id, ...d.data() }));

  const doomedAccounts = allAccounts.filter(
    (a) => a.id.startsWith(`acc-imp-${IMPORT_SEED}`) || (a.id.startsWith("acc-imp-") && a.leadSource === "Imported List")
  );
  const doomedAccountIds = new Set(doomedAccounts.map((a) => a.id));

  const doomedContacts = allContacts.filter(
    (c) => c.id.startsWith(`con-imp-${IMPORT_SEED}`) || (c.accountId && doomedAccountIds.has(c.accountId))
  );

  const keptAccounts = allAccounts.filter((a) => !doomedAccountIds.has(a.id));
  const keptContacts = allContacts.filter((c) => !doomedContacts.some((dc) => dc.id === c.id));

  console.log(`\nFound:`);
  console.log(`  Total accounts in DB: ${allAccounts.length}`);
  console.log(`  Imported accounts to delete: ${doomedAccounts.length}`);
  console.log(`  Accounts to keep: ${keptAccounts.length}`);
  console.log(`  Total contacts in DB: ${allContacts.length}`);
  console.log(`  Imported contacts to delete: ${doomedContacts.length}`);
  console.log(`  Contacts to keep: ${keptContacts.length}`);

  console.log(`\nAccounts kept (${keptAccounts.length}):`);
  for (const a of keptAccounts) {
    console.log(`  - [${a.id}] ${a.name} (Owner: ${a.accountOwner})`);
  }

  console.log(`\nContacts kept (${keptContacts.length}):`);
  for (const c of keptContacts) {
    console.log(`  - [${c.id}] ${c.firstName} ${c.lastName} (Account: ${c.accountName || c.accountId})`);
  }

  if (doomedAccounts.length === 0 && doomedContacts.length === 0) {
    console.log("\nNo imported accounts or contacts found to delete.");
    return;
  }

  if (!apply) {
    console.log(`\n[DRY RUN] ${doomedAccounts.length} accounts and ${doomedContacts.length} contacts would be deleted.`);
    console.log(`Run with --apply to back up and execute deletion.`);
    return;
  }

  // Back up doomed records
  const backupFile = `imported-accounts-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(
    backupFile,
    JSON.stringify(
      {
        backupDate: new Date().toISOString(),
        importSeed: IMPORT_SEED,
        accountsCount: doomedAccounts.length,
        contactsCount: doomedContacts.length,
        accounts: doomedAccounts,
        contacts: doomedContacts
      },
      null,
      2
    )
  );
  console.log(`\nBacked up ${doomedAccounts.length} accounts and ${doomedContacts.length} contacts to: ${backupFile}`);

  console.log("\nDeleting imported contacts...");
  let deletedContactsCount = 0;
  for (const con of doomedContacts) {
    await deleteDoc(doc(db, "crm_contacts", con.id));
    deletedContactsCount++;
    if (deletedContactsCount % 100 === 0) {
      console.log(`  Deleted ${deletedContactsCount}/${doomedContacts.length} contacts...`);
    }
  }
  console.log(`Done deleting ${deletedContactsCount} contacts.`);

  console.log("\nDeleting imported accounts...");
  let deletedAccountsCount = 0;
  for (const acc of doomedAccounts) {
    await deleteDoc(doc(db, "crm_accounts", acc.id));
    deletedAccountsCount++;
    if (deletedAccountsCount % 100 === 0) {
      console.log(`  Deleted ${deletedAccountsCount}/${doomedAccounts.length} accounts...`);
    }
  }
  console.log(`Done deleting ${deletedAccountsCount} accounts.`);

  // Verify DB state
  console.log("\nVerifying database state post-deletion...");
  const finalAccSnap = await getDocs(collection(db, "crm_accounts"));
  const finalConSnap = await getDocs(collection(db, "crm_contacts"));
  console.log(`Final accounts count: ${finalAccSnap.size}`);
  console.log(`Final contacts count: ${finalConSnap.size}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deletion script error:", err);
    process.exit(1);
  });
