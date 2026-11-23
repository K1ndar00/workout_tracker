"""Analyse training data: volume by body part, strength trends, personal records, neglected parts.

    python analyze.py                              # reads data/sets.csv (made by fetch_data.py)
    python analyze.py --csv sample/sets.csv        # the bundled synthetic sample
    python analyze.py --today 2026-11-22 --no-charts

Every analysis is a small function that takes a DataFrame and returns a DataFrame, so each one
can be tried (and tested) on its own.
"""
import argparse
from datetime import date
from pathlib import Path

import pandas as pd

PART_LABELS = {
    "shoulder": "肩", "chest": "胸", "arm": "腕", "abs": "腹筋", "back": "背筋", "leg": "脚", "unclassified": "未分類",
}
HERE = Path(__file__).parent


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    return df.dropna(subset=["weight_kg", "reps"])


# ---------------------------------------------------------------------------
# Analyses (DataFrame in, DataFrame out)
# ---------------------------------------------------------------------------

def estimate_1rm(weight_kg: pd.Series, reps: pd.Series) -> pd.Series:
    """Epley formula: weight * (1 + reps / 30). One rep is the weight itself."""
    return weight_kg * (1 + reps / 30)


def week_start(dates: pd.Series) -> pd.Series:
    """The Monday of each date's week (same convention as the web app)."""
    return dates.dt.normalize() - pd.to_timedelta(dates.dt.day_of_week, unit="D")


def weekly_part_volume(df: pd.DataFrame) -> pd.DataFrame:
    """Rows: week (Monday). Columns: body part. Values: total volume in kg (weight x reps)."""
    weekly = df.assign(week=week_start(df["date"])).pivot_table(
        index="week", columns="part", values="volume_kg", aggfunc="sum", fill_value=0
    )
    # include weeks with no training at all, so gaps are visible
    full = pd.date_range(weekly.index.min(), weekly.index.max(), freq="7D")
    return weekly.reindex(full, fill_value=0).rename_axis("week")


def part_balance(df: pd.DataFrame, today: date, weeks: int = 4) -> pd.DataFrame:
    """Share of the volume per body part over the last `weeks` weeks (percent)."""
    since = pd.Timestamp(today) - pd.Timedelta(weeks=weeks)
    recent = df[df["date"] > since]
    total = recent.groupby("part")["volume_kg"].sum()
    out = (total / total.sum() * 100).round(1).sort_values(ascending=False)
    return out.rename("percent").to_frame()


def days_since_last(df: pd.DataFrame, today: date) -> pd.DataFrame:
    """Days since each body part was last trained (neglected parts come last)."""
    last = df.groupby("part")["date"].max()
    days = (pd.Timestamp(today) - last).dt.days
    return pd.DataFrame({"last_date": last.dt.date, "days_ago": days}).sort_values("days_ago")


def exercise_daily(df: pd.DataFrame) -> pd.DataFrame:
    """One row per exercise and day: best weight, best estimated 1RM, sets and volume."""
    d = df.assign(e1rm=estimate_1rm(df["weight_kg"], df["reps"]))
    return (
        d.groupby(["exercise_name", "part", "date"])
        .agg(max_weight_kg=("weight_kg", "max"), e1rm=("e1rm", "max"), sets=("set_id", "count"), volume_kg=("volume_kg", "sum"))
        .reset_index()
    )


def personal_records(df: pd.DataFrame) -> pd.DataFrame:
    """Days on which an exercise reached a new heaviest weight (the first day counts as a record)."""
    daily = exercise_daily(df).sort_values(["exercise_name", "date"])
    prev_best = daily.groupby("exercise_name")["max_weight_kg"].cummax().groupby(daily["exercise_name"]).shift()
    is_pr = prev_best.isna() | (daily["max_weight_kg"] > prev_best)
    return daily[is_pr][["exercise_name", "part", "date", "max_weight_kg"]].reset_index(drop=True)


def training_days_per_week(df: pd.DataFrame) -> pd.Series:
    """Training days per week; weeks without any training are included as 0."""
    days = df[["date"]].drop_duplicates()
    counts = days.groupby(week_start(days["date"])).size()
    full = pd.date_range(counts.index.min(), counts.index.max(), freq="7D")
    return counts.reindex(full, fill_value=0).rename("training_days").rename_axis("week")


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def japanese_font_available() -> bool:
    """Charts need a font with Japanese glyphs; otherwise labels would be empty boxes."""
    from matplotlib import font_manager, rcParams

    wanted = ["Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "IPAexGothic", "IPAGothic", "TakaoGothic", "WenQuanYi Zen Hei"]
    installed = {f.name for f in font_manager.fontManager.ttflist}
    for name in wanted:
        if name in installed:
            rcParams["font.family"] = name
            return True
    return False


def save_charts(df: pd.DataFrame, out: Path, top_n: int = 5) -> list[Path]:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    jp = japanese_font_available()
    label = (lambda p: PART_LABELS.get(p, p)) if jp else (lambda p: p)
    out.mkdir(parents=True, exist_ok=True)
    saved = []

    weekly = weekly_part_volume(df)
    fig, ax = plt.subplots(figsize=(10, 5))
    bottom = pd.Series(0.0, index=weekly.index)
    for part in weekly.columns:
        ax.bar(weekly.index, weekly[part], width=5, bottom=bottom, label=label(part))
        bottom += weekly[part]
    ax.set_title("Weekly volume by body part (kg)" if not jp else "部位別 週間ボリューム (kg)")
    ax.legend(ncol=4, fontsize=8)
    fig.autofmt_xdate()
    saved.append(out / "weekly_part_volume.png")
    fig.savefig(saved[-1], dpi=120, bbox_inches="tight")
    plt.close(fig)

    daily = exercise_daily(df)
    top = daily.groupby("exercise_name")["date"].nunique().sort_values(ascending=False).head(top_n).index
    fig, ax = plt.subplots(figsize=(10, 5))
    for name in top:
        rows = daily[daily["exercise_name"] == name]
        ax.plot(rows["date"], rows["e1rm"], marker="o", markersize=3, label=name)
    ax.set_title("Estimated 1RM by exercise (kg)" if not jp else "種目別 推定1RM の推移 (kg)")
    ax.legend(fontsize=8)
    fig.autofmt_xdate()
    saved.append(out / "e1rm_trend.png")
    fig.savefig(saved[-1], dpi=120, bbox_inches="tight")
    plt.close(fig)
    return saved


def print_report(df: pd.DataFrame, today: date) -> None:
    show = lambda title, table: print(f"\n== {title} ==\n{table.to_string()}")
    print(f"{len(df)} completed sets, {df['date'].dt.date.nunique()} training days "
          f"({df['date'].min().date()} - {df['date'].max().date()})")
    show("Training days per week (last 8)", training_days_per_week(df).tail(8))
    show("Volume share by body part, last 4 weeks (%)", part_balance(df, today).rename(index=PART_LABELS))
    show("Days since each body part was trained", days_since_last(df, today).rename(index=PART_LABELS))
    show("Personal records (latest 10)", personal_records(df).sort_values("date").tail(10))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", type=Path, default=HERE / "data" / "sets.csv")
    ap.add_argument("--out", type=Path, default=HERE / "output")
    ap.add_argument("--today", type=date.fromisoformat, default=date.today(), help="reference date (YYYY-MM-DD)")
    ap.add_argument("--no-charts", action="store_true")
    args = ap.parse_args()

    if not args.csv.exists():
        raise SystemExit(f"{args.csv} not found. Run fetch_data.py first (or use --csv sample/sets.csv).")
    df = load(args.csv)
    if df.empty:
        raise SystemExit("No completed sets yet. Mark sets as completed in the app first.")
    print_report(df, args.today)
    if not args.no_charts:
        for path in save_charts(df, args.out):
            print("saved", path)


if __name__ == "__main__":
    main()
