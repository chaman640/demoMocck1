import os
import re

CLASS_ANALYSIS_FILE = "frontend/src/pages/teacher/TeacherClassAnalysis.jsx"
APP_FILE = "frontend/src/App.jsx"

CLASS_ANALYSIS_PATCHES = [
    (
        '''        <button
          onClick={() => navigate("/TeacherStudentSearch")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">🔍</span>
          <span className="text-sm font-medium flex-1">View an Individual Student's Analysis</span>
          <span className="text-gray-600">→</span>
        </button>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />''',
        '''        <button
          onClick={() => navigate("/TeacherStudentSearch")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">🔍</span>
          <span className="text-sm font-medium flex-1">View an Individual Student's Analysis</span>
          <span className="text-gray-600">→</span>
        </button>

        <button
          onClick={() => navigate("/TeacherMockLeaderboard")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">🏆</span>
          <span className="text-sm font-medium flex-1">Mock Test Leaderboard</span>
          <span className="text-gray-600">→</span>
        </button>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />''',
    ),
    (
        '''                <p className="text-xs text-gray-500">
                  {topicData.selectedCount} students' data &middot; batch total: {topicData.totalBatchStudents} students
                </p>

                <TestTypeComparisonChart data={topicData.testTypeComparison} />''',
        '''                <p className="text-xs text-gray-500">
                  {topicData.selectedCount} students' data &middot; batch total: {topicData.totalBatchStudents} students
                </p>

                {topicData.misconceptions?.length > 0 && (
                  <div className="bg-[#111827] border border-orange-500/30 rounded-2xl overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-orange-500/20 bg-orange-500/5">
                      <h3 className="font-semibold text-sm text-orange-400">⚠️ Biggest Misconceptions</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Questions where most students who got it wrong all picked the SAME wrong option — a clear conceptual gap, not random mistakes (Mock Test data)</p>
                    </div>
                    <div className="divide-y divide-gray-800">
                      {topicData.misconceptions.map((m) => (
                        <div key={m.questionId} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-500">{m.subjectName} &middot; {m.topicName}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                              {m.dominantWrongPercentage}% picked the same wrong option
                            </span>
                          </div>
                          <p className="text-sm text-gray-200 mb-2">{m.question}</p>
                          <p className="text-xs text-gray-400">
                            Most picked: <span className="text-orange-400 font-medium">Option {m.dominantWrongOption} — {m.options[`option${m.dominantWrongOption}`]}</span>
                            <span className="text-gray-600"> (correct: Option {m.correctOption} — {m.options[`option${m.correctOption}`]})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <TestTypeComparisonChart data={topicData.testTypeComparison} />''',
    ),
]


def patch_file(path, patches):
    if not os.path.exists(path):
        print(f"Nahi mili: {path} — skip.")
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in patches:
        if new in content:
            continue
        if old in content:
            content = content.replace(old, new, 1)
        else:
            print(f"WARNING: {path} — ek patch ka purana pattern nahi mila, manually check karein.")
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"OK: {path} patched.")
    else:
        print(f"SKIP: {path} — kuch badla nahi.")


def patch_app_routes():
    if not os.path.exists(APP_FILE):
        print(f"Nahi mili: {APP_FILE} — naye routes manually add karein.")
        return

    with open(APP_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    import_pattern = re.compile(r'import\s+\w+\s+from\s*["\']\./pages/teacher/[^"\']+["\'];?')
    matches = list(import_pattern.finditer(content))
    new_imports = [
        'import TeacherMockLeaderboard from "./pages/teacher/TeacherMockLeaderboard.jsx";',
        'import TeacherStudentReportPrint from "./pages/teacher/TeacherStudentReportPrint.jsx";',
    ]
    to_add_imports = [line for line in new_imports if line.split(" from ")[1] not in content]

    if matches and to_add_imports:
        last_match = matches[-1]
        insert_at = last_match.end()
        content = content[:insert_at] + "\n" + "\n".join(to_add_imports) + content[insert_at:]
        print(f"OK: {len(to_add_imports)} naye imports App.jsx mein add kiye.")
    elif not matches:
        print("WARNING: koi '/pages/teacher/' import App.jsx mein nahi mila — imports manually add karein:")
        for line in new_imports:
            print("  " + line)
    else:
        print("OK: App.jsx imports already maujood hain.")

    route_lines = [
        '<Route path="/TeacherMockLeaderboard" element={<TeacherMockLeaderboard />} />',
        '<Route path="/TeacherStudentReportPrint" element={<TeacherStudentReportPrint />} />',
    ]
    to_add_routes = [line for line in route_lines if line not in content]

    if to_add_routes:
        closing_pattern = re.compile(r'</Routes>')
        match = closing_pattern.search(content)
        if match:
            block = "        " + "\n        ".join(to_add_routes) + "\n      "
            content = content[: match.start()] + block + content[match.start() :]
            print(f"OK: {len(to_add_routes)} naye <Route> App.jsx mein add kiye.")
        else:
            print("WARNING: '</Routes>' nahi mila — routes manually add karein:")
            for line in route_lines:
                print("  " + line)
    else:
        print("OK: App.jsx routes already maujood hain.")

    if content != original:
        with open(APP_FILE, "w", encoding="utf-8") as f:
            f.write(content)


def main():
    patch_file(CLASS_ANALYSIS_FILE, CLASS_ANALYSIS_PATCHES)
    patch_app_routes()
    print("\nDone. App.jsx ko ek baar aankh se dekh lein ki imports/routes sahi jagah lage hain.")


if __name__ == "__main__":
    main()
