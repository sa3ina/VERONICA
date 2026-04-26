# config.py

import os

_BASE = os.path.dirname(os.path.abspath(__file__))  # config/ qovluğu
_ROOT = os.path.dirname(_BASE)                       # kök qovluq
CONFIDENCE = 0.25
IOU        = 0.4
MAX_CAPACITY = 30
FRAME_SKIP   = 2
CAMERA_INDEX = 0

THRESHOLDS = {
    "low":    0.40,
    "medium": 0.70,
}

DB_PATH    = os.path.join(_BASE, "crowd_data.db")
MODEL_NAME = os.path.join(_ROOT, "yolov8n.pt")
HOST       = "0.0.0.0"
PORT       = 5000
SAVE_INTERVAL = 5 * 60  # 5 dəqiqə