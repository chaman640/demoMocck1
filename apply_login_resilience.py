import os

TARGET_FILE = "frontend/src/pages/HomePage.jsx"

VARIANTS = [
    (
        "    retry: 2,\n    retryDelay: 1500,",
        "    retry: 5,\n    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 20000),",
    ),
    (
        "retry: 2,\n    retryDelay: 1500,",
        "retry: 5,\n    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 20000),",
    ),
]


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    applied = False
    for old, new in VARIANTS:
        if new in content:
            print("OK: fix already lagi hui hai.")
            return
        if old in content:
            content = content.replace(old, new, 1)
            applied = True
            break

    if not applied:
        print("WARNING: purana retry pattern nahi mila. HomePage.jsx mein 'me' query ke")
        print("useQuery block ke andar 'retry' aur 'retryDelay' ko manually ye set karein:")
        print()
        print("    retry: 5,")
        print("    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 20000),")
        return

    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {TARGET_FILE} — retry ab cold-start ke liye zyada robust hai (5 tries, upto ~20s backoff, total ~50s+ tak wait karega).")


if __name__ == "__main__":
    main()
