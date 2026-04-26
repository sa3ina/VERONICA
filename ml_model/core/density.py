# density.py

import config

def calculate(person_count):
   

    # Faiz hesabla (1.0-dan çox olmasın — 30/30 = 1.0, 35/30 = 1.0 qalır)
    ratio   = min(person_count / config.MAX_CAPACITY, 1.0)
    percent = round(ratio * 100, 1)   # 0.503 → 50.3

    # Səviyyəni müəyyən et
    if ratio <= config.THRESHOLDS["low"]:       # 0.40-dan az
        level = "Az"
        color = "green"
    elif ratio <= config.THRESHOLDS["medium"]:  # 0.40 - 0.70 arası
        level = "Orta"
        color = "yellow"
    else:                                        # 0.70-dən çox
        level = "Çox sıx"
        color = "red"

    return {
        "count":   person_count,   # 15
        "percent": percent,        # 50.3
        "level":   level,          # "Orta"
        "color":   color,          # "yellow"
    }