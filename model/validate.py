"""Sayısal doğrulama: FOCUS adım şemasını analitik çözümlere karşı ölçer.

    python model/validate.py            # sonuçları yazdırır
    python model/validate.py --write    # assets/model-validation.json dosyasını günceller

Karşılaştırılan şemalar (hepsi 15 dk adım):
  euler    : tek nokta modeli js/drift.js (hız adım başındaki konumda, zaman ortasında)
  midpoint : ana çoklu parçacık motoru js/ensemble-drift.js (orta nokta, RK2)
  rk4      : 4. derece Runge-Kutta (Python referansı)
Bu testler sayısal yöntemi doğrular; akıntı/rüzgâr tahminlerinin doğruluğunu ölçmez.
"""
from __future__ import annotations

import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from focus_drift import KM_PER_DEG, integrate  # noqa: E402

LAT0, LON0 = 36.0, 30.0


def km(lat: float, lon: float) -> tuple[float, float]:
    """Merkeze göre yerel doğu/kuzey km (yerel düzlem)."""
    return (lon - LON0) * KM_PER_DEG * math.cos(math.radians(lat)), (lat - LAT0) * KM_PER_DEG


def from_km(x: float, y: float) -> tuple[float, float]:
    lat = LAT0 + y / KM_PER_DEG
    return lat, LON0 + x / (KM_PER_DEG * math.cos(math.radians(lat)))


def dist_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    ax, ay = km(*a)
    bx, by = km(*b)
    return math.hypot(ax - bx, ay - by)


def case_uniform() -> dict:
    """Sabit akıntı 1.2 km/sa doğu + %3 x 20 km/sa kuzey rüzgârı: kesin çözüm doğrusal."""
    vel = lambda la, lo, t: (1.2, 0.03 * 20.0)
    exact_x, exact_y = 1.2 * 24, 0.6 * 24
    res = {}
    for m in ("euler", "midpoint", "rk4"):
        end = integrate(vel, LAT0, LON0, 24, method=m)[-1]
        res[m] = math.hypot(km(*end)[0] - exact_x, km(*end)[1] - exact_y)
    return {"id": "uniform", "name_tr": "Sabit akıntı + rüzgâr", "name_en": "Uniform current + wind", "hours": 24, "error_km": res}


def case_tidal() -> dict:
    """Zamanla değişen (yarım günlük gelgit benzeri) düzgün akıntı: u = U cos(2πt/12.42)."""
    U, T = 2.0, 12.42
    vel = lambda la, lo, t: (U * math.cos(2 * math.pi * t / T), 0.5)
    exact_x = U * T / (2 * math.pi) * math.sin(2 * math.pi * 24 / T)
    exact_y = 0.5 * 24
    res = {}
    for m in ("euler", "midpoint", "rk4"):
        end = integrate(vel, LAT0, LON0, 24, method=m)[-1]
        res[m] = math.hypot(km(*end)[0] - exact_x, km(*end)[1] - exact_y)
    return {"id": "tidal", "name_tr": "Gelgit benzeri zamanla değişen akıntı", "name_en": "Tide-like time-varying current", "hours": 24, "error_km": res}


def eddy_velocity(period_h: float):
    w = 2 * math.pi / period_h

    def vel(la: float, lo: float, t: float) -> tuple[float, float]:
        x, y = km(la, lo)
        return -w * y, w * x
    return vel


def case_eddy(period_h: float) -> dict:
    """Katı cisim dönen girdap (yarıçap 10 km). Kesin çözüm: parçacık bir periyotta başlangıca döner."""
    vel = eddy_velocity(period_h)
    start = from_km(10.0, 0.0)
    res, radius = {}, {}
    for m in ("euler", "midpoint", "rk4"):
        path = integrate(vel, *start, period_h, method=m)
        res[m] = dist_km(path[-1], start)
        radius[m] = math.hypot(*km(*path[-1])) - 10.0
    return {"id": f"eddy{int(period_h)}", "name_tr": f"Dönen girdap, {period_h:g} sa periyot", "name_en": f"Rotating eddy, {period_h:g} h period",
            "hours": period_h, "error_km": res, "radius_drift_km": radius}


def double_gyre_velocity():
    """Shadden vd. (2005) çift girdabı, 100 km x 50 km kutuya ölçeklenmiş; en yüksek hız ~1.6 km/sa."""
    A, eps, om = 0.1, 0.25, 2 * math.pi / 10
    L = 50.0  # km, birimsiz 1 = 50 km
    tscale = 2.0  # 1 birimsiz zaman = 2 saat

    def vel(la: float, lo: float, t: float) -> tuple[float, float]:
        x, y = km(la, lo)
        X, Y, tau = x / L, y / L, t / tscale
        s = eps * math.sin(om * tau)
        f = s * X * X + (1 - 2 * s) * X
        df = 2 * s * X + (1 - 2 * s)
        u = -math.pi * A * math.sin(math.pi * f) * math.cos(math.pi * Y)
        v = math.pi * A * math.cos(math.pi * f) * math.sin(math.pi * Y) * df
        return u * L / tscale, v * L / tscale
    return vel


def case_double_gyre() -> dict:
    vel = double_gyre_velocity()
    starts = [from_km(30 + 10 * i, 15 + 5 * j) for i in range(5) for j in range(5)]
    ref = [integrate(vel, *s, 24, dt=1 / 240, method="rk4")[-1] for s in starts]
    res = {}
    for m in ("euler", "midpoint", "rk4"):
        ends = [integrate(vel, *s, 24, method=m)[-1] for s in starts]
        errs = sorted(dist_km(a, b) for a, b in zip(ends, ref))
        res[m] = {"mean": sum(errs) / len(errs), "max": errs[-1]}
    return {"id": "double_gyre", "name_tr": "Çift girdap (25 parçacık, ort./en büyük)", "name_en": "Double gyre (25 particles, mean/max)", "hours": 24, "error_km": res}


def run() -> dict:
    return {
        "generated_by": "model/validate.py",
        "step_minutes": 15,
        "cases": [case_uniform(), case_tidal(), case_eddy(24.0), case_eddy(12.0), case_double_gyre()],
    }


if __name__ == "__main__":
    out = run()
    print(json.dumps(out, indent=1, ensure_ascii=False))
    if "--write" in sys.argv:
        path = pathlib.Path(__file__).resolve().parent.parent / "assets" / "model-validation.json"
        path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
