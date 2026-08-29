/**
 * One-off cleanup for controlled documents duplicated by past test runs.
 *
 * Before the test suite was stopped from writing to the live project (see
 * `isCloudSyncEnabled` in src/utils/firebase.ts), every `npm test` run appended
 * a fresh copy of its fixtures to the `controlled_documents` collection. The
 * library ended up holding 239 records for 8 real documents — three titles
 * duplicated 78 times each — which a rep has to scroll past when searching for
 * a datasheet.
 *
 * This removes the surplus copies. It is deliberately NOT run automatically and
 * NOT wired into any npm script: it deletes records from the live Firestore
 * project, so run it consciously, once, after checking the dry-run output.
 *
 *   npx tsx scripts/dedupe-controlled-documents.ts          # dry run, deletes nothing
 *   npx tsx scripts/dedupe-controlled-documents.ts --apply  # performs deletions
 *
 * Keeps, for each (title + version) group: the approved copy if there is one,
 * otherwise the oldest record — so the id referenced by existing supersede
 * chains survives.
 */

import { writeFileSync } from "fs";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, ensureFirebaseAuth } from "../src/utils/firebase";

const COLLECTION = "controlled_documents";
const apply = process.argv.includes("--apply");

interface DocRecord {
  id: string;
  title?: string;
  version?: string;
  approvalStatus?: string;
  uploadedAt?: string;
}

async function main() {
  await ensureFirebaseAuth();

  const snap = await getDocs(collection(db, COLLECTION));
  const records: DocRecord[] = [];
  snap.forEach((d) => records.push({ ...(d.data() as object), id: d.id } as DocRecord));

  console.log(`Found ${records.length} controlled documents.`);

  const groups = new Map<string, DocRecord[]>();
  for (const record of records) {
    const key = `${(record.title || "").trim().toLowerCase()}::${(record.version || "").trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  const doomed: DocRecord[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => {
      const aApproved = a.approvalStatus === "Approved" ? 0 : 1;
      const bApproved = b.approvalStatus === "Approved" ? 0 : 1;
      if (aApproved !== bApproved) return aApproved - bApproved;
      return String(a.uploadedAt || "").localeCompare(String(b.uploadedAt || ""));
    });

    const [keep, ...surplus] = sorted;
    console.log(`  ${group.length}x ${key.split("::")[0]} — keeping ${keep.id}, removing ${surplus.length}`);
    doomed.push(...surplus);
  }

  if (doomed.length === 0) {
    console.log("Nothing to remove.");
    return;
  }

  if (!apply) {
    console.log(`\nDry run: ${doomed.length} records would be deleted. Re-run with --apply to perform it.`);
    return;
  }

  // Write the full records to disk before removing anything. Firestore deletes
  // are irreversible and this collection holds compliance evidence, so the
  // cleanup must be restorable from the backup alone.
  const backupPath = `controlled-documents-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(backupPath, JSON.stringify({ deletedAt: new Date().toISOString(), records: doomed }, null, 2));
  console.log(`\nBacked up ${doomed.length} records to ${backupPath}`);

  let deleted = 0;
  for (const record of doomed) {
    await deleteDoc(doc(db, COLLECTION, record.id));
    deleted++;
  }
  console.log(`Deleted ${deleted} duplicate records. ${records.length - deleted} remain.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });
