import os
import re

ROUTES_FILE = "backend/routes/Routes.js"

NEW_IMPORT_LINES = [
    'import { addStudentNote, getStudentNotes, deleteStudentNote } from "../controllers/manageStudentNotes.js";',
    'import { getMockLeaderboardBlueprints, getMockLeaderboard } from "../controllers/getMockLeaderboard.js";',
]

NEW_ROUTE_LINES = [
    'router.get("/teacher/analysis/pyq-detail/:studentId/:attemptId", teacherInfo, getStudentPYQAttemptDetail);',
    'router.get("/teacher/analysis/custom-test-detail/:studentId/:attemptId", teacherInfo, getStudentCustomTestAttemptDetail);',
    'router.post("/teacher/student-notes/:studentId", teacherInfo, writeLimiter, addStudentNote);',
    'router.get("/teacher/student-notes/:studentId", teacherInfo, getStudentNotes);',
    'router.delete("/teacher/student-notes/:noteId", teacherInfo, writeLimiter, deleteStudentNote);',
    'router.get("/teacher/mock-leaderboard/blueprints", teacherInfo, getMockLeaderboardBlueprints);',
    'router.get("/teacher/mock-leaderboard/:blueprintName", teacherInfo, getMockLeaderboard);',
]


def patch_analysis_teacher_import(content):
    pattern = re.compile(r'import\s*\{([^}]*)\}\s*from\s*["\']\.\./pages/teacher/analysisTeacher\.js["\'];?')
    match = pattern.search(content)
    if not match:
        print("WARNING: analysisTeacher.js import line nahi mila — manually add karna padega.")
        return content, False

    names = [n.strip() for n in match.group(1).split(",") if n.strip()]
    changed = False
    for needed in ["getStudentPYQAttemptDetail", "getStudentCustomTestAttemptDetail"]:
        if needed not in names:
            names.append(needed)
            changed = True

    if not changed:
        print("OK: analysisTeacher.js import already up to date.")
        return content, False

    new_line = 'import { ' + ", ".join(names) + ' } from "../pages/teacher/analysisTeacher.js";'
    content = content[: match.start()] + new_line + content[match.end() :]
    print("OK: analysisTeacher.js import updated with PYQ/Custom Test detail functions.")
    return content, True


def insert_new_imports(content):
    lines = content.split("\n")
    last_import_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("import "):
            last_import_idx = i

    if last_import_idx is None:
        print("WARNING: koi import line nahi mila — naye imports file ke top par manually add karein.")
        return content

    inserted = 0
    for new_line in NEW_IMPORT_LINES:
        if new_line in content:
            continue
        lines.insert(last_import_idx + 1, new_line)
        last_import_idx += 1
        inserted += 1

    if inserted > 0:
        print(f"OK: {inserted} naye import lines add kiye.")
    else:
        print("OK: naye controller imports already maujood hain.")

    return "\n".join(lines)


def insert_new_routes(content):
    export_pattern = re.compile(r'export\s+default\s+router\s*;')
    match = export_pattern.search(content)
    if not match:
        print("WARNING: 'export default router;' nahi mila — naye routes file ke end mein manually add karein.")
        return content

    to_add = [line for line in NEW_ROUTE_LINES if line not in content]
    if not to_add:
        print("OK: saare naye routes already maujood hain.")
        return content

    block = "\n" + "\n".join(to_add) + "\n\n"
    content = content[: match.start()] + block + content[match.start() :]
    print(f"OK: {len(to_add)} naye routes add kiye.")
    return content


def main():
    if not os.path.exists(ROUTES_FILE):
        print(f"Nahi mili: {ROUTES_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(ROUTES_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    content, _ = patch_analysis_teacher_import(content)
    content = insert_new_imports(content)
    content = insert_new_routes(content)

    with open(ROUTES_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    print("\nDone. Ab backend/routes/Routes.js ko ek baar aankh se dekh lein.")


if __name__ == "__main__":
    main()
