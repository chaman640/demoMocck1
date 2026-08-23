// scripts/create-indexes.js
// ─────────────────────────────────────────────
// Ise ek baar chalayein — saare index ban jayenge.
//
//   cd backend
//   node scripts/create-indexes.js
//
// Ya live database par:
//   ROWQUESTION_URI="<render wali uri>" node scripts/create-indexes.js
//
// ⚠️ Ye SAFE hai:
//   • Koi data delete/badal nahi hota — sirf index banta hai
//   • Dobara chalane se kuch nahi bigadta
//   • Index bante waqt website chalti rehti hai (MongoDB 4.2+ mein index
//     banana website ko rokta nahi hai)
//
// Kitna time lagega? Khaali database par 1-2 second. 1 lakh students ke
// data par 1-3 minute. Ek baar ka kaam hai.
// ─────────────────────────────────────────────
import "dotenv/config";
import { rowQuestionConnection } from "../config/rowQuestion.js";
import { ensureIndexes, INDEX_PLAN } from "../config/indexes.js";

const C = { g: "\x1b[92m", r: "\x1b[91m", y: "\x1b[93m", b: "\x1b[94m", d: "\x1b[90m", x: "\x1b[0m" };

const totalPlanned = INDEX_PLAN.reduce((n, g) => n + g.indexes.length, 0);

const main = async () => {
  console.log(`\n${C.b}${"═".repeat(60)}${C.x}`);
  console.log(`${C.b}  Database Index — ${totalPlanned} index banaye ja rahe hain${C.x}`);
  console.log(`${C.b}${"═".repeat(60)}${C.x}\n`);

  console.log("Database se jud rahe hain...");
  await rowQuestionConnection.asPromise();
  console.log(`${C.g}✔ Jud gaye${C.x}  (database: ${rowQuestionConnection.name})\n`);

  const startedAt = Date.now();
  const res = await ensureIndexes();
  const totalMs = Date.now() - startedAt;

  console.log(`\n${C.b}${"─".repeat(60)}${C.x}`);
  console.log(`${C.g}✔ Naye bane      : ${res.created.length}${C.x}`);
  console.log(`${C.d}~ Pehle se the   : ${res.existing.length}${C.x}`);
  if (res.failed.length) {
    console.log(`${C.r}✘ Fail hue       : ${res.failed.length}${C.x}`);
    for (const f of res.failed) console.log(`${C.r}   • ${f.name} — ${f.error}${C.x}`);
    console.log(
      `\n${C.y}Agar "already exists with a different name" likha hai, to matlab wahi` +
        `\nindex kisi aur naam se pehle se maujood hai — koi dikkat nahi hai.${C.x}`
    );
  }
  console.log(`\nKul time: ${(totalMs / 1000).toFixed(1)} second`);

  // ── Ab har collection ke saare index dikhate hain ──
  console.log(`\n${C.b}Har collection mein ab kitne index hain:${C.x}`);
  for (const group of INDEX_PLAN) {
    try {
      const list = await group.model.collection.indexes();
      const count = await group.model.collection.estimatedDocumentCount();
      console.log(
        `  ${String(list.length).padStart(2)} index  ·  ${String(count).padStart(9)} records  ·  ${group.model.collection.collectionName}`
      );
    } catch {
      /* collection abhi bani hi nahi — koi baat nahi */
    }
  }

  console.log(`\n${C.g}Ho gaya!${C.x} Ab teacher wale analysis page bahut tez khulenge.\n`);
  await rowQuestionConnection.close();
  process.exit(res.failed.length ? 1 : 0);
};

main().catch(async (err) => {
  console.error(`\n${C.r}❌ Error:${C.x}`, err.message);
  console.error(
    `\n${C.y}Sabse aam wajah: ROWQUESTION_URI galat hai, ya Atlas mein aapka IP` +
      `\nwhitelist nahi hai (Atlas → Network Access).${C.x}\n`
  );
  try {
    await rowQuestionConnection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
