import os
import re

ROUTES_FILE = "backend/routes/Routes.js"

NEW_IMPORT_LINE = (
    'import { bulkImportStudents, getBatchRoster, getMyManagedCoupons, bulkMoveStudents, '
    'bulkRemoveStudents, uploadStudentFileMiddleware, parseStudentFile } from "../controllers/bulkManageStudents.js";'
)

NEW_ROUTE_LINES = [
    'router.post("/teacher/bulk-students/parse-file", teacherInfo, uploadStudentFileMiddleware, parseStudentFile);',
    'router.post("/teacher/bulk-students/import", teacherInfo, writeLimiter, bulkImportStudents);',
    'router.get("/teacher/bulk-students/roster", teacherInfo, getBatchRoster);',
    'router.get("/teacher/bulk-students/my-coupons", teacherInfo, getMyManagedCoupons);',
    'router.post("/teacher/bulk-students/move", teacherInfo, writeLimiter, bulkMoveStudents);',
    'router.post("/teacher/bulk-students/remove", teacherInfo, writeLimiter, bulkRemoveStudents);',
]


def insert_new_import(content):
    if NEW_IMPORT_LINE in content:
        print("OK: bulkManageStudents.js import already maujood hai.")
        return content

    lines = content.split("\n")
    last_import_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("import "):
            last_import_idx = i

    if last_import_idx is None:
        print("WARNING: koi import line nahi mila — is import ko file ke top par manually add karein:")
        print("  " + NEW_IMPORT_LINE)
        return content

    lines.insert(last_import_idx + 1, NEW_IMPORT_LINE)
    print("OK: bulkManageStudents.js import add kiya.")
    return "\n".join(lines)


def insert_new_routes(content):
    export_pattern = re.compile(r'export\s+default\s+router\s*;')
    match = export_pattern.search(content)
    if not match:
        print("WARNING: 'export default router;' nahi mila — naye routes manually add karein:")
        for line in NEW_ROUTE_LINES:
            print("  " + line)
        return content

    to_add = [line for line in NEW_ROUTE_LINES if line not in content]
    if not to_add:
        print("OK: saare bulk-student routes already maujood hain.")
        return content

    block = "\n" + "\n".join(to_add) + "\n\n"
    content = content[: match.start()] + block + content[match.start() :]
    print(f"OK: {len(to_add)} naye bulk-student routes add kiye.")
    return content


def main():
    if not os.path.exists(ROUTES_FILE):
        print(f"Nahi mili: {ROUTES_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(ROUTES_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    content = insert_new_import(content)
    content = insert_new_routes(content)

    with open(ROUTES_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    print("\nDone.")


if __name__ == "__main__":
    main()
