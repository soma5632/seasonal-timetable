from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from inference import run_inference
import os
from PIL import Image
import math

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/schedule/upload", methods=["POST"])
@cross_origin()
def upload_schedule():
    file = request.files.get("file")
    student_id = request.form.get("student_id")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, file.filename)
    file.save(filepath)

    # --- A4比率にクロップ ---
    img = Image.open(filepath)
    w, h = img.size
    target_ratio = math.sqrt(2)  # ≈1.4142

    # 幅を基準に高さを決める
    target_h = int(w * target_ratio)
    if target_h > h:
        # 高さが足りない場合は高さ基準にして幅を決める
        target_h = h
        target_w = int(h / target_ratio)
    else:
        target_w = w

    # 中心を基準にクロップ
    left = (w - target_w) // 2
    top = (h - target_h) // 2
    right = left + target_w
    bottom = top + target_h
    img_cropped = img.crop((left, top, right, bottom))

    # 上書き保存
    img_cropped.save(filepath)

    # OCR推定
    schedule_map = run_inference(filepath)
    return jsonify(schedule_map)

if __name__ == "__main__":
    app.run(port=5000, debug=True)