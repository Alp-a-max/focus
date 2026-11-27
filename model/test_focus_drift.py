"""Referans modelin birim testleri:  python -m unittest discover -s model -v"""
import math
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import focus_drift as fd  # noqa: E402
import validate  # noqa: E402


class VectorTest(unittest.TestCase):
    def test_current_direction_is_heading(self):
        u, v = fd.to_vector(2.0, 90, wind=False)
        self.assertAlmostEqual(u, 2.0)
        self.assertAlmostEqual(v, 0.0, places=12)

    def test_wind_direction_is_origin(self):
        u, v = fd.to_vector(10.0, 0, wind=True)  # kuzeyden esen rüzgâr güneye iter
        self.assertAlmostEqual(u, 0.0, places=12)
        self.assertAlmostEqual(v, -10.0)

    def test_rejects_invalid(self):
        for args in [(-1, 10), (1, 361), (float("nan"), 0)]:
            with self.assertRaises(ValueError):
                fd.to_vector(*args, wind=False)


class IntegratorTest(unittest.TestCase):
    def test_uniform_flow_exact_for_both_schemes(self):
        case = validate.case_uniform()
        for m in ("euler", "rk4"):
            self.assertLess(case["error_km"][m], 0.05, m)

    def test_time_varying_uniform_flow(self):
        case = validate.case_tidal()
        self.assertLess(case["error_km"]["rk4"], 0.01)
        self.assertLess(case["error_km"]["euler"], 0.05)

    def test_rk4_conserves_eddy_radius(self):
        case = validate.case_eddy(24.0)
        self.assertLess(abs(case["radius_drift_km"]["rk4"]), 0.05)
        self.assertGreater(case["radius_drift_km"]["euler"], case["radius_drift_km"]["rk4"], "Euler dönen akışta dışa kaymalı")

    def test_rk4_beats_euler_in_double_gyre(self):
        case = validate.case_double_gyre()
        self.assertLess(case["error_km"]["rk4"]["mean"], case["error_km"]["euler"]["mean"])

    def test_js_equivalence_hourly_series(self):
        """Tarayıcı modeli (js/drift.js simulate) ile aynı şema: sabit seride iki şema aynı sonucu verir."""
        s = fd.HourlySeries(current=[(1.0, 0.5)] * 25, wind=[(0.0, -10.0)] * 25)
        a = fd.integrate(s.velocity(0.03), 36.0, 30.0, 24, method="euler")[-1]
        b = fd.integrate(s.velocity(0.03), 36.0, 30.0, 24, method="rk4")[-1]
        self.assertAlmostEqual(a[0], b[0], places=6)
        self.assertAlmostEqual(a[1], b[1], places=5)
        self.assertAlmostEqual(a[0], 36.0 + (0.5 - 0.3) * 24 / fd.KM_PER_DEG, places=6)

    def test_ensemble_is_deterministic(self):
        s = fd.HourlySeries(current=[(1.0, 0.0)] * 7, wind=[(5.0, 0.0)] * 7)
        r1 = fd.ensemble(s, 36.0, 30.0, 6)
        r2 = fd.ensemble(s, 36.0, 30.0, 6)
        self.assertEqual(r1, r2)
        self.assertEqual(sorted(r1), ["0.00", "0.01", "0.03"])
        self.assertEqual(len(r1["0.01"]), 25)
        east = [p[-1][1] for p in r1["0.03"]]
        east0 = [p[-1][1] for p in r1["0.00"]]
        self.assertTrue(all(a > b for a, b in zip(east, east0)), "rüzgâr katkısı doğuya ek taşıma yapmalı")

    def test_series_rejects_out_of_range_time(self):
        s = fd.HourlySeries(current=[(1.0, 0.0)] * 3, wind=[(0.0, 0.0)] * 3)
        with self.assertRaises(ValueError):
            fd.integrate(s.velocity(0.0), 36.0, 30.0, 6)


if __name__ == "__main__":
    unittest.main()
