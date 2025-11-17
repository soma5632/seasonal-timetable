from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from inference import run_inference
import os
from PIL import Image
import math

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://souma-lab.com"]}})

@app.route("/schedule/upload", methods=["POST"])
def upload_schedule():
    try:
        file = request.files.get("file")
        student_id = request.form.get("student_id")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

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

        # OCR推定
        schedule_map = run_inference(filepath)
        print(f"[DEBUG] Inference result: {schedule_map}")

        if schedule_map is None:
            return jsonify({"error": "Inference returned None"}), 500

        return jsonify(schedule_map)

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)