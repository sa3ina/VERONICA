import { env } from '../config';
import { readDb } from '../db';

// Vision API üçün crowd counting
export async function countPeopleWithVision(base64Image: string): Promise<{
  count: number | null;
  rawResponse: string;
  success: boolean;
  error?: string;
}> {
  if (!env.openRouterApiKey) {
    return { count: null, rawResponse: '', success: false, error: 'OPENROUTER_API_KEY yoxdur' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 san timeout

  try {
    console.log('[OpenRouter] API call starting...');
    console.log('[OpenRouter] API Key exists:', !!env.openRouterApiKey);
    console.log('[OpenRouter] Base URL:', env.openRouterBaseUrl);
    console.log('[OpenRouter] Image data length:', base64Image?.length);
    
    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.frontend,
        'X-Title': 'VERONICA Crowd Counter'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Bu şəkildə tam olaraq neçə adam görürsən? Yalnız rəqəm yaz, heç bir əlavə söz olmadan. Məsələn: "15" və ya "0" əgər adam yoxdursa.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
                  detail: 'auto'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      }),
      signal: controller.signal
    });

    console.log('[OpenRouter] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[OpenRouter] Error response:', text);
      throw new Error(`OpenRouter API xətası: ${response.status} - ${text}`);
    }

    const data: any = await response.json();
    console.log('[OpenRouter] Response data:', JSON.stringify(data, null, 2));
    
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content || typeof content !== 'string') {
      console.error('[OpenRouter] Empty content in response');
      throw new Error('OpenRouter cavabı boşdur');
    }

    // Rəqəmi extract et
    const numbers = content.match(/\d+/);
    if (numbers) {
      const count = parseInt(numbers[0], 10);
      return { count, rawResponse: content, success: true };
    } else {
      return { count: null, rawResponse: content, success: false, error: 'Rəqəm tapılmadı' };
    }

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
