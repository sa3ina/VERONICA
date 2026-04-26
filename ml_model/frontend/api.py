
# api.py

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'config'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

import config
import state
import storage
import main as cam

from flask import Flask, jsonify, render_template

app = Flask(__name__)



@app.route("/")
def index():
    """Brauzer açıldıqda dashboard-u göstər"""
    return render_template("index.html", max_cap=config.MAX_CAPACITY)


@app.route("/status")
def status():
    """
    Ən son ölçməni qaytarır.
    Dashboard hər 2 saniyədən bir bunu çağırır.
    
    Nümunə cavab:
    {
        "count": 15,
        "percent": 50.0,
        "level": "Orta",
        "color": "yellow"
    }
    """
    return jsonify(state.get())


@app.route("/history")
def history():
    """Son 20 ölçməni qaytarır"""
    return jsonify(storage.last_records(20))


@app.route("/frame")
def frame():
    frame_b64 = state.get_frame_jpeg_b64()
    if not frame_b64:
        return jsonify({"available": False, "frame": None})
    return jsonify({
        "available": True,
        "frame": f"data:image/jpeg;base64,{frame_b64}"
    })


if __name__ == "__main__":
    cam.start()   
    app.run(host=config.HOST, port=config.PORT, debug=False)