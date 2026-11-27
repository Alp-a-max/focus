"""FOCUS Lagrange sürüklenme modelinin Python referans uygulaması.

Amaç: tarayıcıdaki JavaScript modelin (js/drift.js, js/ensemble-drift.js) aynı fiziği
bağımsız, okunabilir ve test edilebilir biçimde yeniden üretmek; sayısal yöntemi
analitik çözümlere karşı doğrulamak.

Model (bkz. yontem.html):
    dx/dt = u_c(x, t) + alpha * u_10(x, t)
u_c yüzey akıntısı, u_10 10 m rüzgârı, alpha rüzgâr katkı oranı (windage, %0-3).
Konum enlem/boylam derecesidir; hız km/sa'tir. Yerel düzlem yaklaşımı:
    dlat = v / 111.32,  dlon = u / (111.32 cos(lat))

Yalnızca Python standart kütüphanesi kullanılır (InfinityFree dışında, yerelde çalışır).

Kullanım:
    python model/focus_drift.py forecast --lat 36.4 --lon 30.9 --hours 24 > rota.geojson
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Callable, Sequence

KM_PER_DEG = 111.32
STEP_H = 0.25  # JS modeliyle aynı: 15 dakikalık adım

Velocity = Callable[[float, float, float], tuple[float, float]]  # (lat, lon, t_saat) -> (u_doğu, v_kuzey) km/sa


def to_vector(speed: float, direction_deg: float, *, wind: bool) -> tuple[float, float]:
    """Hız ve yönü doğu/kuzey bileşenlerine çevirir.

    Akıntı yönü gidilen yöndür (oşinografik kural). Rüzgâr yönü gelinen yöndür
    (meteorolojik kural), bu yüzden 180° çevrilir.
    """
    if not (math.isfinite(speed) and speed >= 0 and math.isfinite(direction_deg) and 0 <= direction_deg <= 360):
        raise ValueError("Geçersiz hız veya yön")
    r = math.radians((direction_deg + (180 if wind else 0)) % 360)
    return math.sin(r) * speed, math.cos(r) * speed


def _advance(lat: float, lon: float, u: float, v: float, dt: float) -> tuple[float, float]:
    new_lat = lat + v * dt / KM_PER_DEG
    scale = math.cos(math.radians(new_lat))
    if abs(new_lat) > 85 or scale <= 0:
        raise ValueError("Tahmin kapsam dışında")
    return new_lat, lon + u * dt / (KM_PER_DEG * scale)


def step_euler_midtime(vel: Velocity, lat: float, lon: float, t: float, dt: float) -> tuple[float, float]:
    """JS modelinin adımı: hız, adımın zaman ortasında ama adım BAŞINDAKİ konumda alınır."""
    u, v = vel(lat, lon, t + dt / 2)
    return _advance(lat, lon, u, v, dt)


def step_midpoint(vel: Velocity, lat: float, lon: float, t: float, dt: float) -> tuple[float, float]:
    """Ana tarayıcı motorunun (js/ensemble-drift.js) şeması: açık orta nokta (RK2).

    Önce yarım adım ilerlenir, hız orta noktada (konum ve zaman) yeniden alınır.
    """
    u, v = vel(lat, lon, t)
    mid_lat, mid_lon = _advance(lat, lon, u, v, dt / 2)
    u, v = vel(mid_lat, mid_lon, t + dt / 2)
    return _advance(lat, lon, u, v, dt)


def step_rk4(vel: Velocity, lat: float, lon: float, t: float, dt: float) -> tuple[float, float]:
    """Klasik 4. derece Runge-Kutta adımı (dereceler üzerinde, yerel düzlem ölçeğiyle)."""
    def rate(la: float, lo: float, tt: float) -> tuple[float, float]:
        u, v = vel(la, lo, tt)
        return v / KM_PER_DEG, u / (KM_PER_DEG * math.cos(math.radians(la)))

    k1 = rate(lat, lon, t)
    k2 = rate(lat + k1[0] * dt / 2, lon + k1[1] * dt / 2, t + dt / 2)
    k3 = rate(lat + k2[0] * dt / 2, lon + k2[1] * dt / 2, t + dt / 2)
    k4 = rate(lat + k3[0] * dt, lon + k3[1] * dt, t + dt)
    return (lat + dt * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6,
            lon + dt * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6)


def integrate(vel: Velocity, lat: float, lon: float, hours: float, *, dt: float = STEP_H, method: str = "rk4") -> list[tuple[float, float]]:
    step = {"rk4": step_rk4, "midpoint": step_midpoint, "euler": step_euler_midtime}[method]
    n = round(hours / dt)
    if not math.isclose(n * dt, hours, abs_tol=1e-9):
        raise ValueError("Süre adımın tam katı olmalı")
    path = [(lat, lon)]
    t = 0.0
    for _ in range(n):
        lat, lon = step(vel, lat, lon, t, dt)
        t += dt
        path.append((lat, lon))
    return path


@dataclass(frozen=True)
class HourlySeries:
    """Tek noktadaki saatlik akıntı ve rüzgâr. Saatler arasında doğrusal enterpolasyon yapılır."""
    current: Sequence[tuple[float, float]]  # (u, v) km/sa
    wind: Sequence[tuple[float, float]]

    def velocity(self, windage: float) -> Velocity:
        if not 0 <= windage <= 0.05:
            raise ValueError("Rüzgâr katkısı 0-0.05 aralığında olmalı")

        def vel(_lat: float, _lon: float, t: float) -> tuple[float, float]:
            i = min(int(math.floor(t)), len(self.current) - 2)
            f = t - i
            if i < 0 or f < -1e-9 or f > 1 + 1e-9:
                raise ValueError("Saatlik veri kapsamı dışında")
            cu = self.current[i][0] * (1 - f) + self.current[i + 1][0] * f
            cv = self.current[i][1] * (1 - f) + self.current[i + 1][1] * f
            wu = self.wind[i][0] * (1 - f) + self.wind[i + 1][0] * f
            wv = self.wind[i][1] * (1 - f) + self.wind[i + 1][1] * f
            return cu + windage * wu, cv + windage * wv
        return vel


def ensemble(series: HourlySeries, lat: float, lon: float, hours: int = 24, *, particles: int = 25,
             radius_km: float = 0.5, windages: Sequence[float] = (0.0, 0.01, 0.03), seed: int = 1) -> dict:
    """Başlangıç çevresine dağıtılmış parçacıkları üç rüzgâr senaryosuyla taşır (deterministik)."""
    rnd = random.Random(seed)
    starts = []
    for _ in range(particles):
        r = radius_km * math.sqrt(rnd.random())
        th = 2 * math.pi * rnd.random()
        starts.append((lat + r * math.sin(th) / KM_PER_DEG, lon + r * math.cos(th) / (KM_PER_DEG * math.cos(math.radians(lat)))))
    out = {}
    for a in windages:
        vel = series.velocity(a)
        out[f"{a:.2f}"] = [integrate(vel, la, lo, hours) for la, lo in starts]
    return out


# ---------------- Open-Meteo verisi (isteğe bağlı, internet gerekir) ----------------

def fetch_series(lat: float, lon: float, hours: int) -> HourlySeries:
    q = {"latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}", "forecast_hours": str(hours + 1), "timezone": "UTC"}
    marine = _get("https://marine-api.open-meteo.com/v1/marine", {**q, "hourly": "ocean_current_velocity,ocean_current_direction"})
    weather = _get("https://api.open-meteo.com/v1/forecast", {**q, "hourly": "wind_speed_10m,wind_direction_10m", "wind_speed_unit": "kmh"})
    if marine["hourly_units"]["ocean_current_velocity"] != "km/h" or weather["hourly_units"]["wind_speed_10m"] != "km/h":
        raise ValueError("Beklenmeyen birim")
    m, w = marine["hourly"], weather["hourly"]
    if m["time"][: hours + 1] != w["time"][: hours + 1] or len(m["time"]) < hours + 1:
        raise ValueError("Akıntı ve rüzgâr zamanları eşleşmiyor")
    cur = [to_vector(s, d, wind=False) for s, d in zip(m["ocean_current_velocity"][: hours + 1], m["ocean_current_direction"][: hours + 1])]
    wnd = [to_vector(s, d, wind=True) for s, d in zip(w["wind_speed_10m"][: hours + 1], w["wind_direction_10m"][: hours + 1])]
    return HourlySeries(cur, wnd)


def _get(url: str, params: dict) -> dict:
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers={"User-Agent": "focus-drift-reference/1.0"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.load(res)


def to_geojson(result: dict, hours: int) -> dict:
    features = []
    for windage, paths in result.items():
        for i, path in enumerate(paths):
            features.append({"type": "Feature", "properties": {"windage": float(windage), "particle": i, "hours": hours, "step_hours": STEP_H},
                             "geometry": {"type": "LineString", "coordinates": [[round(lo, 5), round(la, 5)] for la, lo in path]}})
    return {"type": "FeatureCollection", "features": features}


def main(argv: Sequence[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="FOCUS referans sürüklenme modeli")
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("forecast", help="Open-Meteo verisiyle 25 parçacık x 3 rüzgâr senaryosu")
    f.add_argument("--lat", type=float, required=True)
    f.add_argument("--lon", type=float, required=True)
    f.add_argument("--hours", type=int, choices=[6, 12, 24], default=24)
    a = p.parse_args(argv)
    series = fetch_series(a.lat, a.lon, a.hours)
    json.dump(to_geojson(ensemble(series, a.lat, a.lon, a.hours), a.hours), sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
