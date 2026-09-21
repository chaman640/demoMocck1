#!/usr/bin/env python3
"""
Chalane ka tarika (project ke ROOT folder se):

    python3 apply_time_analysis_ui.py

Ye 4 files patch karega:
    frontend/src/pages/UserAllAnalysis.jsx
    frontend/src/pages/UserTopicAnalysis.jsx
    frontend/src/pages/CustomTest.jsx
    frontend/src/pages/PreviousYearTest.jsx

Agar kisi file mein purana pattern nahi mila, wo file skip ho jayegi
aur warning print hogi — kuch bhi silently corrupt nahi hoga.
"""

import os

PATCHES = {
    "frontend/src/pages/UserAllAnalysis.jsx": [
        (
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-2">
          Time taken: {q.timeTakenInSeconds}s
          {averageTimePerQuestion > 0 && <span className="text-gray-600"> (your average: {averageTimePerQuestion}s)</span>}
        </p>
      )}''',
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-2">
          Time taken: {q.timeTakenInSeconds}s
          {averageTimePerQuestion > 0 && <span className="text-gray-600"> (your average: {averageTimePerQuestion}s)</span>}
          {q.batchAverageTimeSeconds != null && <span className="text-gray-600"> (batch average: {q.batchAverageTimeSeconds}s)</span>}
        </p>
      )}''',
        ),
    ],
    "frontend/src/pages/UserTopicAnalysis.jsx": [
        (
            '''          <div className="bg-[#111827] border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg col-span-2 sm:col-span-1">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium mb-1">Unattempted</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-300">{data.summary?.totalUnattempted}</p>
          </div>
        </div>

        {/* Status filter tabs */}''',
            '''          <div className="bg-[#111827] border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg col-span-2 sm:col-span-1">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium mb-1">Unattempted</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-300">{data.summary?.totalUnattempted}</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-xs text-gray-500 font-medium mb-2">Average Time per Question</p>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-lg font-bold text-[#A78BFA]">{data.summary?.averageTimePerQuestion}s</p>
              <p className="text-[10px] text-gray-500">You</p>
            </div>
            <div>
              {data.summary?.batchAverageTimeSeconds != null ? (
                <>
                  <p className="text-lg font-bold text-gray-300">{data.summary.batchAverageTimeSeconds}s</p>
                  <p className="text-[10px] text-gray-500">Batch average</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-600">—</p>
                  <p className="text-[10px] text-gray-600">Not enough batch data yet</p>
                </>
              )}
            </div>
            {data.summary?.batchAverageTimeSeconds != null && (
              <span
                className={`ml-auto text-xs px-2.5 py-1 rounded-full border font-medium ${
                  data.summary.averageTimePerQuestion > data.summary.batchAverageTimeSeconds * 1.2
                    ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
                    : data.summary.averageTimePerQuestion < data.summary.batchAverageTimeSeconds * 0.8
                    ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                    : "text-green-400 bg-green-500/10 border-green-500/30"
                }`}
              >
                {data.summary.averageTimePerQuestion > data.summary.batchAverageTimeSeconds * 1.2
                  ? "Slower than batch"
                  : data.summary.averageTimePerQuestion < data.summary.batchAverageTimeSeconds * 0.8
                  ? "Faster than batch"
                  : "About average"}
              </span>
            )}
          </div>
        </div>

        {/* Status filter tabs */}''',
        ),
        (
            '''          <span>•</span>
          <span>Time: {q.timeTakenInSeconds ?? "—"}s</span>
        </div>
      </div>''',
            '''          <span>•</span>
          <span>
            Time: {q.timeTakenInSeconds ?? "—"}s
            {q.batchAverageTimeSeconds != null && ` (batch avg: ${q.batchAverageTimeSeconds}s)`}
          </span>
        </div>
      </div>''',
        ),
    ],
    "frontend/src/pages/CustomTest.jsx": [
        (
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">Time taken: {q.timeTakenInSeconds}s</p>
      )}''',
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">
          Time taken: {q.timeTakenInSeconds}s
          {q.batchAverageTimeSeconds != null && <span className="text-gray-600"> (batch average: {q.batchAverageTimeSeconds}s)</span>}
        </p>
      )}''',
        ),
    ],
    "frontend/src/pages/PreviousYearTest.jsx": [
        (
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">Time liya gaya: {q.timeTakenInSeconds}s</p>
      )}''',
            '''      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">
          Time taken: {q.timeTakenInSeconds}s
          {q.batchAverageTimeSeconds != null && <span className="text-gray-600"> (batch average: {q.batchAverageTimeSeconds}s)</span>}
        </p>
      )}''',
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

    print("Done.")


if __name__ == "__main__":
    main()
