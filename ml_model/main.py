# main.py

import cv2
import time
import threading
import base64
import config
import state
import storage
import random
import numpy as np

from detector import PersonDetector
import density as density_calc

storage.init_db()

# Check if we're in demo mode (no camera available)
if config.DEMO_MODE:
    print("[INFO] DEMO MODE aktiv - fake deteksiya verilir")
    detector = None
else:
    try:
        detector = PersonDetector()
    except Exception as e:
        print(f"[XƏTA] Detektor yaradılmadı: {e}")
        print("[INFO] DEMO MODE aktivləşdirilir...")
        detector = None

def get_video_source():
    """Returns video capture source based on config"""
    if config.VIDEO_PATH and config.VIDEO_PATH.strip():
        print(f"[INFO] Video faylından oxunur: {config.VIDEO_PATH}")
        cap = cv2.VideoCapture(config.VIDEO_PATH)
        if cap.isOpened():
            return cap, True  # True = is video file (loop needed)
        else:
            print(f"[XƏTA] Video faylı açılmadı: {config.VIDEO_PATH}")

    print(f"[INFO] Kamera açılır (index={config.CAMERA_INDEX})")
    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    return cap, False  # False = not a file (no loop)

def generate_fake_frame():
    """Generate a fake frame for demo mode"""
    # Create a blank image with some random shapes
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Add some noise for visual variety
    frame = np.random.randint(0, 50, (480, 640, 3), dtype=np.uint8)
    # Add text
    cv2.putText(frame, "DEMO MODE - No Camera", (50, 240),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    return frame

def camera_loop():
    if config.DEMO_MODE or detector is None:
        print("[INFO] Demo rejimi işə düşdü (kamera yoxdur)")
        run_demo_loop()
        return

    cap, is_video_file = get_video_source()

    if not cap.isOpened():
        print("[XƏTA] Video mənbəyi açılmadı! Demo rejiminə keçir...")
        run_demo_loop()
        return

    print("[INFO] Kamera işə düşdü.")
    last_saved_at = 0.0
    frame_index = 0

    while True:
        try:
            ret, frame = cap.read()

            # If video file ended, restart it
            if not ret and is_video_file:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()

            if not ret:
                print("[XƏTA] Frame alınmadı, yenidən cəhd edilir...")
                time.sleep(1)
                continue

            frame_index += 1
            if frame_index % max(1, config.FRAME_SKIP) != 0:
                continue

            count, annotated = detector.detect(frame)
            result = density_calc.calculate(count)

            ok, jpeg = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_jpeg_b64 = base64.b64encode(jpeg.tobytes()).decode('ascii') if ok else None

            state.update(result, frame_jpeg_b64=frame_jpeg_b64)

            now = time.time()
            if now - last_saved_at >= config.SAVE_INTERVAL:
                storage.save(result)
                last_saved_at = now
                print(f"[SAXLANDI] [{result['level']}] {count} nəfər | {result['percent']}%")

            time.sleep(0.03)

        except Exception as e:
            print(f"[XƏTA]: {e}")
            time.sleep(1)
            continue

    cap.release()

def run_demo_loop():
    """Run a demo loop that generates fake data"""
    print("[INFO] Demo loop başladı")
    last_saved_at = 0.0
    frame_index = 0

    # Simulate varying crowd levels
    base_count = 15

    while True:
        try:
            frame_index += 1
            if frame_index % max(1, config.FRAME_SKIP) != 0:
                time.sleep(0.03)
                continue

            # Generate fake count with some variation
            variation = random.randint(-5, 5)
            count = max(0, min(config.MAX_CAPACITY, base_count + variation))

            result = density_calc.calculate(count)

            # Generate fake frame
            frame = generate_fake_frame()
            ok, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_jpeg_b64 = base64.b64encode(jpeg.tobytes()).decode('ascii') if ok else None

            state.update(result, frame_jpeg_b64=frame_jpeg_b64)

            now = time.time()
            if now - last_saved_at >= config.SAVE_INTERVAL:
                storage.save(result)
                last_saved_at = now
                print(f"[DEMO] [{result['level']}] {count} nəfər | {result['percent']}%")

            time.sleep(0.03)

        except Exception as e:
            print(f"[XƏTA]: {e}")
            time.sleep(1)

def start():
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()
    return t


if __name__ == "__main__":
    t = start()
    t.join()