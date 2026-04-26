# state.py

import threading
import time

_lock  = threading.Lock()   # qapı kilidi kimi düşün
_state = {                  # ən son ölçmə burada saxlanır
    "count":   0,
    "percent": 0.0,
    "level":   "—",
    "color":   "green",
    "frame_jpeg_b64": None,
    "frame_updated_at": None,
}

def update(density_result, frame_jpeg_b64=None):
    """Kamera yeni nəticə aldıqda buraya yazır"""
    with _lock:              # kilidi qapat, yaz, aç
        _state.update(density_result)
        if frame_jpeg_b64 is not None:
            _state["frame_jpeg_b64"] = frame_jpeg_b64
            _state["frame_updated_at"] = time.time()

def get():
    """Flask /status sorğusuna cavab verəndə buradan oxuyur"""
    with _lock:              # kilidi qapat, oxu, aç
        return {
            "count": _state["count"],
            "percent": _state["percent"],
            "level": _state["level"],
            "color": _state["color"]
        }

def get_frame_jpeg_b64():
    with _lock:
        return _state.get("frame_jpeg_b64")