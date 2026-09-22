import os

TARGET_FILE = "frontend/src/App.jsx"

PATCHES = [
    (
        "import ForgotPassword from './pages/ForgotPassword';\nimport Landing from './pages/Landing';\nimport PrivacyPolicy from './pages/PrivacyPolicy';",
        "import ForgotPassword from './pages/ForgotPassword';\nimport PrivacyPolicy from './pages/PrivacyPolicy';",
    ),
    (
        '<Route path="/" element={<Landing />} /> {/* 🆕 pehle HomePage tha — ab public landing page */}',
        '<Route path="/" element={<HomePage />} />',
    ),
]


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for i, (old, new) in enumerate(PATCHES, 1):
        if new in content:
            print(f"OK: patch {i} already lagi hui hai — skip.")
            continue
        if old in content:
            content = content.replace(old, new, 1)
            print(f"OK: patch {i} laga diya.")
        else:
            print(f"WARNING: patch {i} ka purana pattern nahi mila — file kisi aur ne beech mein badal di ho sakti hai.")
            print("Iska matlab hai koi aur bhi is file ko edit kar raha hai. Manually check karein ya latest file bhejein.")

    if content != original:
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\nOK: {TARGET_FILE} fix ho gayi.")
    else:
        print("\nKuch badla nahi.")


if __name__ == "__main__":
    main()
