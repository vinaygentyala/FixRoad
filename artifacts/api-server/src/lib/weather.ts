import type { WeatherContext } from "./priority";

const OPEN_METEO = "https://api.open-meteo.com";

export async function assessLocationWeather(locationQuery: string): Promise<WeatherContext> {
  const assessedAt = new Date().toISOString();
  const base = { available: false, source: "Open-Meteo", assessedAt, locationQuery, note: "Location-specific weather was unavailable; image assessment was used without weather adjustment." };
  try {
    const geoResponse = await fetch(`${OPEN_METEO}/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(7000) });
    if (!geoResponse.ok) return base;
    const geo = await geoResponse.json() as { results?: Array<{ latitude: number; longitude: number; name?: string; country?: string }> };
    const place = geo.results?.[0];
    if (!place) return base;
    const forecastResponse = await fetch(`${OPEN_METEO}/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=precipitation,rain,weather_code&hourly=precipitation_probability&forecast_days=1&timezone=auto`, { signal: AbortSignal.timeout(7000) });
    if (!forecastResponse.ok) return { ...base, resolvedLocation: [place.name, place.country].filter(Boolean).join(", "), note: "Location resolved, but the weather provider did not return current conditions." };
    const forecast = await forecastResponse.json() as { current?: { precipitation?: number; rain?: number; weather_code?: number }; hourly?: { precipitation_probability?: number[] } };
    const precipitationMm = Number(forecast.current?.precipitation ?? forecast.current?.rain ?? 0);
    const rainProbability = Number(forecast.hourly?.precipitation_probability?.slice(0, 6).reduce((max, value) => Math.max(max, value), 0) ?? 0);
    const rainy = precipitationMm > 0 || rainProbability >= 40;
    return { available: true, source: "Open-Meteo current conditions and next 6-hour forecast", assessedAt, locationQuery, resolvedLocation: [place.name, place.country].filter(Boolean).join(", "), precipitationMm, rainProbability, summary: rainy ? "Rain observed or likely near this location." : "No meaningful rain signal in the retrieved conditions.", note: "Weather is contextual metadata associated with the submitted location." };
  } catch {
    return base;
  }
}
