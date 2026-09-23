import os

TARGET_FILE = "frontend/src/pages/HomePage.jsx"

OLD = """    staleTime: 30 * 1000,
    retry: 5,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 20000),
  });

  useEffect(() => {
    // 👇 Sirf real "session expire/invalid" (401) par hi logout jaisa
    // treat karo — server slow/down hone par user ko chup-chaap wapas
    // signup par mat bhejo.
    if (userError?.response?.status === 401) {
      navigate("/Singup");
    }
  }, [userError, navigate]);"""

NEW = """    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status && status < 500) return false;
      return failureCount < 5;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 20000),
  });

  useEffect(() => {
    if (userError?.response?.status === 401) {
      navigate("/Landing");
    }
  }, [userError, navigate]);"""


def main():
    if not os.path.exists(TARGET_FILE):
        print(f"Nahi mili: {TARGET_FILE} — is script ko project ke ROOT folder se chalayein.")
        return

    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    if 'navigate("/Landing")' in content and "status < 500" in content:
        print("OK: fix already lagi hui hai.")
        return

    if OLD not in content:
        print("WARNING: purana pattern exact match nahi hua — file kisi aur ne beech mein badal di hai.")
        print("Poori current file yahan dobara bhejein, main dubara sahi patch bana dunga.")
        return

    content = content.replace(OLD, NEW, 1)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {TARGET_FILE} — ab 401 par turant Landing page par jayega, koi bekaar retry nahi.")


if __name__ == "__main__":
    main()
