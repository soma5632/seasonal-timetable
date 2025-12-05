# スコアリング関数
def preferred_time_score(student, slot):
    grade = student.get("grade", "")
    if grade.startswith("小") and slot in [0, 1]:
        return 5  # 小学生は午前優先
    if grade.startswith("中1") or grade.startswith("中2"):
        if slot in [2, 3, 4]:
            return 5  # 中1・中2は昼優先
    return 0

def is_adjacent_to_triangle(date, slot, teacher_schedule):
    slots = teacher_schedule.get(date, {})
    return (
        slots.get(slot - 1) == "△" or
        slots.get(slot + 1) == "△"
    )

def score_lesson(lesson, context):
    score = 0
    teacher_id = lesson["teacherId"]
    student_ids = lesson["studentIds"]
    date = lesson["date"]
    slot = lesson["slotIdx"]

    teacher_schedule = context["teacherSchedules"].get(teacher_id, {})
    students = context["students"]

    # △隣接
    if is_adjacent_to_triangle(date, slot, teacher_schedule):
        score += 10

    # 時間帯嗜好
    for sid in student_ids:
        student = next((s for s in students if s["id"] == sid), None)
        if student:
            score += preferred_time_score(student, slot)

    return score