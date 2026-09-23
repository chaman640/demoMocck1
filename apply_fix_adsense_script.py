import os

TARGET_FILE = "frontend/index.html"

OLD = '    <title>BatchMock.in</title>\n  </head>'
NEW = (
    '    <title>BatchMock.in</title>\n'
    '    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>\n'
    '  </head>'
)


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    if "adsbygoogle.js" in content:
        print("OK: AdSense script tag already maujood hai — kuch nahi kiya.")
        return

    if OLD not in content:
        print("WARNING: purana pattern nahi mila. index.html mein <head> ke andar ye line manually daal dein:")
        print()
        print('    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>')
        return

    content = content.replace(OLD, NEW, 1)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {TARGET_FILE} mein AdSense script tag add ho gaya.")


if __name__ == "__main__":
    main()
