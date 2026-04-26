import { env } from '../config';
import { readDb } from '../db';

// Vision API üçün crowd counting - Hugging Face (free tier, çox stabil)
export async function countPeopleWithVision(base64Image: string): Promise<{
  count: number | null;
  rawResponse: string;
  success: boolean;
  error?: string;
}> {
  // HF_TOKEN istifadə et (və ya köhnə OPENROUTER_API_KEY)
  const hfToken = process.env.HF_TOKEN;
  
  if (!hfToken) {
    return { count: null, rawResponse: '', success: false, error: 'HF_TOKEN lazımdır. https://huggingface.co/settings/tokens ilə əldə edin' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    console.log('[HF] API call starting...');
    console.log('[HF] Image data length:', base64Image?.length);

    // Base64-dən ArrayBuffer yarat
    const base64Data = base64Image.replace(/^data:image\/[^;]+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = Buffer.from(binaryString, 'binary');

    // Hugging Face Inference API - Salesforce BLIP (image captioning, adam sayma üçün)
    // Node.js fetch Buffer-i body kimi qəbul edir
    const response = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: bytes as any,
      signal: controller.signal
    });

    console.log('[HF] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[HF] Error response:', text);
      throw new Error(`HF API xətası: ${response.status} - ${text}`);
    }

    const data: any = await response.json();
    console.log('[HF] Response data:', JSON.stringify(data, null, 2));

    // BLIP caption qaytarır, buradan adam sayını çıxarmaq çətindir
    // Ona görə dəyişirik: object detection modeli istifadə edək
    return await countWithObjectDetection(bytes, hfToken, controller.signal);

  } catch (error: any) {
    return {
      count: null,
      rawResponse: '',
      success: false,
      error: error.message || 'Bilinməyən xəta'
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Object detection ilə adam saymaq (daha dəqiq)
async function countWithObjectDetection(imageBytes: Buffer, hfToken: string, signal: AbortSignal): Promise<{
  count: number | null;
  rawResponse: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('[HF OD] Object detection başlayır...');
    
    // facebook/detr-resnet-50 modeli - object detection (person class var)
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/detr-resnet-50', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBytes as any,
      signal
    });

    console.log('[HF OD] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[HF OD] Error:', text);
      throw new Error(`Object detection xətası: ${response.status}`);
    }

    const data: any = await response.json();
    console.log('[HF OD] Data:', JSON.stringify(data, null, 2));

    // DETR modeli [{label: "person", score: 0.9, box: [...]}, ...] formatında qaytarır
    if (Array.isArray(data)) {
      // Yalnız "person" class-ını say
      const personCount = data.filter((item: any) => 
        item.label?.toLowerCase() === 'person' || 
        item.label?.toLowerCase() === 'man' || 
        item.label?.toLowerCase() === 'woman'
      ).length;
      
      return { 
        count: personCount, 
        rawResponse: JSON.stringify(data), 
        success: true 
      };
    }

    return { count: null, rawResponse: JSON.stringify(data), success: false, error: 'Gözlənilməz format' };

  } catch (error: any) {
    return { count: null, rawResponse: '', success: false, error: error.message };
  }
}

// Crowd level təyin etmək
export function calculateCrowdLevel(count: number, capacity: number = 30) {
  const ratio = Math.min(count / capacity, 1.0);
  const percent = Math.round(ratio * 100);
  
  let level: 'low' | 'medium' | 'high';
  let color: string;
  let textAz: string;
  
  if (ratio <= 0.40) {
    level = 'low';
    color = 'green';
    textAz = 'Az dolu';
  } else if (ratio <= 0.70) {
    level = 'medium';
    color = 'yellow';
    textAz = 'Orta dolu';
  } else {
    level = 'high';
    color = 'red';
    textAz = 'Çox sıx';
  }
  
  return { count, percent, level, color, textAz, capacity };
}

function buildMockRecommendation(userContext: Record<string, unknown>) {
  const preferred = typeof userContext.preferredTransport === 'string' ? userContext.preferredTransport : 'metro';
  return {
    recommendation:
      preferred === 'bus'
        ? 'Peak crowding is elevated on bus corridors. Shift demand to metro or rail for faster throughput.'
        : 'Prefer metro and suburban rail during peak demand, then use taxi for final-mile transfers.',
    actions: ['rebalance vehicles', 'broadcast rider alerts', 'prioritize lower-delay corridors'],
    source: 'mock'
  };
}

export async function getGroundedTripNarrative(payload: {
  origin: string;
  destination: string;
  departureTime: string;
  date?: string;
  recommendedSummary: string;
  contextNote: string;
  directVsTransferNote: string;
  alternatives: Array<{
    id: string;
    transferCount: number;
    summary: string;
    crowdLevel: 'low' | 'medium' | 'high';
    totalPredictedOccupancy: number;
    totalEstimatedMinutesToEase: number;
  }>;
}) {
  const fallback = `AI analysis for ${payload.origin} -> ${payload.destination}: ${payload.recommendedSummary} ${payload.directVsTransferNote} ${payload.contextNote}`;

  if (!env.aiEnabled || !env.openRouterApiKey) {
    return { recommendation: fallback, source: 'disabled' as const };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.openRouterTimeoutMs);

  try {
    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.frontend,
        'X-Title': 'AZCON Smart Transit AI'
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a transit assistant. Only rewrite provided facts into clear English. Do not invent stops, routes, or numbers. Return JSON: {"recommendation":"..."}.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Rewrite the recommendation in concise English only, using provided facts.',
              strictRules: ['Do not add any new route IDs or stop names', 'Do not change numbers', 'Do not use any language other than English'],
              data: payload
            })
          }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${text}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('OpenRouter response content is empty');
    }

    const normalized = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(normalized);
    const recommendation = typeof parsed?.recommendation === 'string' ? parsed.recommendation.trim() : '';
    if (!recommendation) {
      throw new Error('OpenRouter recommendation is missing');
    }

    return { recommendation, source: 'openrouter' as const };
  } catch {
    return { recommendation: fallback, source: 'fallback' as const };
  } finally {
    clearTimeout(timeout);
  }
}

async function askOpenRouter(prompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.openRouterTimeoutMs);

  try {
    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.frontend,
      'X-Title': 'AZCON Smart Transit AI'
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI transit operations assistant. Return concise JSON only with recommendation, actions array, and confidence.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }),
    signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${text}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('OpenRouter response content is empty');
    }

    const normalized = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(normalized);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPassengerFlowPrediction(routeId: string) {
  const db = readDb();
  const route = db.routes.find((item: any) => item.id === routeId);
  if (!route) throw new Error('Route not found');

  return {
    routeId,
    passengerFlow: Math.round(route.capacity * (0.62 + route.occupancy / 160)),
    confidence: 0.89,
    model: env.aiEnabled ? env.openRouterModel : 'mock'
  };
}

export async function getOccupancyForecast(routeId: string) {
  const db = readDb();
  const route = db.routes.find((item: any) => item.id === routeId);
  if (!route) throw new Error('Route not found');

  return {
    routeId,
    occupancyForecast: Math.min(98, route.occupancy + (route.crowded ? 6 : 3)),
    horizonMinutes: 45,
    model: env.aiEnabled ? env.openRouterModel : 'mock'
  };
}

export async function getDelayRiskAssessment(routeId: string) {
  const db = readDb();
  const route = db.routes.find((item: any) => item.id === routeId);
  if (!route) throw new Error('Route not found');

  return {
    routeId,
    delayRisk: route.delayRisk,
    avgDelayMinutes: route.avgDelayMinutes,
    factors: route.crowded ? ['crowding', 'dispatch lag'] : ['network conditions'],
    model: env.aiEnabled ? env.openRouterModel : 'mock'
  };
}

export async function getSmartRecommendation(userContext: Record<string, unknown>) {
  if (!env.aiEnabled || !env.openRouterApiKey) {
    return buildMockRecommendation(userContext);
  }

  const db = readDb();
  const context = {
    routes: db.routes.map((route: any) => ({
      name: route.name,
      type: route.transportType,
      occupancy: route.occupancy,
      delayRisk: route.delayRisk,
      avgDelayMinutes: route.avgDelayMinutes
    })),
    alerts: db.alerts,
    userContext
  };

  try {
    const ai = await askOpenRouter(`Transit context: ${JSON.stringify(context)}. Return the best rider recommendation as JSON.`);
    return {
      recommendation: typeof ai?.recommendation === 'string' ? ai.recommendation : 'Use metro/rail alternatives for peak-hour corridors where crowding is elevated.',
      actions: Array.isArray(ai?.actions) ? ai.actions : ['monitor occupancy', 'broadcast rider guidance'],
      confidence: typeof ai?.confidence === 'number' ? ai.confidence : 0.75,
      source: 'openrouter'
    };
  } catch {
    return {
      ...buildMockRecommendation(userContext),
      source: 'fallback'
    };
  }
}
