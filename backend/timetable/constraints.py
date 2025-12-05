# 制約定義（ハード・ソフト）
def is_ng_pair(teacher_id, student_id, ng_pairs):
    return (teacher_id, student_id) in ng_pairs or (student_id, teacher_id) in ng_pairs

def is_available(entity_id, date, slot, availability):
    return availability.get(entity_id, {}).get(date, {}).get(str(slot)) in ("blank", "△")

def has_capacity(student_id, date, usage_map, max_per_day=2):
    return usage_map.get(student_id, {}).get(date, 0) < max_per_day

def is_continuous_block(slots, min_len=3):
    count = 0
    for tag in slots:
        if tag in ("blank", "△"):
            count += 1
            if count >= min_len:
                return True
        else:
            count = 0
    return False

def is_valid_pair(sid1, sid2, teacher_id, date, slot, availability, usage_map, ng_pairs):
    if sid1 == sid2:
        return False
    if is_ng_pair(teacher_id, sid1, ng_pairs) or is_ng_pair(teacher_id, sid2, ng_pairs):
        return False
    if not is_available(sid1, date, slot, availability) or not is_available(sid2, date, slot, availability):
        return False
    if not has_capacity(sid1, date, usage_map) or not has_capacity(sid2, date, usage_map):
        return False
    return True