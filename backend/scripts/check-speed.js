// scripts/check-speed.js
// ─────────────────────────────────────────────
// Ye script batati hai ki har badi query TEZ chal rahi hai ya DHEEMI.
//
//   cd backend
//   node scripts/check-speed.js
//
// Har query ke liye ye dikhata hai:
//   • kitne record MongoDB ko padhne pade  ← sabse zaroori number
//   • kitna time laga
//   • index use hua ya poori collection scan hui
//
// SAMAJHNE KA TARIKA:
//   "5 record padhe, 5 mile"        → ✅ badhiya (index chal raha hai)
//   "1,00,000 record padhe, 5 mile" → ❌ poori collection scan (index nahi laga)
//
// Index banane se PEHLE aur BAAD mein — dono baar chalayein, farak dikh jayega.
//
// ⚠️ Ye sirf padhta hai, kuch badalta nahi.
// ─────────────────────────────────────────────
import "dotenv/config";
import { rowQuestionConnection } from "../config/rowQuestion.js";

import Performance from "../models/Performance.js";
import User from "../models/User.js";
import { Question } from "../models/rowQuestionSchema.js";
import Coupon from "../models/Coupon.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";
import Otp from "../models/Otp.js";

const C = { g: "\x1b[92m", r: "\x1b[91m", y: "\x1b[93m", b: "\x1b[94m", d: "\x1b[90m", x: "\x1b[0m" };

// explain ka jawab har MongoDB version mein thoda alag aata hai,
// isliye poore object mein dhoondhte hain
const findInPlan = (node, key, out = []) => {
  if (!node || typeof node !== "object") return out;
  if (node[key]) out.push(node[key]);
  for (const v of Object.values(node)) {
    if (typeof v === "object") findInPlan(v, key, out);
  }
  return out;
};

const report = (label, exp) => {
  const st = exp?.executionStats || {};
  const examined = st.totalDocsExamined ?? -1;
  const keysExamined = st.totalKeysExamined ?? 0;
  const returned = st.nReturned ?? 0;
  const ms = st.executionTimeMillis ?? -1;

  const stages = findInPlan(exp?.queryPlanner, "stage").flat();
  const idxNames = [...new Set(findInPlan(exp?.queryPlanner, "indexName").flat())];
  const isCollScan = stages.includes("COLLSCAN");
  const hasSortInMemory = stages.includes("SORT");

  let verdict, colour;
  if (isCollScan) {
    verdict = "❌ FULL COLLECTION SCAN — no index used";
    colour = C.r;
  } else if (examined > returned * 20 && examined > 500) {
    verdict = "🟡 index used, but more records read than needed";
    colour = C.y;
  } else {
    verdict = "✅ OK";
    colour = C.g;
  }

  console.log(`\n${C.b}${label}${C.x}`);
  console.log(
    `  ${colour}${verdict}${C.x}` +
      `\n  ${C.d}records read: ${examined}   ·   found via index: ${keysExamined}   ·   returned: ${returned}   ·   time: ${ms}ms${C.x}`
  );
  if (idxNames.length) console.log(`  ${C.d}index: ${idxNames.join(", ")}${C.x}`);
  if (hasSortInMemory) {
    console.log(
      `  ${C.y}⚠ Sorting in RAM — this query may FAIL when there is a lot of data${C.x}`
    );
  }
};

const safe = async (label, fn) => {
  try {
    const exp = await fn();
    if (!exp) {
      console.log(`\n${C.b}${label}${C.x}\n  ${C.d}(no data found for this query — skip)${C.x}`);
      return;
    }
    report(label, exp);
  } catch (err) {
    console.log(`\n${C.b}${label}${C.x}\n  ${C.r}error: ${err.message}${C.x}`);
  }
};

const main = async () => {
  console.log(`\n${C.b}${"═".repeat(60)}\n  Speed Check\n${"═".repeat(60)}${C.x}`);
  await rowQuestionConnection.asPromise();

  // ── Asli data se sample uthate hain ──
  const anyPerf = await Performance.findOne().select("userId examName").lean();
  const anyCoupon = await Coupon.findOne().select("_id mainTeacher exam").lean();
  const anyQ = await Question.findOne().select("examName subjectName").lean();
  const anyCA = await ChallengeAttempt.findOne().select("challengeId").lean();
  const anyCTA = await CustomTestAttempt.findOne().select("userId testId").lean();
  const anyOtp = await Otp.findOne().select("phone purpose").lean();

  const counts = {
    Performance: await Performance.estimatedDocumentCount(),
    User: await User.estimatedDocumentCount(),
    Question: await Question.estimatedDocumentCount(),
  };
  console.log(
    `\n${C.d}Current data — Performance: ${counts.Performance} · User: ${counts.User} · Question: ${counts.Question}${C.x}`
  );
  if (counts.Performance < 200) {
    console.log(
      `${C.y}\n⚠ There is very little data right now. With little data everything looks fast even without an index.` +
        `\n  Look at the real difference in the "records read" number, not the time.${C.x}`
    );
  }

  await safe("1. Student analysis (Performance)", () =>
    anyPerf
      ? Performance.find({ userId: anyPerf.userId, examName: anyPerf.examName })
          .sort({ createdAt: -1 })
          .explain("executionStats")
      : null
  );

  await safe("2. List of a batch's students (User)", () =>
    anyCoupon
      ? User.find({ activeCoupon: anyCoupon._id }).select("_id name").explain("executionStats")
      : null
  );

  await safe("3. Finding a student by phone (User)", () =>
    anyCoupon
      ? User.find({ activeCoupon: anyCoupon._id, phone: { $regex: "^99" } })
          .limit(20)
          .explain("executionStats")
      : null
  );

  await safe("4. Picking questions for a mock test (Question)", () =>
    anyQ
      ? Question.find({ examName: { $in: [anyQ.examName?.[0] ?? anyQ.examName] }, subjectName: anyQ.subjectName })
          .explain("executionStats")
      : null
  );

  await safe("5. Teacher's batches (Coupon)", () =>
    anyCoupon
      ? Coupon.find({ mainTeacher: anyCoupon.mainTeacher })
          .sort({ createdAt: -1 })
          .explain("executionStats")
      : null
  );

  await safe("6. Challenge leaderboard (ChallengeAttempt)", () =>
    anyCA
      ? ChallengeAttempt.find({ challengeId: anyCA.challengeId })
          .sort({ totalScore: -1, totalTimeTakenInSeconds: 1 })
          .explain("executionStats")
      : null
  );

  await safe("7. 'Has this test been taken before?' (CustomTestAttempt)", () =>
    anyCTA
      ? CustomTestAttempt.find({ userId: anyCTA.userId, testId: { $in: [anyCTA.testId] } })
          .explain("executionStats")
      : null
  );

  await safe("8. Finding the newest OTP (Otp)", () =>
    anyOtp
      ? Otp.find({ phone: anyOtp.phone, purpose: anyOtp.purpose })
          .sort({ createdAt: -1 })
          .limit(1)
          .explain("executionStats")
      : null
  );

  console.log(
    `\n${C.b}${"─".repeat(60)}${C.x}\n` +
      `If you see any ${C.r}❌${C.x}, send me that part.\n`
  );
  await rowQuestionConnection.close();
  process.exit(0);
};

main().catch(async (err) => {
  console.error(`\n${C.r}❌ Error:${C.x}`, err.message);
  try {
    await rowQuestionConnection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
