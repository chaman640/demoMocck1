def patch_once(path, marker, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if marker in content:
        print(f"OK [{label}]: already applied earlier, skipping — {path}")
        return
    if old not in content:
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (pehle coins_phase1_backend.zip apply karein)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(old, new))
    print(f"OK [{label}]: patched {path}")


patch_once(
    "backend/models/User.js",
    "freePhysicalClaims",
    "    boostActivationsDate: { type: String, default: null },",
    "    boostActivationsDate: { type: String, default: null },\n    freePhysicalClaims: { type: Number, default: 0 },",
    "User.js: freePhysicalClaims counter",
)

print("")
print("Done. Read every OK/WARNING line above.")
