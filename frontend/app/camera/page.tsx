'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Users, Waves, RefreshCcw, Upload, Image as ImageIcon } from 'lucide-react';
import { ProtectedShell } from '@/components/layout/protected-shell';
import { useApp } from '@/components/providers/app-provider';
import { apiClient } from '@/services/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeading } from '@/components/ui/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraBusSnapshot, CameraOverviewResponse } from '@/lib/types';
import { usePeopleDetector } from '@/lib/use-people-detector';

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
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotResult, setSnapshotResult] = useState<{ count: number; level: 'low' | 'medium' | 'high'; textAz: string } | null>(null);
  const [snapshotAnalyzing, setSnapshotAnalyzing] = useState(false);
  const detector = usePeopleDetector();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Snapshot-ı local AI ilə analiz et (həm kamera frame, həm upload)
  const runAnalysis = useCallback(async (frameData: string, cameraIdLabel: string) => {
    if (!detector.modelReady) {
      setCameraError('AI modeli hələ yüklənir, bir neçə saniyə gözlə');
      return;
    }
    setSnapshotAnalyzing(true);
    setSnapshotResult(null);
    setCameraError('');
    try {
      const result = await detector.detectFromBase64(frameData);
      setSnapshotResult({ count: result.count, level: result.level, textAz: result.textAz });
      if (token) {
        try {
          await apiClient.submitBrowserCount(token, {
            peopleCount: result.count,
            routeId: activeSnapshot?.routeId,
            cameraId: cameraIdLabel,
            source: 'browser-tfjs'
          });
          await load();
        } catch {
          // ignore - UI hələ də işləsin
        }
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Analiz xətası');
    } finally {
      setSnapshotAnalyzing(false);
    }
  }, [detector, token, activeSnapshot?.routeId, load]);

  // Şəkil yüklə və dərhal analiz et
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCameraError('Yalnız şəkil faylı yükləmək olar');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setSnapshot(result);
        setSnapshotResult(null);
        setCameraError('');
        runAnalysis(result, 'tfjs-upload');
      }
    };
    reader.readAsDataURL(file);
  }, [runAnalysis]);

  // Kameradan snapshot al və local AI ilə analiz et
  const takeSnapshotAndAnalyze = useCallback(async () => {
    if (!cameraActive || !videoRef.current) {
      setCameraError('Əvvəlcə kameranı aç');
      return;
    }
    const frameData = captureFrame();
    if (!frameData) {
      setCameraError('Snapshot alınmadı');
      return;
    }
    setSnapshot(frameData);
    await runAnalysis(frameData, 'tfjs-camera');
  }, [cameraActive, captureFrame, runAnalysis]);

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
              {isOpsRole && (
                <>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={handleFileUpload}
                    className='hidden'
                  />
                  {cameraActive && (
                    <Button
                      leftIcon={<ImageIcon className='h-4 w-4' />}
                      onClick={takeSnapshotAndAnalyze}
                      loading={snapshotAnalyzing}
                      disabled={!cameraActive || !detector.modelReady}
                    >
                      {snapshotAnalyzing ? 'Analiz edir...' : 'Snapshot + AI'}
                    </Button>
                  )}
                  <Button
                    variant='secondary'
                    leftIcon={<Upload className='h-4 w-4' />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={snapshotAnalyzing || !detector.modelReady}
                  >
                    Şəkil yüklə
                  </Button>
                  <Badge tone={detector.modelReady ? 'success' : detector.modelLoading ? 'warning' : 'neutral'} withDot>
                    {detector.modelReady ? 'AI hazır' : detector.modelLoading ? 'AI yüklənir' : 'AI gözləyir'}
                  </Badge>
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

              {(snapshotResult || activeSnapshot) ? (
                <div className='pointer-events-none absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-3'>
                  <span className='chip chip-neutral justify-center'>
                    AI Count: {snapshotResult ? snapshotResult.count : activeSnapshot?.peopleCount}
                  </span>
                  <span className='chip chip-info justify-center'>
                    Doluluq: {activeSnapshot?.occupancyPercent ?? 0}%
                  </span>
                  <span className='chip chip-success justify-center'>
                    {snapshotResult ? snapshotResult.textAz : activeSnapshot?.statusTextAz}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* SNAPSHOT PREVIEW */}
          {snapshot && (
            <div className='rounded-xl border border-[color:var(--border)] bg-[var(--surface)] p-3'>
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-[color:var(--success)]' />
                  <span className='text-sm font-bold'>Snapshot</span>
                  {snapshotResult && (
                    <>
                      <Badge tone={snapshotResult.level === 'high' ? 'danger' : snapshotResult.level === 'medium' ? 'warning' : 'success'} withDot>
                        {snapshotResult.count} adam · {snapshotResult.textAz}
                      </Badge>
                    </>
                  )}
                </div>
                <button
                  onClick={() => { setSnapshot(null); setSnapshotResult(null); }}
                  className='text-xs text-[color:var(--text-soft)] hover:text-[color:var(--text)]'
                >
                  Bağla
                </button>
              </div>
              <div className='relative overflow-hidden rounded-lg border border-[color:var(--border)] bg-black/40'>
                <img src={snapshot} alt='Camera snapshot' className='h-[260px] w-full object-contain' />
                {snapshotAnalyzing && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
                    <span className='text-sm font-semibold text-white'>AI analiz edir...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(snapshotResult || activeSnapshot) ? (
            <div className='grid gap-3 sm:grid-cols-4'>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Mənbə</p>
                <p className='mt-1 text-sm font-semibold'>{snapshotResult ? 'browser-tfjs' : activeSnapshot?.source}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Adam sayı</p>
                <p className='numeric mt-1 text-sm font-semibold'>{snapshotResult ? snapshotResult.count : activeSnapshot?.peopleCount}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Status</p>
                <p className='mt-1 text-sm font-semibold'>{snapshotResult ? snapshotResult.textAz : activeSnapshot?.statusTextAz}</p>
              </div>
              <div className='rounded-lg border border-[color:var(--border)] bg-[var(--surface)] p-3'>
                <p className='text-overline'>Bus</p>
                <p className='mt-1 text-sm font-semibold'>{activeSnapshot?.busId ?? '—'}</p>
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
