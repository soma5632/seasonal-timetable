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

def generate_teacher_blocks(teacher_availability, min_block_len=3):
    blocks = []
    try:
        for teacher_id, day_map in teacher_availability.items():
            for date_iso, slots in day_map.items():
                start = None
                for i, tag in enumerate(slots):

                    # None を安全に扱う
                    if tag is None:
                        tag = "×"

                    if tag in ("blank", "△", "triangle"):
                        if start is None:
                            start = i
                    else:
                        if start is not None and i - start >= min_block_len:
                            blocks.append({
                                "teacherId": teacher_id,
                                "date": date_iso,
                                "startSlot": start,
                                "endSlot": i - 1,
                            })
                        start = None

                if start is not None and len(slots) - start >= min_block_len:
                    blocks.append({
                        "teacherId": teacher_id,
                        "date": date_iso,
                        "startSlot": start,
                        "endSlot": len(slots) - 1,
                    })

        return blocks

    except Exception as e:
        print("🔥 ERROR in generate_teacher_blocks:", e)
        raise


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

    try:
        lessons: List[Dict[str, Any]] = []
        student_day_usage: Dict[Any, Dict[str, int]] = {}

        students_by_id: Dict[Any, Dict[str, Any]] = {s["id"]: s for s in students}

        if context is None:
            context = {}
        context.setdefault("students", students)

        for block in teacher_blocks:
            teacher_id = block["teacherId"]
            date = block["date"]
            start = block["startSlot"]
            end = block["endSlot"]

            for slot in range(start, end + 1):
                candidate_lessons: List[Tuple[float, Dict[str, Any]]] = []

                # 1:2 の候補
                for s1 in students:
                    sid1 = s1["id"]

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

                        lesson = {
                            "teacherId": teacher_id,
                            "studentIds": [sid1, sid2],
                            "date": date,
                            "slotIdx": slot,
                            "boothIdx": None,
                        }

                        sc = score_lesson(lesson, context) if use_scoring else 0.0
                        candidate_lessons.append((sc, lesson))

                # 1:1 の候補
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

                    sc = score_lesson(lesson, context) if use_scoring else 0.0
                    candidate_lessons.append((sc, lesson))

                if not candidate_lessons:
                    continue

                candidate_lessons.sort(key=lambda x: x[0], reverse=True)
                best_score, best_lesson = candidate_lessons[0]
                lessons.append(best_lesson)

                for sid in best_lesson["studentIds"]:
                    student_day_usage.setdefault(sid, {}).setdefault(date, 0)
                    student_day_usage[sid][date] += 1

        return lessons

    except Exception as e:
        print("🔥 ERROR in assign_students_to_blocks:", e, flush=True)
        raise


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