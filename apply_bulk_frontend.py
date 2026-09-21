import os
import re

CLASS_ANALYSIS_FILE = "frontend/src/pages/teacher/TeacherClassAnalysis.jsx"
APP_FILE = "frontend/src/App.jsx"

CLASS_ANALYSIS_OLD = '''        <button
          onClick={() => navigate("/TeacherMockLeaderboard")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">🏆</span>
          <span className="text-sm font-medium flex-1">Mock Test Leaderboard</span>
          <span className="text-gray-600">→</span>
        </button>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />'''

CLASS_ANALYSIS_NEW = '''        <button
          onClick={() => navigate("/TeacherMockLeaderboard")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">🏆</span>
          <span className="text-sm font-medium flex-1">Mock Test Leaderboard</span>
          <span className="text-gray-600">→</span>
        </button>

        <button
          onClick={() => navigate("/TeacherBulkStudents")}
          className="w-full flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/40 rounded-xl px-4 py-3 text-left transition-colors"
        >
          <span className="text-lg">👥</span>
          <span className="text-sm font-medium flex-1">Bulk Student Management</span>
          <span className="text-gray-600">→</span>
        </button>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />'''


def patch_class_analysis():
    if not os.path.exists(CLASS_ANALYSIS_FILE):
        print(f"Nahi mili: {CLASS_ANALYSIS_FILE} — skip.")
        return
    with open(CLASS_ANALYSIS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    if CLASS_ANALYSIS_NEW in content:
        print("OK: TeacherClassAnalysis.jsx already patched.")
        return
    if CLASS_ANALYSIS_OLD not in content:
        print("WARNING: TeacherClassAnalysis.jsx mein purana pattern nahi mila — manually 'Bulk Student Management' button add karein, path: /TeacherBulkStudents")
        return
    content = content.replace(CLASS_ANALYSIS_OLD, CLASS_ANALYSIS_NEW, 1)
    with open(CLASS_ANALYSIS_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: TeacherClassAnalysis.jsx mein 'Bulk Student Management' button add kiya.")


def patch_app_routes():
    if not os.path.exists(APP_FILE):
        print(f"Nahi mili: {APP_FILE} — naya route manually add karein.")
        return

    with open(APP_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    import_pattern = re.compile(r'import\s+\w+\s+from\s*["\']\./pages/teacher/[^"\']+["\'];?')
    matches = list(import_pattern.finditer(content))
    new_import = 'import TeacherBulkStudents from "./pages/teacher/TeacherBulkStudents.jsx";'

    if new_import.split(" from ")[1] not in content:
        if matches:
            insert_at = matches[-1].end()
            content = content[:insert_at] + "\n" + new_import + content[insert_at:]
            print("OK: TeacherBulkStudents import App.jsx mein add kiya.")
        else:
            print("WARNING: koi '/pages/teacher/' import nahi mila — manually add karein:")
            print("  " + new_import)
    else:
        print("OK: App.jsx import already maujood hai.")

    new_route = '<Route path="/TeacherBulkStudents" element={<TeacherBulkStudents />} />'
    if new_route not in content:
        closing_pattern = re.compile(r'</Routes>')
        match = closing_pattern.search(content)
        if match:
            block = "        " + new_route + "\n      "
            content = content[: match.start()] + block + content[match.start() :]
            print("OK: naya <Route> App.jsx mein add kiya.")
        else:
            print("WARNING: '</Routes>' nahi mila — manually add karein:")
            print("  " + new_route)
    else:
        print("OK: App.jsx route already maujood hai.")

    if content != original:
        with open(APP_FILE, "w", encoding="utf-8") as f:
            f.write(content)


def main():
    patch_class_analysis()
    patch_app_routes()
    print("\nDone.")


if __name__ == "__main__":
    main()
