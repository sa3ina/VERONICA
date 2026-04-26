'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PersonDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
}

export interface DetectionResult {
  count: number;
  detections: PersonDetection[];
  level: 'low' | 'medium' | 'high';
  textAz: string;
}

function levelFromCount(count: number): { level: 'low' | 'medium' | 'high'; textAz: string } {
  if (count >= 25) return { level: 'high', textAz: 'Çox sıx' };
  if (count >= 10) return { level: 'medium', textAz: 'Orta' };
  return { level: 'low', textAz: 'Az adam' };
}

// Singleton model promise (load only once)
let modelPromise: Promise<any> | null = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })();
  }
  return modelPromise;
}

export function usePeopleDetector() {
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    setModelLoading(true);
    getModel()
      .then((model) => {
        if (cancelled) return;
        modelRef.current = model;
        setModelReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Model yüklənmədi');
      })
      .finally(() => {
        if (!cancelled) setModelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const detect = useCallback(
    async (input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<DetectionResult> => {
      if (!modelRef.current) throw new Error('Model hələ hazır deyil');
      const predictions = await modelRef.current.detect(input, 50, 0.4);
      const persons: PersonDetection[] = predictions
        .filter((p: any) => p.class === 'person')
        .map((p: any) => ({ bbox: p.bbox, score: p.score }));
      const { level, textAz } = levelFromCount(persons.length);
      return { count: persons.length, detections: persons, level, textAz };
    },
    []
  );

  const detectFromBase64 = useCallback(
    async (base64: string): Promise<DetectionResult> => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Şəkil yüklənmədi'));
      });
      return detect(img);
    },
    [detect]
  );

  return { modelReady, modelLoading, error, detect, detectFromBase64 };
}
