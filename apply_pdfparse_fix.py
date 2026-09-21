import os

TARGET_FILE = "backend/controllers/bulkManageStudents.js"

OLD_IMPORTS = '''import mongoose from "mongoose";
import multer from "multer";
import XLSX from "xlsx";
import pdfParse from "pdf-parse";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";'''

NEW_IMPORTS = '''import mongoose from "mongoose";
import multer from "multer";
import XLSX from "xlsx";
import { createRequire } from "module";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");'''


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    if NEW_IMPORTS in content:
        print("OK: fix already lagi hui hai — kuch nahi kiya.")
        return

    if OLD_IMPORTS not in content:
        print("WARNING: purana pattern nahi mila. File ke top ka import section manually check karein —")
        print("'import pdfParse from \"pdf-parse\";' line ko is tarah badlein:")
        print()
        print(NEW_IMPORTS)
        return

    content = content.replace(OLD_IMPORTS, NEW_IMPORTS, 1)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"OK: {TARGET_FILE} mein pdf-parse import fix ho gaya.")


if __name__ == "__main__":
    main()
