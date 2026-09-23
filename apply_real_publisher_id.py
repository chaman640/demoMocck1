import os

REAL_PUB_ID = "pub-2902001191700540"

PATCHES = {
    "frontend/public/ads.txt": [
        ("pub-XXXXXXXXXXXXXXXX", REAL_PUB_ID),
    ],
    "frontend/index.html": [
        ("ca-pub-XXXXXXXXXXXXXXXX", f"ca-{REAL_PUB_ID}"),
    ],
    "frontend/src/components/AdBanner.jsx": [
        ("ca-pub-XXXXXXXXXXXXXXXX", f"ca-{REAL_PUB_ID}"),
    ],
}


def main():
    for rel_path, patches in PATCHES.items():
        if not os.path.exists(rel_path):
            print(f"Nahi mili: {rel_path} — skip.")
            continue

        with open(rel_path, "r", encoding="utf-8") as f:
            content = f.read()

        original = content
        for old, new in patches:
            if new in content:
                print(f"OK: {rel_path} — already lagi hui hai.")
                continue
            if old in content:
                content = content.replace(old, new)
                print(f"OK: {rel_path} — Publisher ID daal di.")
            else:
                print(f"WARNING: {rel_path} — placeholder nahi mila, manually check karein.")

        if content != original:
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(content)

    print("\nDone. Ad Slot ID (MockTest.jsx) abhi bhi baaki hai — wo AdSense mein alag se 'Ad Unit' banane par milegi.")


if __name__ == "__main__":
    main()
