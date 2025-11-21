import cv2
import numpy as np
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"/usr/local/bin/tesseract"
import re
from skimage.feature import hog
import joblib
import os


row_to_time = {
    2: "10:00-11:30",
    3: "11:10-12:40",
    4: "13:20-14:50",
    5: "14:30-16:00",
    6: "15:40-17:10",
    7: "16:05-17:35",
    8: "17:10-18:40",
    9: "18:15-19:45",
    10: "19:20-20:50",
    11: "20:30-22:00",

    13: "10:00-11:30",
    14: "11:10-12:40",
    15: "13:20-14:50",
    16: "14:30-16:00",
    17: "15:40-17:10",
    18: "16:05-17:35",
    19: "17:10-18:40",
    20: "18:15-19:45",
    21: "19:20-20:50",
    22: "20:30-22:00",

    24: "10:00-11:30",
    25: "11:10-12:40",
    26: "13:20-14:50",
    27: "14:30-16:00",
    28: "15:40-17:10",
    29: "16:05-17:35",
    30: "17:10-18:40",
    31: "18:15-19:45",
    32: "19:20-20:50",
    33: "20:30-22:00",

    35: "10:00-11:30",
    36: "11:10-12:40",
    37: "13:20-14:50",
    38: "14:30-16:00",
    39: "15:40-17:10",
    40: "16:05-17:35",
    41: "17:10-18:40",
    42: "18:15-19:45",
    43: "19:20-20:50",
    44: "20:30-22:00"
}

rc_to_indices = {
    (1, 1): [(x, 1) for x in range(2, 12)],
    (1, 2): [(x, 2) for x in range(2, 12)],
    (1, 3): [(x, 3) for x in range(2, 12)],
    (1, 4): [(x, 4) for x in range(2, 12)],
    (1, 5): [(x, 5) for x in range(2, 12)],
    (1, 6): [(x, 6) for x in range(2, 12)],
    (12, 1): [(x, 1) for x in range(13, 23)],
    (12, 2): [(x, 2) for x in range(13, 23)],
    (12, 3): [(x, 3) for x in range(13, 23)],
    (12, 4): [(x, 4) for x in range(13, 23)],
    (12, 5): [(x, 5) for x in range(13, 23)],
    (12, 6): [(x, 6) for x in range(13, 23)],
    (23, 1): [(x, 1) for x in range(24, 34)],
    (23, 2): [(x, 2) for x in range(24, 34)],
    (23, 3): [(x, 3) for x in range(24, 34)],
    (23, 4): [(x, 4) for x in range(24, 34)],
    (23, 5): [(x, 5) for x in range(24, 34)],
    (23, 6): [(x, 6) for x in range(24, 34)],
    (34, 1): [(x, 1) for x in range(35, 45)],
    (34, 2): [(x, 2) for x in range(35, 45)],
    (34, 3): [(x, 3) for x in range(35, 45)],
    (34, 4): [(x, 4) for x in range(35, 45)],
    (34, 5): [(x, 5) for x in range(35, 45)],
    (34, 6): [(x, 6) for x in range(35, 45)]
}


# --- ポリゴン拡張 ---
def expand_polygon(pts, offset=10):
    cx, cy = np.mean(pts, axis=0)
    expanded = []
    for (x, y) in pts:
        vx, vy = x - cx, y - cy
        norm = np.sqrt(vx**2 + vy**2) + 1e-6
        ex = x + offset * (vx / norm)
        ey = y + offset * (vy / norm)
        expanded.append([ex, ey])
    return np.array(expanded, dtype="float32")

# --- 表の透視変換 ---
def auto_table_warp(img, thresh, target_height=1320):
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    tables = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h / (thresh.shape[0] * thresh.shape[1])
        if 0.7 > area > 0.1:
            tables.append(cnt)

    if not tables:
        return img

    main_cnt = max(tables, key=cv2.contourArea)
    peri = cv2.arcLength(main_cnt, True)
    approx = cv2.approxPolyDP(main_cnt, 0.02 * peri, True)

    if len(approx) == 4:
        pts = approx.reshape(4, 2).astype("float32")
        pts = expand_polygon(pts, offset=30)

        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]

        (tl, tr, br, bl) = rect
        widthA = np.linalg.norm(br - bl)
        widthB = np.linalg.norm(tr - tl)
        maxWidth = int(max(widthA, widthB))
        heightA = np.linalg.norm(tr - br)
        heightB = np.linalg.norm(tl - bl)
        maxHeight = int(max(heightA, heightB))

        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

        scale = target_height / warped.shape[0]
        new_width = int(warped.shape[1] * scale)
        warped_resized = cv2.resize(warped, (new_width, target_height))
        return warped_resized

    x, y, w, h = cv2.boundingRect(main_cnt)
    roi = img[y:y+h, x:x+w]
    scale = target_height / roi.shape[0]
    new_width = int(roi.shape[1] * scale)
    return cv2.resize(roi, (new_width, target_height))

# --- 罫線抽出 ---
def extract_grid(roi):
    roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    roi_thresh = cv2.adaptiveThreshold(~roi_gray, 255,
                                       cv2.ADAPTIVE_THRESH_MEAN_C,
                                       cv2.THRESH_BINARY, 31, -5)

    # 水平線抽出
    horizontal = roi_thresh.copy()
    cols = horizontal.shape[1]
    horizontal_size = cols // 30
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (horizontal_size, 1))
    horizontal = cv2.erode(horizontal, kernel_h)
    horizontal = cv2.dilate(horizontal, kernel_h)

    # 垂直線抽出
    vertical = roi_thresh.copy()
    rows = vertical.shape[0]
    vertical_size = rows // 30
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vertical_size))
    vertical = cv2.erode(vertical, kernel_v)
    vertical = cv2.dilate(vertical, kernel_v)

    # 合成
    mask = horizontal + vertical

    return mask

# --- セル抽出 ---
def extract_cells(img, mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    cells = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < 30 or h < 20:
            continue
        cells.append((x, y, w, h))

    cells = sorted(cells, key=lambda c: (c[0], c[1]))
    cells = cells[1:]  # 最初の要素は表全体なので除去
    return cells

# --- セル分類 ---
def classify_cell(cells):
    classified_cells = []
    avg_h = np.mean([bbox[3] for bbox in cells])
    avg_w = np.mean([bbox[2] for bbox in cells])

    for i, bbox in enumerate(cells):
        x, y, w, h = bbox

        # 縦長セル → 祝日開校
        if h > avg_h * 1.5 and w < avg_w * 0.6:
            classified_cells.append({"bbox": bbox, "tag": "open_holiday"})
        # 横長セル → 1日まるごと休み
        elif h > avg_h * 2.0:
            classified_cells.append({"bbox": bbox, "tag": "holiday"})

        # それ以外は通常
        else:
            classified_cells.append({"bbox": bbox, "tag": "normal"})

    return classified_cells

# --- 座標クラスタリング ---
def cluster_positions(values, tol=10):
    clusters = []
    for v in sorted(values):
        if not clusters or abs(clusters[-1] - v) > tol:
            clusters.append(v)
        else:
            clusters[-1] = (clusters[-1] + v) / 2
    return clusters

# --- 行列インデックス付け ---
def assign_indices(cells, row_tol=None, col_tol=None):
    xs = [c["bbox"][0] + c["bbox"][2] / 2 for c in cells]
    ys = [c["bbox"][1] + c["bbox"][3] / 2 for c in cells]
    ws = [c["bbox"][2] for c in cells]
    hs = [c["bbox"][3] for c in cells]

    if col_tol is None and ws:
        med_w = np.median(ws)
        col_tol = max(10, med_w * 0.5)

    if row_tol is None and hs:
        med_h = np.median(hs)
        row_tol = max(10, med_h * 0.5)

    col_centers = cluster_positions(xs, tol=col_tol)
    row_centers = cluster_positions(ys, tol=row_tol)

    indexed = []
    for c in cells:
        x, y, w, h = c["bbox"]
        cx, cy = x + w/2, y + h/2
        col = min(range(len(col_centers)), key=lambda i: abs(col_centers[i]-cx))
        row = min(range(len(row_centers)), key=lambda i: abs(row_centers[i]-cy))
        indexed.append(((row, col), c["bbox"], c["tag"]))
    return indexed, row_centers, col_centers

# --- OCR前処理 ---
def preprocess(cell):
    gray = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel)
    th = cv2.resize(th, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    return th

# --- 数字正規化 ---
def normalize_digits(text: str) -> str:
    z2h = str.maketrans("０１２３４５６７８９", "0123456789")
    t = text.translate(z2h)
    replacements = {"｜": "1", "|": "1", "ｌ": "1", "l": "1", "f": "1",
                    "{": "1", "｛": "1", "I": "1", "了": "7", "g": "8"}
    for k, v in replacements.items():
        t = t.replace(k, v)
    return t

# --- 日付抽出 ---
def parse_month_day(text: str):
    t = normalize_digits(text)
    m = re.search(r'(\d+)\s+[一-龥]+(?:\s+[一-龥]+)?\s+(\d+)\s*[一-龥]+', t)
    return (int(m.group(1)), int(m.group(2))) if m else None

def ocr_date_cell(img, bbox):
    x, y, w, h = bbox
    cell = img[y:y+h, x:x+w]
    th = preprocess(cell)
    config = "-l jpn --psm 8"
    text = pytesseract.image_to_string(
        th,
        lang="jpn",
        config=config
    ).strip()
    print(f"[DEBUG] 素材そのままの日付：{text}")
    return parse_month_day(text)

def assign_dates(indexed_cells, rc_to_indices, image, row_to_time):
    rc_to_cell = {rc: (bbox, tag) for (rc, bbox, tag) in indexed_cells}
    schedule_map = []

    # OCRで日付セルを抽出
    date_rcs_sorted = sorted(rc_to_indices.keys(), key=lambda rc: rc[0])
    md_list = []
    for date_rc in date_rcs_sorted:
        if date_rc not in rc_to_cell:
            continue
        bbox, tag = rc_to_cell[date_rc]
        md = ocr_date_cell(image, bbox)  # (month, day) or None
        if md:
            md_list.append((date_rc[0], date_rc[1], md))

    print(f"[DEBUG] 修正前の日付：{md_list}")

    # 前方向補正
    corrected = correct_days_forward(md_list)
    # 後方向補正
    corrected = correct_days_backward(corrected)

    # schedule_map に展開
    for (row, col), md in corrected:
        print(f"[DEBUG] 修正後の日付：{md}")
        target_rcs = rc_to_indices.get((row, col), [])
        for rc in target_rcs:
            if rc not in rc_to_cell:
                continue
            bbox, tag = rc_to_cell[rc]
            schedule_map.append({
                "rc": rc,
                "date": md,
                "time": row_to_time.get(rc[0]),
                "bbox": bbox
            })

    return schedule_map

# --- 日付補正 ---
def correct_days_forward(md_list):
    corrected = []
    prev_day = None
    for (row, col, (month, day)) in md_list:
        if prev_day is not None:
            expected = prev_day + 1
            if 1 <= day <= 9 and day + 10 == expected:
                day = expected
        corrected.append(((row, col), (month, day)))
        prev_day = day
    return corrected

def correct_days_backward(md_list):
    corrected = md_list[:]
    next_day = None
    for i in range(len(corrected)-1, -1, -1):
        (row, col), (month, day) = corrected[i]
        if next_day is not None:
            expected = next_day - 1
            if 1 <= day <= 9 and day + 10 == expected:
                day = expected
        corrected[i] = ((row, col), (month, day))
        next_day = day
    return corrected

# --- 特徴抽出（SVM用） ---
def extract_features(img, size=(32,32)):
    img_resized = cv2.resize(img, size)
    feat = hog(img_resized, orientations=9, pixels_per_cell=(8,8),
               cells_per_block=(2,2), block_norm='L2-Hys')
    return feat


# --- メイン推論関数 ---
def run_inference(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"画像が読み込めませんでした: {os.path.abspath(image_path)}")
    clf = joblib.load("svm_model (1).pkl")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(~gray, 255,
                                   cv2.ADAPTIVE_THRESH_MEAN_C,
                                   cv2.THRESH_BINARY, 15, -2)
    roi = auto_table_warp(image, thresh)
    mask = extract_grid(roi)
    cells = extract_cells(roi, mask)
    classified_cells = classify_cell(cells)
    indexed_cells, _, _ = assign_indices(classified_cells)
    schedule_map = assign_dates(indexed_cells, rc_to_indices, roi, row_to_time)

    for i, cell in enumerate(schedule_map):
        x, y, w, h = cell['bbox']
        roi_cell = cv2.cvtColor(roi[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY)
        feat = extract_features(roi_cell)
        pred = clf.predict([feat])[0]
        schedule_map[i]['tag'] = str(pred)

    return schedule_map