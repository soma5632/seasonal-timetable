from flask import Flask, jsonify, request
from inference import run_inference  # ← OCR/抽出処理をまとめた関数を想定

app = Flask(__name__)

@app.route("/schedule", methods=["GET"])
def get_schedule():
    """
    スケジュール抽出API
    例: http://localhost:5000/schedule?image=thumbnail_image1.jpg
    """
    image_path = request.args.get("image", "thumbnail_image1.jpg")
    schedule_map = run_inference(image_path)
    return jsonify(schedule_map)

if __name__ == "__main__":
    # ポート5000で起動
    app.run(host="0.0.0.0", port=5000, debug=True)