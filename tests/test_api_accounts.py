"""FOCUS hesap API'si uçtan uca testleri.

Çalıştırma (yerel PHP + MariaDB gerekir, bkz. tools/KURULUM-INFINITYFREE.md "Yerel test"):
    set FOCUS_API_URL=http://127.0.0.1:8790/api/index.php
    set FOCUS_MYSQL=C:\\xampp\\mysql\\bin\\mysql.exe --no-defaults --skip-ssl -uroot --host=127.0.0.1 --port=3399 focus_test
    python -m unittest tests/test_api_accounts.py -v

Test veritabanı her çalıştırmada boşaltılır; gerçek veritabanına bağlamayın.
"""
import http.cookiejar
import json
import os
import secrets
import shlex
import subprocess
import threading
import time
import unittest
import urllib.error
import urllib.request

API = os.environ.get("FOCUS_API_URL", "http://127.0.0.1:8790/api/index.php")
ORIGIN = API.split("/api/")[0]
MYSQL = os.environ.get("FOCUS_MYSQL", "")


def sql(statement):
    if not MYSQL:
        raise unittest.SkipTest("FOCUS_MYSQL tanımlı değil")
    subprocess.run(shlex.split(MYSQL, posix=False) + ["-e", statement], check=True, capture_output=True)


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None

    def call(self, action, body=None, *, method=None, origin=ORIGIN, csrf=True, content_type="application/json", query=""):
        method = method or ("POST" if body is not None else "GET")
        data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
        req = urllib.request.Request(f"{API}?a={action}{query}", data=data, method=method)
        if method == "POST":
            req.add_header("Content-Type", content_type)
            if origin:
                req.add_header("Origin", origin)
            if csrf and self.csrf:
                req.add_header("X-CSRF-Token", self.csrf)
        try:
            with self.opener.open(req, timeout=15) as res:
                status, payload = res.status, json.loads(res.read())
        except urllib.error.HTTPError as err:
            with err:
                status, payload = err.code, json.loads(err.read())
        if isinstance(payload, dict) and payload.get("csrf"):
            self.csrf = payload["csrf"]
        return status, payload

    def session(self):
        return self.call("session")

    def cookie(self):
        return next((c.value for c in self.jar), None)


def new_user(client, email=None, password="deniz-akintisi-42"):
    email = email or f"u{secrets.token_hex(4)}@ornek.com"
    client.session()
    time.sleep(3.1)
    status, body = client.call("register", {"email": email, "name": "Test Kişi", "organization": "Belediye", "password": password, "website": "", "accept": True})
    assert status == 201, body
    return email, password


class AccountApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sql("SET FOREIGN_KEY_CHECKS=0; TRUNCATE usage_events; TRUNCATE subscriptions; TRUNCATE audit_log; TRUNCATE rate_limits; TRUNCATE users; SET FOREIGN_KEY_CHECKS=1;")

    def setUp(self):
        sql("TRUNCATE rate_limits")

    def test_session_is_anonymous_with_csrf(self):
        status, body = Client().session()
        self.assertEqual(status, 200)
        self.assertIsNone(body["user"])
        self.assertEqual(len(body["csrf"]), 64)
        self.assertEqual([p["id"] for p in body["plans"]], ["free", "starter", "professional", "enterprise"])

    def test_post_guards(self):
        c = Client()
        c.session()
        self.assertEqual(c.call("login", {"email": "a@b.co", "password": "x"}, csrf=False)[0], 403)
        self.assertEqual(c.call("login", {"email": "a@b.co", "password": "x"}, origin="https://saldirgan.example")[0], 403)
        self.assertEqual(c.call("login", {"email": "a@b.co", "password": "x"}, origin=None)[0], 403)
        self.assertEqual(c.call("login", b"email=a", content_type="application/x-www-form-urlencoded")[0], 415)
        self.assertEqual(c.call("login", b"{bozuk")[0], 400)
        self.assertEqual(c.call("session", {}, method="POST")[0], 405)
        self.assertEqual(c.call("drop_tables")[0], 404)

    def test_register_validation_and_bot_guards(self):
        c = Client()
        c.session()
        good = {"email": f"v{secrets.token_hex(3)}@ornek.com", "name": "Ayşe", "password": "uzun-ve-guclu-sifre", "website": "", "accept": True}
        status, body = c.call("register", good)
        self.assertEqual((status, body["error"]), (400, "try_again"), "3 saniyeden hızlı kayıt engellenmeli")
        time.sleep(3.1)
        self.assertEqual(c.call("register", {**good, "website": "http://spam"})[1]["error"], "try_again")
        self.assertEqual(c.call("register", {**good, "accept": False})[1]["error"], "terms_required")
        self.assertEqual(c.call("register", {**good, "password": "kisa"})[1]["error"], "weak_password")
        self.assertEqual(c.call("register", {**good, "password": "aaaaaaaaaaaa"})[1]["error"], "weak_password")
        self.assertEqual(c.call("register", {**good, "email": "' OR 1=1 --"})[1]["error"], "invalid_email")
        self.assertEqual(c.call("register", {**good, "name": ["dizi"]})[1]["error"], "invalid_name")
        status, body = c.call("register", good)
        self.assertEqual(status, 201)
        self.assertEqual(body["user"]["email"], good["email"])
        self.assertEqual(body["entitlement"]["plan"], "free")
        self.assertEqual(body["entitlement"]["remaining"], 5)
        self.assertFalse(body["user"]["admin"])
        sql("TRUNCATE rate_limits")
        other = Client()
        other.session()
        time.sleep(3.1)
        self.assertEqual(other.call("register", {**good, "email": good["email"].upper()})[1]["error"], "email_taken")

    def test_login_rotates_session_and_hides_which_field_failed(self):
        c = Client()
        email, password = new_user(c)
        c.call("logout", {})
        c.session()
        before = c.cookie()
        wrong_pw = c.call("login", {"email": email, "password": "yanlis-sifre-123"})
        wrong_user = c.call("login", {"email": "yok@ornek.com", "password": "yanlis-sifre-123"})
        self.assertEqual(wrong_pw, wrong_user)
        self.assertEqual(wrong_pw[0], 401)
        status, body = c.call("login", {"email": email, "password": password})
        self.assertEqual(status, 200)
        self.assertNotEqual(before, c.cookie(), "girişte oturum kimliği yenilenmeli")
        self.assertEqual(body["user"]["email"], email)

    def test_lockout_after_repeated_failures(self):
        c = Client()
        email, password = new_user(c)
        c.call("logout", {})
        c.session()
        for _ in range(5):
            self.assertEqual(c.call("login", {"email": email, "password": "yanlis-sifre-123"})[0], 401)
        self.assertEqual(c.call("login", {"email": email, "password": password})[0], 423)

    def test_free_quota_horizon_and_idempotency(self):
        c = Client()
        new_user(c)
        rid = secrets.token_hex(16)
        status, body = c.call("consume", {"hours": 6, "request_id": rid})
        self.assertEqual((status, body["remaining"]), (200, 4))
        self.assertTrue(c.call("consume", {"hours": 6, "request_id": rid})[1]["repeated"])
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": rid})[1]["remaining"], 4)
        self.assertEqual(c.call("consume", {"hours": 48, "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": 7, "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": "6", "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": "x' OR 1=1"})[1]["error"], "invalid_request")
        for _ in range(4):
            self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[0], 200)
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[1]["error"], "quota_exhausted")

    def test_parallel_requests_cannot_exceed_quota(self):
        c = Client()
        new_user(c)
        results = []

        def hit():
            results.append(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[0])

        threads = [threading.Thread(target=hit) for _ in range(12)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(results.count(200), 5, results)
        self.assertEqual(c.session()[1]["entitlement"]["used"], 5)

    def test_subscription_request_admin_approval_and_isolation(self):
        user = Client()
        user_email, _ = new_user(user)
        self.assertEqual(user.call("subscribe", {"plan": "free", "billing": "month"})[1]["error"], "invalid_plan")
        self.assertEqual(user.call("subscribe", {"plan": "starter", "billing": "week"})[1]["error"], "invalid_plan")
        status, body = user.call("subscribe", {"plan": "starter", "billing": "year"})
        self.assertEqual(status, 201)
        self.assertRegex(body["pending"]["reference"], r"^FOC-[0-9A-F]{8}$")
        self.assertEqual(body["pending"]["amount_cents"], 69000)
        self.assertEqual(body["entitlement"]["plan"], "free", "onaysız talep hak vermemeli")
        self.assertEqual(user.call("subscribe", {"plan": "professional", "billing": "month"})[1]["error"], "pending_exists")
        self.assertEqual(user.call("admin_list", query="&status=pending")[0], 403)
        self.assertEqual(user.call("admin_decide", {"id": 1, "decision": "approve"})[0], 403)

        admin = Client()
        admin_email, _ = new_user(admin)
        sql(f"UPDATE users SET role='admin' WHERE email='{admin_email}'")
        status, listing = admin.call("admin_list", query="&status=pending")
        self.assertEqual(status, 200)
        item = next(i for i in listing["items"] if i["email"] == user_email)
        self.assertEqual(admin.call("admin_decide", {"id": str(item["id"]), "decision": "approve"})[1]["error"], "invalid_request")
        self.assertEqual(admin.call("admin_decide", {"id": item["id"], "decision": "approve"})[0], 200)
        self.assertEqual(admin.call("admin_decide", {"id": item["id"], "decision": "approve"})[0], 404, "aynı talep iki kez onaylanmamalı")

        ent = user.session()[1]["entitlement"]
        self.assertEqual((ent["plan"], ent["limit"], ent["max_hours"], ent["period"]), ("starter", 100, 24, "month"))
        self.assertEqual(user.call("consume", {"hours": 24, "request_id": secrets.token_hex(16)})[1]["remaining"], 99)
        self.assertEqual(user.call("subscribe", {"plan": "starter", "billing": "month"})[1]["error"], "already_active")
        self.assertFalse(user.call("cancel_subscription", {})[1]["entitlement"]["subscription"] is None)
        self.assertTrue(user.session()[1]["entitlement"]["subscription"]["cancel_at_period_end"])

        sql(f"UPDATE subscriptions SET period_end = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE reference='{item['reference']}'")
        self.assertEqual(user.session()[1]["entitlement"]["plan"], "free", "süresi biten abonelik düşmeli")

    def test_password_change_signs_out_other_devices(self):
        a, b = Client(), Client()
        email, password = new_user(a)
        b.session()
        self.assertEqual(b.call("login", {"email": email, "password": password})[0], 200)
        self.assertEqual(a.call("password", {"current": "yanlis", "new": "yeni-guclu-sifre-1"})[1]["error"], "bad_credentials")
        self.assertEqual(a.call("password", {"current": password, "new": "yeni-guclu-sifre-1"})[0], 200)
        self.assertIsNotNone(a.session()[1]["user"], "şifreyi değiştiren oturum açık kalmalı")
        self.assertIsNone(b.session()[1]["user"], "diğer cihaz oturumu kapanmalı")

    def test_delete_account(self):
        c = Client()
        email, password = new_user(c)
        self.assertEqual(c.call("delete_account", {"password": "yanlis"})[0], 401)
        self.assertEqual(c.call("delete_account", {"password": password})[0], 200)
        c.session()
        self.assertEqual(c.call("login", {"email": email, "password": password})[0], 401)

    def test_auth_required(self):
        c = Client()
        c.session()
        for action in ["consume", "subscribe", "password", "delete_account", "cancel_request"]:
            self.assertEqual(c.call(action, {})[0], 401, action)
        self.assertEqual(c.call("admin_list")[0], 401)


if __name__ == "__main__":
    unittest.main()
