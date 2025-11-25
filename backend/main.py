from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import run_inference
import os
from PIL import Image
import math
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://souma-lab.com"]}})

# ===== ユーザデータ保存・取得用ヘルパー =====
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
        student_id = request.form.get("student_id")
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

        print(f"[DEBUG] Cropped image saved at {filepath}")

        # 推定処理
        schedule_map = run_inference(filepath, start_date, end_date)
        print(f"[DEBUG] Inference result: {schedule_map}")

        if schedule_map is None:
            return jsonify({
                "status": "error",
                "message": "推論に失敗しました。画像を確認してください。"
            }), 200

        return jsonify(schedule_map)

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

# ===== ユーザデータ保存API =====
@app.route("/userdata/save", methods=["POST"])
def save_userdata():
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

# ===== ユーザデータ取得API =====
@app.route("/userdata/load", methods=["GET"])
def load_userdata():
    try:
        user_id = request.args.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400
        data = load_user_data(user_id)
        return jsonify(data)
    except Exception as e:
        print(f"[ERROR] /userdata/load: {e}")
        return jsonify({"error": str(e)}), 500

# ===== 起動 =====
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)