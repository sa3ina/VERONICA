# main.py

import cv2
import time
import threading
import base64
import config
import state
import storage

from detector import PersonDetector
import density as density_calc

detector = PersonDetector()
storage.init_db()

SAVE_INTERVAL = 5 * 60  # 5 dəqiqə

def camera_loop():
    cap = cv2.VideoCapture(config.CAMERA_INDEX)

    if not cap.isOpened():
        print("XƏTA: Kamera açılmadı!")
        return

    print("Kamera işə düşdü.")
    last_saved_at = 0.0
    frame_index = 0

    while True:
        try:
            ret, frame = cap.read()

            if not ret:
                print("Frame alınmadı, yenidən cəhd edilir...")
                time.sleep(1)
                continue

            frame_index += 1
            if frame_index % max(1, config.FRAME_SKIP):
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

            cv2.imshow("Bus Monitor", annotated)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break

            time.sleep(0.03)

        except Exception as e:
            print(f"XƏTA: {e}")
            time.sleep(1)
            continue

    cap.release()
    cv2.destroyAllWindows()


def start():
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()
    return t


if __name__ == "__main__":
    t = start()
    t.join()