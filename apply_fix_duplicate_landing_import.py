import os
import re

TARGET_FILE = "frontend/src/App.jsx"

IMPORT_PATTERN = re.compile(r'^\s*import\s+Landing\s+from\s+["\']\./pages/Landing(?:\.jsx)?["\'];?\s*$', re.MULTILINE)
ROUTE_PATTERN = re.compile(r'^\s*<Route\s+path=["\']\/Landing["\']\s+element=\{<Landing\s*/>\}\s*/>\s*$', re.MULTILINE)


def dedupe(content, pattern, label):
    matches = list(pattern.finditer(content))
    if len(matches) <= 1:
        print(f"OK: {label} — {len(matches)} mila, dedupe ki zaroorat nahi.")
        return content, False

    print(f"Mila {len(matches)} {label} — sirf pehla rakh kar baaki hata raha hoon.")
    keep_first = True
    result = []
    last_end = 0
    for m in matches:
        result.append(content[last_end:m.start()])
        if keep_first:
            result.append(m.group(0))
            keep_first = False
        else:
            pass
        last_end = m.end()
    result.append(content[last_end:])
    new_content = "".join(result)

    new_content = re.sub(r'\n{3,}', '\n\n', new_content)
    return new_content, True


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    content, changed1 = dedupe(content, IMPORT_PATTERN, "'import Landing' line")
    content, changed2 = dedupe(content, ROUTE_PATTERN, "'/Landing' Route line")

    if content != original:
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\nOK: {TARGET_FILE} fix ho gaya.")
    else:
        print("\nKuch badla nahi — file already theek hai.")


if __name__ == "__main__":
    main()
