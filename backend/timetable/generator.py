# メインの生成ロジック（フェーズA〜C）
def generate_teacher_blocks(teacher_availability, min_block_len=3):
    """
    各先生の日付ごとの連続出勤ブロック（△含む）を抽出する
    Returns: List of dicts {teacherId, dateISO, startSlot, endSlot}
    """
    blocks = []

    for teacher_id, day_map in teacher_availability.items():
        for date_iso, slots in day_map.items():
            start = None
            for i, tag in enumerate(slots):
                if tag in ("blank", "△"):
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
            # 最後まで連続していた場合
            if start is not None and len(slots) - start >= min_block_len:
                blocks.append({
                    "teacherId": teacher_id,
                    "date": date_iso,
                    "startSlot": start,
                    "endSlot": len(slots) - 1,
                })

    return blocks

def assign_students_to_blocks(teacher_blocks, students, student_availability, ng_pairs):
    """
    各先生ブロックに対して、生徒を割り当てる（1:1または1:2）
    - NG関係を除外
    - 生徒の1日最大2コマ制限を守る
    - 2コマなら連続必須
    - △は授業あり扱い
    Returns: List of lessons {teacherId, studentIds, date, slotIdx, boothIdx}
    """
    lessons = []
    student_day_usage = {}  # studentId → date → 使用済みコマ数

    for block in teacher_blocks:
        teacher_id = block["teacherId"]
        date = block["date"]
        start = block["startSlot"]
        end = block["endSlot"]

        for slot in range(start, end + 1):
            assigned = False
            for s1 in students:
                sid1 = s1["id"]
                if (teacher_id, sid1) in ng_pairs or (sid1, teacher_id) in ng_pairs:
                    continue
                if student_availability.get(sid1, {}).get(date, {}).get(str(slot)) not in ("blank", "△"):
                    continue
                used = student_day_usage.get(sid1, {}).get(date, 0)
                if used >= 2:
                    continue

                # 1:2 授業を試す
                for s2 in students:
                    sid2 = s2["id"]
                    if sid1 == sid2:
                        continue
                    if (teacher_id, sid2) in ng_pairs or (sid2, teacher_id) in ng_pairs:
                        continue
                    if student_availability.get(sid2, {}).get(date, {}).get(str(slot)) not in ("blank", "△"):
                        continue
                    used2 = student_day_usage.get(sid2, {}).get(date, 0)
                    if used2 >= 2:
                        continue

                    # 両方OKなら1:2で割当
                    lessons.append({
                        "teacherId": teacher_id,
                        "studentIds": [sid1, sid2],
                        "date": date,
                        "slotIdx": slot,
                        "boothIdx": None  # 後で割当
                    })
                    student_day_usage.setdefault(sid1, {}).setdefault(date, 0)
                    student_day_usage.setdefault(sid2, {}).setdefault(date, 0)
                    student_day_usage[sid1][date] += 1
                    student_day_usage[sid2][date] += 1
                    assigned = True
                    break

                if not assigned:
                    # 1:1で割当
                    lessons.append({
                        "teacherId": teacher_id,
                        "studentIds": [sid1],
                        "date": date,
                        "slotIdx": slot,
                        "boothIdx": None
                    })
                    student_day_usage.setdefault(sid1, {}).setdefault(date, 0)
                    student_day_usage[sid1][date] += 1
                    assigned = True

                if assigned:
                    break  # 1枠に1回だけ割当

    return lessons

def assign_booths(lessons, max_booths=6):
    """
    各授業に対して、空いているブース番号（0〜max_booths-1）を割り当てる
    Returns: lessons with boothIdx filled
    """
    booth_usage = {}  # date → slotIdx → set of used boothIdx

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