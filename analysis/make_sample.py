"""Generate sample/sets.csv: SYNTHETIC training data (not real) so analyze.py can be tried without Supabase.

    python make_sample.py

Fixed random seed, so the output is always the same. About 14 weeks, 3 sessions a week
(push / pull / legs), one skipped week, slowly increasing weights, and arms/abs left out
in the last weeks so "neglected body part" shows up in the report.
"""
import random
import uuid
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

END = date(2026, 11, 22)
WEEKS = 14
# part -> (exercise, start weight kg, weekly increase kg, reps)
PUSH = [("chest", "ベンチプレス", 60, 1.25, 8), ("chest", "ダンベルフライ", 14, 0.25, 12), ("shoulder", "ショルダープレス", 30, 0.75, 10), ("shoulder", "サイドレイズ", 8, 0.1, 15), ("arm", "ケーブルプッシュダウン", 25, 0.5, 12)]
PULL = [("back", "デッドリフト", 90, 2.5, 5), ("back", "ラットプルダウン", 50, 1, 10), ("back", "シーテッドロウ", 45, 1, 10), ("arm", "ダンベルカール", 12, 0.25, 10)]
LEGS = [("leg", "スクワット", 80, 2, 6), ("leg", "レッグプレス", 150, 5, 10), ("leg", "レッグカール", 35, 1, 12), ("abs", "レッグレイズ", 0, 0, 15)]
SESSIONS = [("push", PUSH), ("pull", PULL), ("legs", LEGS)]


def main() -> None:
    rng = random.Random(42)
    monday = END - timedelta(days=END.weekday()) - timedelta(weeks=WEEKS - 1)
    rows = []
    for w in range(WEEKS):
        if w == 6:  # a skipped week
            continue
        for i, (kind, exercises) in enumerate(SESSIONS):
            day = monday + timedelta(weeks=w, days=i * 2)  # Mon / Wed / Fri
            if day > END:
                continue
            for part, name, start, step, reps in exercises:
                if w >= WEEKS - 4 and part in ("arm", "abs"):
                    continue  # neglected in the last 4 weeks
                weight = round(start + step * w + rng.choice([-0.5, 0, 0, 0.5]), 2) if start else 0
                for s in range(3):
                    r = reps - (1 if s == 2 else 0) + rng.choice([0, 0, 1])
                    if rng.random() < 0.05:
                        continue  # a set that was not completed
                    key = f"{day}-{name}-{s}"
                    rows.append({
                        "date": day.isoformat(),
                        "workout_id": uuid.uuid5(uuid.NAMESPACE_URL, f"w-{day}-{kind}"),
                        "exercise_id": uuid.uuid5(uuid.NAMESPACE_URL, f"e-{name}"),
                        "exercise_name": name,
                        "part": part,
                        "set_id": uuid.uuid5(uuid.NAMESPACE_URL, key),
                        "weight_kg": weight,
                        "reps": r,
                        "volume_kg": round(weight * r, 2),
                    })
    out = Path(__file__).parent / "sample" / "sets.csv"
    out.parent.mkdir(exist_ok=True)
    pd.DataFrame(rows).to_csv(out, index=False)
    print(f"Saved {len(rows)} sets to {out}")


if __name__ == "__main__":
    main()
