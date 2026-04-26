# test_detector.py

import cv2
from detector import PersonDetector

det = PersonDetector()

img = cv2.imread("test.jpg")   # test şəklinin adını yaz

if img is None:
    print("XƏTA: şəkil tapılmadı, fayl adını yoxla")
else:
    count, out = det.detect(img)
    print(f"{count} nəfər tapıldı")
    cv2.imshow("Nəticə", out)
    cv2.waitKey(0)   # istənilən düyməyə bassan pəncərə bağlanır
    cv2.destroyAllWindows()

import density

result = density.calculate(count)
print(f"Faiz: {result['percent']}%")
print(f"Səviyyə: {result['level']}")


import storage

storage.init_db()          # cədvəli yarat
storage.save(result)       # ölçməni yaz
print(storage.last_records())   # bazadan oxu, göstər