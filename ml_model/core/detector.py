# detector.py

from ultralytics import YOLO
import config

class PersonDetector:
    def __init__(self):
        print("[Detector] Model yüklənir...")
        self.model = YOLO(config.MODEL_NAME)
        print("[Detector] Hazırdır.")

    def detect(self, frame):
        results = self.model(
            frame,
            classes=[0],
            conf=config.CONFIDENCE,
            iou=config.IOU,
            verbose=False
        )

        count     = len(results[0].boxes)
        annotated = results[0].plot()

        return count, annotated