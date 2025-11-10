import cv2
import joblib
from inference import run_inference

# --- ダミーの rc_to_indices と row_to_time を用意 ---
# 本番では表構造に応じて生成されますが、テスト用に簡易的に定義

def main():
    import sys, sklearn

    # 2. テスト画像読み込み
    img = cv2.imread("thumbnail_image1.jpg")  # ← 確認用の表画像を置いてください
    if img is None:
        print("画像が読み込めませんでした。画像ファイルを backend に置いてください。")
        return

    # 3. 推論実行
    schedule_map = run_inference(img, clf)

    # 4. 結果表示
    for cell in schedule_map:
        print(cell)

if __name__ == "__main__":
    main()