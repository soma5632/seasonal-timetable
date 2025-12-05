from typing import Dict, List, Any, Set, Tuple
from .constraints import (
    is_ng_pair,
    is_available,
    has_capacity,
    is_continuous_block,
    is_valid_pair,
)
from .scoring import score_lesson


# =========================
# フェーズA: 先生ブロック生成
# =========================

def generate_teacher_blocks(
    teacher_availability: Dict[Any, Dict[str, List[Any]]],
    min_block_len: int = 3,
) -> List[Dict[str, Any]]:
    """
    各先生の日付ごとの連続出勤ブロック（△含む）を抽出する。
    teacher_availability:
        teacher_id -> date_iso -> [tag0, tag1, ..., tag9]
        tag は "blank" / "×" / "△" / None などを想定
    Returns:
        List[ { "teacherId", "date", "startSlot", "endSlot" } ]
    """
    blocks: List[Dict[str, Any]] = []

    for teacher_id, day_map in teacher_availability.items():
        for date_iso, slots in day_map.items():
            # slots: 長さ10のリスト
            start = None
            for i, tag in enumerate(slots):
                if tag in ("blank", "△"):
                    if start is None:
                        start = i
                else:
                    # 連続が途切れたら、ブロックとして確定
                    if start is not None and i - start >= min_block_len:
                        blocks.append(
                            {
                                "teacherId": teacher_id,
                                "date": date_iso,
                                "startSlot": start,
                                "endSlot": i - 1,
                            }
                        )
                    start = None

            # 最後まで続いていた場合
            if start is not None and len(slots) - start >= min_block_len:
                blocks.append(
                    {
                        "teacherId": teacher_id,
                        "date": date_iso,
                        "startSlot": start,
                        "endSlot": len(slots) - 1,
                    }
                )

    return blocks


# =========================
# フェーズB: 生徒割当
# =========================

def assign_students_to_blocks(
    teacher_blocks: List[Dict[str, Any]],
    students: List[Dict[str, Any]],
    student_availability: Dict[Any, Dict[str, Dict[str, str]]],
    ng_pairs: Set[Tuple[Any, Any]],
    max_lessons_per_day: int = 2,
    use_scoring: bool = True,
    context: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """
    各先生ブロックに対して、生徒を割り当てる（1:1または1:2）。
    - NG関係を除外
    - 生徒の1日最大2コマ制限を守る
    - 2コマなら連続必須（※本実装では「slotごとの独立」で、最初はゆるめにスタートしてもOK）
    - △は授業あり扱い（teacher_availability で考慮済み想定）

    teacher_blocks: generate_teacher_blocks の出力
    students: userData.students の配列
    student_availability:
        student_id -> date_iso -> { slotIdx(str): tag("blank"/"×"/"triangle"/"△") }
    ng_pairs:
        {(teacherId, studentId), (studentId, teacherId), ...}

    Returns:
        lessons: List[
          {
            "teacherId": ...,
            "studentIds": [...],
            "date": date_iso,
            "slotIdx": int,
            "boothIdx": None,  # 後で assign_booths で埋める
          }
        ]
    """
    lessons: List[Dict[str, Any]] = []
    # student_day_usage[student_id][date_iso] = その日の割当コマ数
    student_day_usage: Dict[Any, Dict[str, int]] = {}

    # 生徒を id -> オブジェクト の辞書にしておく（スコアリングなどで参照しやすくする）
    students_by_id: Dict[Any, Dict[str, Any]] = {s["id"]: s for s in students}

    # コンテキストが指定されていなければ初期化
    if context is None:
        context = {}
    context.setdefault("students", students)
    # 必要なら teacherSchedules なども context に入れておく

    for block in teacher_blocks:
        teacher_id = block["teacherId"]
        date = block["date"]
        start = block["startSlot"]
        end = block["endSlot"]

        for slot in range(start, end + 1):
            # この枠に割り当てる候補をスコア付きで列挙する
            candidate_lessons: List[Tuple[float, Dict[str, Any]]] = []

            # まず 1:2 の候補
            for s1 in students:
                sid1 = s1["id"]

                # NG or availability or capacityチェック
                if is_ng_pair(teacher_id, sid1, ng_pairs):
                    continue
                if not is_available(sid1, date, slot, student_availability):
                    continue
                if not has_capacity(sid1, date, student_day_usage, max_per_day=max_lessons_per_day):
                    continue

                for s2 in students:
                    sid2 = s2["id"]
                    if sid1 == sid2:
                        continue

                    if is_ng_pair(teacher_id, sid2, ng_pairs):
                        continue
                    if not is_available(sid2, date, slot, student_availability):
                        continue
                    if not has_capacity(sid2, date, student_day_usage, max_per_day=max_lessons_per_day):
                        continue

                    # ここまで来たら 1:2 候補
                    lesson = {
                        "teacherId": teacher_id,
                        "studentIds": [sid1, sid2],
                        "date": date,
                        "slotIdx": slot,
                        "boothIdx": None,
                    }

                    if use_scoring:
                        sc = score_lesson(lesson, context)
                    else:
                        sc = 0.0
                    candidate_lessons.append((sc, lesson))

            # 1:1 の候補も追加
            for s1 in students:
                sid1 = s1["id"]

                if is_ng_pair(teacher_id, sid1, ng_pairs):
                    continue
                if not is_available(sid1, date, slot, student_availability):
                    continue
                if not has_capacity(sid1, date, student_day_usage, max_per_day=max_lessons_per_day):
                    continue

                lesson = {
                    "teacherId": teacher_id,
                    "studentIds": [sid1],
                    "date": date,
                    "slotIdx": slot,
                    "boothIdx": None,
                }
                if use_scoring:
                    sc = score_lesson(lesson, context)
                else:
                    sc = 0.0
                candidate_lessons.append((sc, lesson))

            if not candidate_lessons:
                # 割り当て可能な生徒がいない枠はスキップ
                continue

            # スコア最大の候補を採用
            candidate_lessons.sort(key=lambda x: x[0], reverse=True)
            best_score, best_lesson = candidate_lessons[0]

            lessons.append(best_lesson)

            # 使用状況更新
            for sid in best_lesson["studentIds"]:
                student_day_usage.setdefault(sid, {}).setdefault(date, 0)
                student_day_usage[sid][date] += 1

    return lessons


# =========================
# フェーズC: ブース割り当て
# =========================

def assign_booths(lessons: List[Dict[str, Any]], max_booths: int = 6) -> List[Dict[str, Any]]:
    """
    各授業に対して、空いているブース番号（0〜max_booths-1）を割り当てる。
    Returns:
        lessons with boothIdx filled
    """
    booth_usage: Dict[str, Dict[int, set]] = {}  # date -> slotIdx -> set of used boothIdx

    for lesson in lessons:
        date = lesson["date"]
        slot = lesson["slotIdx"]

        booth_usage.setdefault(date, {}).setdefault(slot, set())
        used = booth_usage[date][slot]

        # 空いているブースを探す
        for booth in range(max_booths):
            if booth not in used:
                lesson["boothIdx"] = booth
                used.add(booth)
                break
        else:
            # すべて埋まっていた場合（異常）
            lesson["boothIdx"] = -1  # -1でエラー扱い

    return lessons