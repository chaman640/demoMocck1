import os

PATCHES = {
    "frontend/index.html": [
        (
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
            '    <link rel="manifest" href="/manifest.json" />\n'
            '    <meta name="theme-color" content="#7C3AED" />',
        ),
    ],
    "frontend/src/main.jsx": [
        (
            "createRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)",
            "createRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n\n"
            "if ('serviceWorker' in navigator) {\n"
            "  window.addEventListener('load', () => {\n"
            "    navigator.serviceWorker.register('/sw.js').catch(() => {});\n"
            "  });\n"
            "}",
        ),
    ],
    "frontend/src/App.jsx": [
        (
            "import ForgotPassword from './pages/ForgotPassword';",
            "import ForgotPassword from './pages/ForgotPassword';\nimport Landing from './pages/Landing';",
        ),
        (
            '<Route path="/ForgotPassword" element={<ForgotPassword />} />',
            '<Route path="/ForgotPassword" element={<ForgotPassword />} />\n'
            '            <Route path="/Landing" element={<Landing />} />',
        ),
    ],
    "frontend/src/pages/HomePage.jsx": [
        (
            'if (userError?.response?.status === 401) navigate("/Singup");',
            'if (userError?.response?.status === 401) navigate("/Landing");',
        ),
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
                continue
            if old in content:
                content = content.replace(old, new, 1)
            else:
                print(f"WARNING: {rel_path} — ek patch ka purana pattern nahi mila, manually check karein.")

        if content != original:
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"OK: {rel_path} patched.")
        else:
            print(f"SKIP: {rel_path} — kuch badla nahi (already patched ho sakta hai).")

    print("\nDone.")


if __name__ == "__main__":
    main()
