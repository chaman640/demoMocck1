#!/usr/bin/env python3
"""
Ye script Mock Test, Custom Test, aur Previous Year Test — teenon ke
"instructions" screen se "tick karo phir Start hoga" wala checkbox hata
kar, Start button ko hamesha directly clickable bana deta hai.

Chalane ka tarika (project ke ROOT folder se, jahan 'frontend' folder hai):

    python3 apply_test_start_fix.py

Ye 3 files ko modify karega:
    frontend/src/pages/MockTest.jsx
    frontend/src/pages/CustomTest.jsx
    frontend/src/pages/PreviousYearTest.jsx

Safe hai — agar file mein already ye pattern nahi mila (kyunki aap chahe
jo bhi manually edit kar chuke ho), to woh file bina chhue rehne diya
jayega aur ek warning print hogi.
"""

import os
import sys

FILES_AND_PATCHES = {
    "frontend/src/pages/MockTest.jsx": [
        (
            "  const [agreed, setAgreed] = useState(false);\n",
            "",
        ),
        (
            '''        <label className="flex items-center gap-2 mb-6 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-[#7C3AED]"
          />
          Maine sabhi instructions padh liye hain
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            agreed ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : "bg-gray-700 cursor-not-allowed text-gray-400"
          }`}
        >
          Test Shuru Karein
        </button>''',
            '''        <button
          onClick={onStart}
          className="w-full py-3 rounded-lg font-semibold transition-colors bg-[#7C3AED] hover:bg-[#6D28D9]"
        >
          Test Shuru Karein
        </button>''',
        ),
    ],
    "frontend/src/pages/CustomTest.jsx": [
        (
            "  const [agreed, setAgreed] = useState(false);\n",
            "",
        ),
        (
            '''        <label className="flex items-center gap-2 mb-6 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-[#7C3AED]"
          />
          I have read all the instructions
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            agreed ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : "bg-gray-700 cursor-not-allowed text-gray-400"
          }`}
        >
          Start Test
        </button>''',
            '''        <button
          onClick={onStart}
          className="w-full py-3 rounded-lg font-semibold transition-colors bg-[#7C3AED] hover:bg-[#6D28D9]"
        >
          Start Test
        </button>''',
        ),
    ],
    "frontend/src/pages/PreviousYearTest.jsx": [
        (
            "  const [agreed, setAgreed] = useState(false);\n",
            "",
        ),
        (
            '''        <label className="flex items-center gap-2 mb-6 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-[#7C3AED]"
          />
          Maine sabhi instructions padh liye hain
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            agreed ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : "bg-gray-700 cursor-not-allowed text-gray-400"
          }`}
        >
          Paper Shuru Karein
        </button>''',
            '''        <button
          onClick={onStart}
          className="w-full py-3 rounded-lg font-semibold transition-colors bg-[#7C3AED] hover:bg-[#6D28D9]"
        >
          Paper Shuru Karein
        </button>''',
        ),
    ],
}


def main():
    any_missing = False
    for rel_path, patches in FILES_AND_PATCHES.items():
        if not os.path.exists(rel_path):
            print(f"⚠️  Nahi mili: {rel_path} (skip kar diya — path check karein)")
            any_missing = True
            continue

        with open(rel_path, "r", encoding="utf-8") as f:
            content = f.read()

        original = content
        applied_any = False
        for old, new in patches:
            if old in content:
                content = content.replace(old, new, 1)
                applied_any = True

        if content == original:
            print(f"⚠️  {rel_path}: purana pattern nahi mila — shayad already fix hai ya file alag hai. Skip kiya.")
            continue

        with open(rel_path, "w", encoding="utf-8") as f:
            f.write(content)

        if applied_any:
            print(f"✅ {rel_path} — checkbox hata diya, Start button ab direct chalu hai.")

    if any_missing:
        print("\nNote: kuch files nahi milein. Is script ko apne project ke ROOT folder se chalayein")
        print("(jahan 'frontend' folder maujood hai), root se bahar se nahi.")

    print("\nDone.")


if __name__ == "__main__":
    main()
