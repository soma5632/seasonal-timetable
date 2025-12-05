from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import run_inference
from timetable.generator import generate_teacher_blocks, assign_students_to_blocks, assign_booths
import os
from PIL import Image
import math
import json
import sys

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://souma-lab.com"]}})

# ===== ユーザデータ保存・取得 =====
def get_user_data_path(user_id):
    os.makedirs("userdata", exist_ok=True)
    return os.path.join("userdata", f"{user_id}.json")


def save_user_data(user_id, data):
    path = get_user_data_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_user_data(user_id):
    path = get_user_data_path(user_id)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ===== 推定API =====
@app.route("/schedule/upload", methods=["POST"])
def upload_schedule():
    try:
        file = request.files.get("file")
        start_date = request.form.get("start_date")
        end_date = request.form.get("end_date")

        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        if not start_date or not end_date:
            return jsonify({"error": "Missing start_date or end_date"}), 400

        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, file.filename)
        file.save(filepath)

        # クロップ処理
        img = Image.open(filepath)
        w, h = img.size
        target_ratio = math.sqrt(2)
        target_h = int(w * target_ratio)
        if target_h > h:
            target_h = h
            target_w = int(h / target_ratio)
        else:
            target_w = w
        left = (w - target_w) // 2
        top = (h - target_h) // 2
        right = left + target_w
        bottom = top + target_h
        img_cropped = img.crop((left, top, right, bottom))
        img_cropped.save(filepath)

        schedule_map = run_inference(filepath, start_date, end_date)
        if schedule_map is None:
            return jsonify({
                "status": "error",
                "message": "推論に失敗しました。画像を確認してください。"
            }), 200

        return jsonify(schedule_map)

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

# ===== 時間割生成 =====
@app.route("/timetable/generate", methods=["POST"])
def generate_timetable():
    try:
        body = request.get_json()
        user_id = body.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        # ユーザデータ取得
        user_data = load_user_data(user_id)
        teachers = user_data.get("teachers", [])
        students = user_data.get("students", [])

        # dict → list 正規化
        if isinstance(teachers, dict):
            teachers = list(teachers.values())
        if isinstance(students, dict):
            students = list(students.values())

        # ===== NG関係（名前 → ID に変換） =====
        name_to_id = {s["name"]: s["id"] for s in students}

        ng_pairs = set()
        for t in teachers:
            tid = t["id"]
            for ng_name in t.get("ngStudents", []):
                sid = name_to_id.get(ng_name)
                if sid:
                    ng_pairs.add((tid, sid))

        for s in students:
            sid = s["id"]
            for ng_name in s.get("ngTeachers", []):
                # 先生の名前 → ID
                tid = None
                for t in teachers:
                    if t["name"] == ng_name:
                        tid = t["id"]
                        break
                if tid:
                    ng_pairs.add((tid, sid))

        # ===== 先生の出勤枠 =====
        teacher_availability = {}
        for t in teachers:
            tid = t["id"]
            teacher_availability[tid] = {}

            for term_id, term_schedule in t.get("schedules", {}).items():
                for date_iso, slots in term_schedule.items():
                    # 10コマを None で初期化
                    day_slots = [None] * 10
                    for slot_idx, tag in slots.items():
                        # dict の場合は tag["tag"] を取り出す（triangle など）
                        if isinstance(tag, dict):
                            tag = tag.get("tag")
                        day_slots[int(slot_idx)] = tag
                    teacher_availability[tid][date_iso] = day_slots

        # ===== 生徒の出勤枠 =====
        student_availability = {}
        for s in students:
            sid = s["id"]
            student_availability[sid] = {}

            for term_id, term_schedule in s.get("schedules", {}).items():
                for date_iso, slots in term_schedule.items():
                    day_slots = {}
                    for slot_idx, tag in slots.items():
                        day_slots[str(slot_idx)] = tag
                    student_availability[sid][date_iso] = day_slots

        # ===== フェーズA〜C =====
        # print("[DEBUG] teacher_availability:", teacher_availability)
        # print("[DEBUG] student_availability:", student_availability)

        teacher_blocks = generate_teacher_blocks(teacher_availability)
        print("[DEBUG] teacher_blocks count:", len(teacher_blocks), file=sys.stderr, flush=True)

        lessons = assign_students_to_blocks(
            teacher_blocks,
            students,
            student_availability,
            ng_pairs
        )
        print("[DEBUG] lessons count:", len(lessons), file=sys.stderr, flush=True)

        final_lessons = assign_booths(lessons)
        print("[DEBUG] final_lessons count:", len(final_lessons), file=sys.stderr, flush=True)

        return jsonify({
            "status": "ok",
            "teacherBlocks": teacher_blocks,
            "finalLessons": final_lessons
        })

    except Exception as e:
        print(f"[ERROR] /timetable/generate: {e}")
        return jsonify({"error": str(e)}), 500

# ===== ユーザデータ保存 =====
@app.route("/userdata/save", methods=["POST"])
def save_userdata_api():
    try:
        body = request.get_json()
        user_id = body.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        save_user_data(user_id, body)
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"[ERROR] /userdata/save: {e}")
        return jsonify({"error": str(e)}), 500

# ===== ユーザデータ取得 =====
@app.route("/userdata/load", methods=["GET"])
def load_userdata_api():
    try:
        user_id = request.args.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        data = load_user_data(user_id)

        # dict → list 正規化
        if isinstance(data.get("teachers"), dict):
            data["teachers"] = list(data["teachers"].values())
        if isinstance(data.get("students"), dict):
            data["students"] = list(data["students"].values())

        return jsonify(data)
    except Exception as e:
        print(f"[ERROR] /userdata/load: {e}")
        return jsonify({"error": str(e)}), 500

# ===== 起動 =====
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)