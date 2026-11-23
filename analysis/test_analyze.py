"""Tests for analyze.py. Run: pytest"""
from datetime import date

import pandas as pd
import pytest

import analyze


def sets(*rows):
    """rows: (date, exercise, part, weight_kg, reps)"""
    return pd.DataFrame(
        [
            {"date": pd.Timestamp(d), "exercise_name": ex, "part": part, "weight_kg": w, "reps": r,
             "volume_kg": w * r, "set_id": f"s{i}"}
            for i, (d, ex, part, w, r) in enumerate(rows)
        ]
    )


def test_estimate_1rm_epley():
    got = analyze.estimate_1rm(pd.Series([100.0, 100.0]), pd.Series([5, 1]))
    assert got.round(2).tolist() == [116.67, 103.33]


def test_week_start_is_monday():
    # 2026-11-22 is a Sunday, 2026-11-23 a Monday
    dates = pd.Series(pd.to_datetime(["2026-11-22", "2026-11-23", "2026-11-17"]))
    assert analyze.week_start(dates).dt.strftime("%Y-%m-%d").tolist() == ["2026-11-16", "2026-11-23", "2026-11-16"]


def test_weekly_part_volume_fills_empty_weeks():
    df = sets(("2026-11-02", "bench", "chest", 60, 10), ("2026-11-17", "bench", "chest", 60, 10), ("2026-11-18", "squat", "leg", 100, 5))
    weekly = analyze.weekly_part_volume(df)
    assert [d.strftime("%m-%d") for d in weekly.index] == ["11-02", "11-09", "11-16"]
    assert weekly.loc["2026-11-09"].sum() == 0  # no training that week, but the row exists
    assert weekly.loc["2026-11-16", "chest"] == 600 and weekly.loc["2026-11-16", "leg"] == 500


def test_part_balance_sums_to_100_and_ignores_old_data():
    df = sets(("2026-11-20", "bench", "chest", 50, 10), ("2026-11-20", "squat", "leg", 50, 10), ("2026-09-01", "old", "arm", 99, 99))
    got = analyze.part_balance(df, date(2026, 11, 22), weeks=4)
    assert got["percent"].to_dict() == {"chest": 50.0, "leg": 50.0}  # the September arm set is outside 4 weeks


def test_days_since_last_orders_neglected_parts_last():
    df = sets(("2026-11-20", "bench", "chest", 50, 10), ("2026-11-01", "curl", "arm", 10, 10))
    got = analyze.days_since_last(df, date(2026, 11, 22))
    assert got["days_ago"].to_dict() == {"chest": 2, "arm": 21}
    assert list(got.index) == ["chest", "arm"]


def test_personal_records_first_day_and_only_increases():
    df = sets(
        ("2026-11-01", "bench", "chest", 60, 8),   # first day: record
        ("2026-11-08", "bench", "chest", 60, 10),  # same weight: not a record
        ("2026-11-15", "bench", "chest", 62.5, 5), # heavier: record
        ("2026-11-22", "bench", "chest", 60, 12),  # lighter: not a record
    )
    got = analyze.personal_records(df)
    assert got["date"].dt.strftime("%m-%d").tolist() == ["11-01", "11-15"]
    assert got["max_weight_kg"].tolist() == [60, 62.5]


def test_training_days_per_week_counts_days_not_sets():
    df = sets(("2026-11-16", "a", "chest", 1, 1), ("2026-11-16", "b", "chest", 1, 1), ("2026-11-18", "a", "chest", 1, 1), ("2026-11-24", "a", "chest", 1, 1))
    assert analyze.training_days_per_week(df).tolist() == [2, 1]


def test_training_days_per_week_includes_empty_weeks():
    df = sets(("2026-11-02", "a", "chest", 1, 1), ("2026-11-17", "a", "chest", 1, 1))
    assert analyze.training_days_per_week(df).tolist() == [1, 0, 1]


def test_load_drops_rows_without_numbers(tmp_path):
    p = tmp_path / "s.csv"
    p.write_text("date,weight_kg,reps\n2026-11-01,50,5\n2026-11-02,,5\n", encoding="utf-8")
    assert len(analyze.load(p)) == 1
