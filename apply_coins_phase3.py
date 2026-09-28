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
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (file may have changed, needs manual check)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED (ambiguous, needs manual check)")
        return
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK [{label}]: patched {path}")


patch_once(
    "frontend/src/App.jsx",
    "import ManageBooks from",
    "import PrivacyPolicy from './pages/PrivacyPolicy';",
    """import PrivacyPolicy from './pages/PrivacyPolicy';
import ManageBooks from './pages/ManageBooks';
import ManageBookOrders from './pages/ManageBookOrders';""",
    "App.jsx: book management imports",
)

patch_once(
    "frontend/src/App.jsx",
    'path="/ManageBooks"',
    '            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />',
    """            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
            <Route path="/ManageBooks" element={<ManageBooks />} />
            <Route path="/ManageBookOrders" element={<ManageBookOrders />} />""",
    "App.jsx: book management routes",
)

patch_once(
    "frontend/src/pages/AdminPanel.jsx",
    'navigate("/ManageBooks")',
    """          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>
        </button>""",
    """          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/ManageBooks")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📚</span>
            <h3 className="font-semibold text-sm">Books Manage Karein</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Add, price, stock</p>
          </button>
          <button
            onClick={() => navigate("/ManageBookOrders")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📦</span>
            <h3 className="font-semibold text-sm">Book Orders</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Ship / deliver karein</p>
          </button>
        </div>""",
    "AdminPanel.jsx: Books + Orders entry",
)

patch_once(
    "frontend/src/pages/teacher/TeacherDashboard.jsx",
    'navigate("/ManageBooks")',
    "        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={refetch} />",
    """        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={refetch} />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/ManageBooks")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📚</span>
            <p className="font-semibold text-sm">Rewards Books</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Add & manage</p>
          </button>
          <button
            onClick={() => navigate("/ManageBookOrders")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📦</span>
            <p className="font-semibold text-sm">Book Orders</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Ship & track</p>
          </button>
        </div>""",
    "TeacherDashboard.jsx: Books + Orders entry",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
