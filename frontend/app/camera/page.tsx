'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Users, Waves, RefreshCcw, Brain, Play, Timer } from 'lucide-react';
import { ProtectedShell } from '@/components/layout/protected-shell';
import { useApp } from '@/components/providers/app-provider';
import { apiClient } from '@/services/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeading } from '@/components/ui/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraBusSnapshot, CameraOverviewResponse } from '@/lib/types';

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toneFromSnapshot(snapshot: CameraBusSnapshot): 'success' | 'warning' | 'danger' {
  return snapshot.tone;
}

export default function CameraPage() {
  const { token, user } = useApp();
  const [data, setData] = useState<CameraOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [simulateError, setSimulateError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [mlBooting, setMlBooting] = useState(false);
  const [mlFrame, setMlFrame] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<{ count: number; level: string } | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [nextAnalysisIn, setNextAnalysisIn] = useState(300); // 5 dəqiqə = 300 saniyə
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoAnalyzeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await apiClient.getCameraOverview(token);
      setData(result);
      setApiError('');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Kamera datası alınmadı');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [load, token]);

  useEffect(() => {
    if (!token) return;
    const fetchFrame = async () => {
      try {
        const result = await apiClient.getMlCameraFrame(token);
        setMlFrame(result.available ? result.frame : null);
      } catch {
        setMlFrame(null);
      }
    };
    fetchFrame().catch(() => undefined);
    const timer = setInterval(() => {
      fetchFrame().catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [token]);

  const refreshDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all.filter((item) => item.kind === 'videoinput');
    setDevices(cams);
    if (!selectedDeviceId && cams.length) {
      const preferred = cams.find((cam) => {
        const label = cam.label.toLowerCase();
        return !label.includes('phone') && !label.includes('droid') && !label.includes('iriun');
      }) ?? cams[0];
      setSelectedDeviceId(preferred.deviceId);
    }
  }, [selectedDeviceId]);

  const ensureMlStarted = useCallback(async () => {
    if (!token) return true;
    setMlBooting(true);
    try {
      const result = await apiClient.startMlCamera(token);
      if (!result.available) {
        setCameraError('ML model başladı, amma hələ hazır deyil. 5-10 saniyə gözlə və yenidən yoxla.');
      }
      return true;
    } catch {
      setCameraError('ML modeli başlatmaq mümkün olmadı. `python api.py` ilə əl ilə açıb yenidən cəhd et.');
      return false;
    } finally {
      setMlBooting(false);
    }
  }, [token]);

  const stopLocalCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startLocalCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Bu brauzerdə kamera dəstəklənmir.');
      return;
    }
    setCameraError('');
    try {
      const mlOk = await ensureMlStarted();
      if (!mlOk) return;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraActive(true);
      await refreshDevices();
    } catch {
      setCameraError('Kameraya icazə verilmədi və ya kamera tapılmadı.');
      setCameraActive(false);
    }
  }, [ensureMlStarted, refreshDevices, selectedDeviceId]);

  // Frame çəkib base64-ə çevir
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  useEffect(() => () => stopLocalCamera(), [stopLocalCamera]);

  useEffect(() => {
    if (!cameraActive) return;
    startLocalCamera().catch(() => undefined);
  }, [cameraActive, selectedDeviceId, startLocalCamera]);

  const isOpsRole = user?.role === 'admin' || user?.role === 'staff';
  const userBus = data?.bus ?? null;
  const fleet = data?.buses ?? [];
  const mlSnapshot = fleet.find((item) => item.source === 'ml-model') ?? null;
  const activeSnapshot = isOpsRole ? (mlSnapshot ?? fleet[0] ?? null) : userBus;
  const mlConnected = isOpsRole
    ? Boolean(mlSnapshot)
    : activeSnapshot?.source === 'ml-model';

  // OpenRouter Vision ilə analiz et
  const analyzeWithVision = useCallback(async () => {
    if (!token || !cameraActive) return;
    const frameData = captureFrame();
    if (!frameData) {
      setCameraError('Frame çəkilmədi');
      return;
    }
    setVisionAnalyzing(true);
    setCameraError('');
    try {
      const result = await apiClient.analyzeWithVision(token, {
        imageBase64: frameData,
        routeId: activeSnapshot?.routeId,
        cameraId: selectedDeviceId || 'browser-camera'
      });
      if (result.success) {
        setVisionResult({ count: result.count, level: result.crowdInfo.level });
        await load(); // Yeni data ilə yenilə
      } else {
        setCameraError(`Vision analizi uğursuz oldu: ${result.error || 'Bilinməyən xəta'}`);
      }
    } catch (err: any) {
      const message = err?.message || 'Vision analizi xətası';
      console.error('[Vision Error]', err);
      setCameraError(message);
    } finally {
      setVisionAnalyzing(false);
    }
  }, [token, cameraActive, captureFrame, activeSnapshot?.routeId, selectedDeviceId, load]);

  // Auto 5 dəqiqəlik analiz
  useEffect(() => {
    if (!autoAnalyze || !cameraActive) {
      if (autoAnalyzeTimerRef.current) clearInterval(autoAnalyzeTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }
    // Hər 5 dəqiqədən bir analiz
    autoAnalyzeTimerRef.current = setInterval(() => {
      analyzeWithVision();
      setNextAnalysisIn(300);
    }, 5 * 60 * 1000);
    // Countdown timer
    countdownTimerRef.current = setInterval(() => {
      setNextAnalysisIn(prev => prev > 0 ? prev - 1 : 300);
    }, 1000);
    return () => {
      if (autoAnalyzeTimerRef.current) clearInterval(autoAnalyzeTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [autoAnalyze, cameraActive, analyzeWithVision]);

  const crowdedSummary = useMemo(() => {
    const summary = data?.summary;
    if (!summary) return null;
    return [
      { label: 'Basa-bas', value: summary.high, tone: 'danger' as const },
      { label: 'Medium', value: summary.medium, tone: 'warning' as const },
      { label: 'Az adam', value: summary.low, tone: 'success' as const }
    ];
  }, [data?.summary]);

  const handleSimulate = async () => {
    if (!token) return;
    setSimulating(true);
    setSimulateError('');
    try {
      await apiClient.simulateCameraData(token);
      await load();
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : 'Yeni data yaradıla bilmədi');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <ProtectedShell allowedRoles={['admin', 'staff', 'user']}>
      <div className='space-y-8'>
        <PageHeader
          overline='HolbertonBus Vision'
          title='Canlı Kamera Monitoru'
          description='Hər 5 dəqiqə yenilənən kamera əsaslı doluluq məlumatı.'
          action={<Badge tone={mlConnected ? 'success' : 'warning'} withDot><Camera className='h-3.5 w-3.5' /> {mlConnected ? 'ML connected' : 'ML waiting'}</Badge>}
        />

        <Card variant='gradient' className='space-y-4 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <SectionHeading overline='Local camera' title='Kompüter kamerası (live preview)' description='Bu blokda birbaşa ML nəticəsi göstərilir (adam sayı və doluluq).' />
            <div className='flex flex-wrap items-center gap-2'>
              <button
                className='input-base h-10 w-[230px] text-xs'
                onClick={() => refreshDevices().catch(() => undefined)}
                type='button'
              >
                Kamera siyahısını yenilə ({devices.length})
              </button>
              <select
                className='input-base h-10 w-[260px] text-xs'
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                <option value=''>Auto kamera seç</option>
                {devices.map((item) => <option key={item.deviceId} value={item.deviceId}>{item.label || `Camera ${item.deviceId.slice(0, 6)}`}</option>)}
              </select>
              {cameraActive ? (
                <Button variant='outline' onClick={stopLocalCamera}>Kameranı bağla</Button>
              ) : (
                <Button onClick={startLocalCamera} loading={mlBooting}>Kameranı aç</Button>
              )}
              {cameraActive && isOpsRole && (
                <>
                  <Button 
                    variant='secondary' 
                    leftIcon={<Brain className='h-4 w-4' />}
                    onClick={analyzeWithVision}
                    loading={visionAnalyzing}
                    disabled={!cameraActive}
                  >
                    {visionAnalyzing ? 'AI analiz edir...' : 'AI ilə analiz et'}
                  </Button>
                  <Button
                    variant={autoAnalyze ? 'primary' : 'outline'}
                    leftIcon={<Timer className='h-4 w-4' />}
                    onClick={() => setAutoAnalyze(!autoAnalyze)}
                    disabled={!cameraActive}
                  >
                    {autoAnalyze ? `Auto: ${Math.floor(nextAnalysisIn / 60)}:${String(nextAnalysisIn % 60).padStart(2, '0')}` : 'Auto 5 dəqiqə'}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className='aurora p-2'>
            <div className='relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-black/80'>
              {mlFrame ? (
                <img src={mlFrame} alt='ML frame' className='h-[290px] w-full object-cover' />
              ) : (
                <video ref={videoRef} className='h-[290px] w-full object-cover' autoPlay muted playsInline />
              )}
              <canvas ref={canvasRef} className='hidden' />

              <div className='pointer-events-none absolute left-3 top-3'>
                <Badge tone={cameraActive ? 'success' : 'neutral'} withDot>{cameraActive ? 'Kamera aktiv' : 'Kamera bağlı'}</Badge>
              </div>

              <div className='pointer-events-none absolute right-3 top-3'>
                <Badge tone={mlConnected ? 'success' : 'warning'} withDot>{mlConnected ? 'ML aktiv' : 'ML görünmür'}</Badge>
              </div>

              {activeSnapshot ? (
                <div className='pointer-events-none absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-3'>
                  <span className='chip chip-neutral justify-center'>ML Count: {activeSnapshot.peopleCount}</span>
                  <span className='chip chip-info justify-center'>Doluluq: {activeSnapshot.occupancyPercent}%</span>
                  <span className='chip chip-success justify-center'>{activeSnapshot.statusTextAz}</span>
                </div>
              ) : null}
            </div>
          </div>

          {visionResult && (
            <div className='rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/10 p-4'>
              <div className='flex items-center gap-2'>
                <Brain className='h-5 w-5 text-[color:var(--brand-primary)]' />
                <span className='font-semibold'>OpenRouter AI Nəticəsi:</span>
                <span className='text-lg font-bold'>{visionResult.count} adam</span>
                <Badge tone={visionResult.level === 'high' ? 'danger' : visionResult.level === 'medium' ? 'warning' : 'success'}>
                  {visionResult.level === 'high' ? 'Çox sıx' : visionResult.level === 'medium' ? 'Orta' : 'Az'}
                </Badge>
              </div>
            </div>
          )}

          {activeSnapshot ? (
            <div className='grid gap-3 sm:grid-cols-4'>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Mənbə</p>
                <p className='mt-1 text-sm font-semibold'>{activeSnapshot.source}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Bus</p>
                <p className='mt-1 text-sm font-semibold'>{activeSnapshot.busId}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Adam sayı</p>
                <p className='numeric mt-1 text-sm font-semibold'>{activeSnapshot.peopleCount}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Son update</p>
                <p className='mt-1 text-xs font-semibold'>{formatDate(activeSnapshot.timestamp)}</p>
              </div>
            </div>
          ) : null}

          {cameraError ? <p className='text-sm text-[color:var(--danger)]'>{cameraError}</p> : null}
        </Card>

        {apiError ? (
          <Card className='border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] p-4 text-sm text-[color:var(--text-soft)]'>
            Server kamera datası alınmadı: {apiError}. Lokal kamera preview işləməyə davam edir.
          </Card>
        ) : null}

        {isOpsRole ? (
          <section className='space-y-5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <SectionHeading overline='Fleet view' title='Bütün avtobus kameraları' description='Admin və staff üçün bütün bus-lar üzrə real-time monitor.' />
              <Button variant='secondary' leftIcon={<RefreshCcw className='h-4 w-4' />} loading={simulating} onClick={handleSimulate}>
                Yeni 5 dəqiqəlik data
              </Button>
            </div>

            {simulateError ? (
              <Card className='border-[color:color-mix(in_srgb,var(--danger)_45%,transparent)] p-3 text-sm text-[color:var(--text-soft)]'>
                Data yenilənmədi: {simulateError}
              </Card>
            ) : null}

            {loading ? (
              <Skeleton className='h-[220px]' />
            ) : (
              <>
                {crowdedSummary ? (
                  <div className='grid gap-3 md:grid-cols-3'>
                    {crowdedSummary.map((item) => (
                      <Card key={item.label} className='p-4'>
                        <div className='flex items-center justify-between'>
                          <p className='text-overline'>{item.label}</p>
                          <Badge tone={item.tone} withDot>{item.label}</Badge>
                        </div>
                        <p className='numeric mt-2 text-3xl font-semibold'>{item.value}</p>
                      </Card>
                    ))}
                  </div>
                ) : null}

                <div className='grid gap-4 xl:grid-cols-2'>
                  {fleet.map((bus) => (
                    <Card key={bus.id} className='space-y-3 p-5'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold'>{bus.routeName}</p>
                          <p className='text-xs text-[color:var(--text-soft)]'>{bus.busId} · {bus.cameraId}</p>
                        </div>
                        <Badge tone={toneFromSnapshot(bus)} withDot>{bus.statusTextAz}</Badge>
                      </div>
                      <div className='grid grid-cols-3 gap-3 text-sm'>
                        <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                          <p className='text-overline'>Doluluq</p>
                          <p className='numeric mt-1 text-lg font-semibold'>{bus.occupancyPercent}%</p>
                        </div>
                        <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                          <p className='text-overline'>Sərnişin</p>
                          <p className='numeric mt-1 text-lg font-semibold'>{bus.peopleCount}</p>
                        </div>
                        <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                          <p className='text-overline'>Etibar</p>
                          <p className='numeric mt-1 text-lg font-semibold'>{Math.round(bus.confidence * 100)}%</p>
                        </div>
                      </div>
                      <p className='text-xs text-[color:var(--text-soft)]'>Son yenilənmə: {formatDate(bus.timestamp)}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <section className='space-y-5'>
            <SectionHeading overline='Single bus mode' title='Sizin avtobus üçün canlı doluluq' description='User üçün yalnız bir avtobus üzrə kamera nəticəsi göstərilir.' />
            {loading ? (
              <Skeleton className='h-[220px]' />
            ) : userBus ? (
              <Card className='space-y-4 p-6'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold'>{userBus.routeName}</p>
                    <p className='text-xs text-[color:var(--text-soft)]'>{userBus.busId} · {userBus.cameraId}</p>
                  </div>
                  <Badge tone={toneFromSnapshot(userBus)} withDot>{userBus.statusTextAz}</Badge>
                </div>

                <div className='rounded-xl border border-[color:var(--border)] bg-[var(--surface)] p-5 text-center'>
                  <p className='text-overline'>Avtobus sıxlığı</p>
                  <p className='mt-2 text-3xl font-semibold'>{userBus.statusTextAz}</p>
                  <p className='mt-2 text-sm text-[color:var(--text-soft)]'>
                    Doluluq: {userBus.occupancyPercent}% · Sərnişin sayı: {userBus.peopleCount}
                  </p>
                </div>

                <div className='flex items-center gap-2 text-xs text-[color:var(--text-soft)]'>
                  <Users className='h-4 w-4' />
                  <span>Son yenilənmə: {formatDate(userBus.timestamp)}</span>
                </div>
              </Card>
            ) : (
              <Card className='p-6 text-sm text-[color:var(--text-soft)]'>Hazırda kamera datası yoxdur.</Card>
            )}
          </section>
        )}

        <Card className='flex items-start gap-3 p-4 text-sm text-[color:var(--text-soft)]'>
          <Waves className='mt-0.5 h-4 w-4 text-[color:var(--brand-secondary)]' />
          <p>
            Bu səhifə artıq canlı kamera görüntüsünü sənin tema daxilində göstərir. ML model işləməyəndə sistem fallback data göstərir.
          </p>
        </Card>
      </div>
    </ProtectedShell>
  );
}
