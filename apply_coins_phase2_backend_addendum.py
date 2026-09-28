def patch(path, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if new in content:
        print(f"OK [{label}]: already applied earlier, skipping — {path}")
        return
    if old not in content:
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (Phase 1 backend lagana zaroori hai pehle, ya file badal chuki hai)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED (ambiguous, needs manual check)")
        return
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK [{label}]: patched {path}")


patch(
    "backend/controllers/addPerformence.js",
    '''    await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    // 9. Response
    return res.status(201).json({
      success: true,
      message: "User Performance Successfully Save Ho Gayi.",
      data: {
        performanceId: newPerformance._id,''',
    '''    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    // 9. Response
    return res.status(201).json({
      success: true,
      message: "User Performance Successfully Save Ho Gayi.",
      data: {
        performanceId: newPerformance._id,
        coinsEarned,''',
    "addPerformence.js: surface coinsEarned",
)

patch(
    "backend/controllers/submitCustomTest.js",
    '''    await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Custom Test submit ho gaya!",
      data: {
        attemptId: newAttempt._id,''',
    '''    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Custom Test submit ho gaya!",
      data: {
        attemptId: newAttempt._id,
        coinsEarned,''',
    "submitCustomTest.js: surface coinsEarned",
)

patch(
    "backend/controllers/submitPreviousYearTest.js",
    '''    await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submit ho gaya!",
      data: {
        attemptId: newAttempt._id,''',
    '''    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submit ho gaya!",
      data: {
        attemptId: newAttempt._id,
        coinsEarned,''',
    "submitPreviousYearTest.js: surface coinsEarned",
)

patch(
    "backend/controllers/submitCurrentAffairQuiz.js",
    '''    await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Quiz submit ho gaya!",
      data: { totalScore, correctCount, wrongCount, unattemptedCount },
    });''',
    '''    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    return res.status(201).json({
      success: true,
      message: "Quiz submit ho gaya!",
      data: { totalScore, correctCount, wrongCount, unattemptedCount, coinsEarned },
    });''',
    "submitCurrentAffairQuiz.js: surface coinsEarned",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar 'Phase 1 backend lagana zaroori hai' wali WARNING aaye, to pehle coins_phase1_backend.zip apply karein, fir ye script chalayein.")
