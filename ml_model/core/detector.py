# detector.py

from ultralytics import YOLO
import config
import os

class PersonDetector:
    def __init__(self):
        print("[Detector] Model yüklənir...")
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            if not os.path.exists(config.MODEL_NAME):
                print(f"[XƏTA] Model faylı tapılmadı: {config.MODEL_NAME}")
                print("[INFO] YOLOv8n modelini endirirəm...")
                self.model = YOLO('yolov8n.pt')
            else:
                self.model = YOLO(config.MODEL_NAME)
            print("[Detector] Hazırdır.")
        except Exception as e:
            print(f"[XƏTA] Model yüklənmədi: {e}")
            raise

    def detect(self, frame):
        if self.model is None:
            print("[XƏTA] Model yüklənməyib!")
            return 0, frame

        if frame is None or frame.size == 0:
            print("[XƏTA] Boş frame!")
            return 0, frame

        try:
            results = self.model(
                frame,
                classes=[0],
                conf=config.CONFIDENCE,
                iou=config.IOU,
                verbose=False
            )

            count = len(results[0].boxes)
            annotated = results[0].plot()

            return count, annotated
        except Exception as e:
            print(f"[XƏTA] Deteksiya xətası: {e}")
            return 0, frame