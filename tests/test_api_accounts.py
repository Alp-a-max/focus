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
        sql("TRUNCATE rate_limits; TRUNCATE settings; TRUNCATE email_codes;")

    def test_session_is_anonymous_with_csrf(self):
        status, body = Client().session()
        self.assertEqual(status, 200)
        self.assertIsNone(body["user"])
        self.assertEqual(len(body["csrf"]), 64)
        self.assertEqual([p["id"] for p in body["plans"]], ["trial", "payg", "team", "institution"])

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
        self.assertEqual(body["entitlement"]["plan"], "trial")
        self.assertEqual(body["entitlement"]["remaining"], 10)
        self.assertTrue(body["entitlement"]["trial_active"])
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
        self.assertEqual((status, body["remaining"]), (200, 9))
        self.assertTrue(c.call("consume", {"hours": 6, "request_id": rid})[1]["repeated"])
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": rid})[1]["remaining"], 9)
        self.assertEqual(c.call("consume", {"hours": 48, "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": 7, "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": "6", "request_id": secrets.token_hex(16)})[1]["error"], "invalid_hours")
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": "x' OR 1=1"})[1]["error"], "invalid_request")
        for _ in range(9):
            self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[0], 200)
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[1]["error"], "quota_exhausted")

    def test_trial_ends_after_seven_days(self):
        c = Client()
        email, _ = new_user(c)
        sql(f"UPDATE users SET created_at = UTC_TIMESTAMP() - INTERVAL 25 HOUR WHERE email='{email}'")
        ent = c.session()[1]["entitlement"]
        self.assertEqual((ent["plan"], ent["remaining"], ent["trial_active"]), ("none", 0, False))
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[1]["error"], "trial_ended")
        self.assertEqual(c.call("subscribe", {"plan": "team", "billing": "month"})[1]["error"], "subscriptions_closed")
        sql("INSERT INTO settings (k, v) VALUES ('subscriptions_enabled', '1')")
        self.assertEqual(c.call("subscribe", {"plan": "team", "billing": "month"})[0], 201, "deneme bitince paket istenebilmeli")

    def test_parallel_requests_cannot_exceed_quota(self):
        c = Client()
        new_user(c)
        results = []

        def hit():
            results.append(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[0])

        threads = [threading.Thread(target=hit) for _ in range(16)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(results.count(200), 10, results)
        self.assertEqual(c.session()[1]["entitlement"]["used"], 10)

    def test_subscription_request_admin_approval_and_isolation(self):
        user = Client()
        user_email, _ = new_user(user)
        sql("INSERT INTO settings (k, v) VALUES ('subscriptions_enabled', '1')")
        self.assertEqual(user.call("subscribe", {"plan": "trial", "billing": "month"})[1]["error"], "invalid_plan")
        self.assertEqual(user.call("subscribe", {"plan": "team", "billing": "week"})[1]["error"], "invalid_plan")
        status, body = user.call("subscribe", {"plan": "team", "billing": "year"})
        self.assertEqual(status, 201)
        self.assertRegex(body["pending"]["reference"], r"^FOC-[0-9A-F]{8}$")
        self.assertEqual(body["pending"]["amount_cents"], 449000)
        self.assertEqual(body["entitlement"]["plan"], "trial", "onaysız talep hak vermemeli")
        self.assertEqual(user.call("subscribe", {"plan": "team", "billing": "month"})[1]["error"], "pending_exists")
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
        self.assertEqual((ent["plan"], ent["limit"], ent["max_hours"], ent["period"]), ("team", 500, 24, "month"))
        self.assertEqual(user.call("consume", {"hours": 24, "request_id": secrets.token_hex(16)})[1]["remaining"], 499)
        self.assertEqual(user.call("subscribe", {"plan": "team", "billing": "month"})[1]["error"], "already_active")
        self.assertFalse(user.call("cancel_subscription", {})[1]["entitlement"]["subscription"] is None)
        self.assertTrue(user.session()[1]["entitlement"]["subscription"]["cancel_at_period_end"])

        sql(f"UPDATE subscriptions SET period_end = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE reference='{item['reference']}'")
        self.assertEqual(user.session()[1]["entitlement"]["plan"], "trial", "süresi biten abonelik düşmeli")

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

    def test_admin_setup_dashboard_and_settings(self):
        sql("UPDATE users SET role='user'")
        anon = Client()
        self.assertTrue(anon.session()[1]["needs_setup"])
        good = {"token": "local-setup-token-0123456789abcdef", "email": f"admin{secrets.token_hex(3)}@ornek.com", "name": "Yonetici", "password": "Mavi-Okyanus-Akintisi-2026!"}
        self.assertEqual(anon.call("setup_admin", {**good, "token": "yanlis-anahtar-yanlis-anahtar"})[1]["error"], "bad_setup_token")
        self.assertEqual(anon.call("setup_admin", {**good, "password": "kisa-sifre-1"})[1]["error"], "weak_password")
        status, body = anon.call("setup_admin", good)
        self.assertEqual(status, 201, body)
        self.assertTrue(body["user"]["admin"])
        self.assertEqual(body["entitlement"]["plan"], "admin", "yonetici en ust pakete sahip olmali")
        self.assertGreaterEqual(body["entitlement"]["limit"], 100000)
        self.assertFalse(body["needs_setup"])
        other = Client()
        other.session()
        self.assertEqual(other.call("setup_admin", {**good, "email": "ikinci@ornek.com"})[1]["error"], "admin_exists")

        user = Client()
        user_email, _ = new_user(user)
        user.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})
        self.assertEqual(user.call("admin_users")[0], 403)
        self.assertEqual(user.call("admin_settings")[0], 403)
        status, listing = anon.call("admin_users")
        self.assertEqual(status, 200)
        row = next(u for u in listing["items"] if u["email"] == user_email)
        self.assertEqual((row["uses_total"], row["uses_30d"], row["plan"]), (1, 1, "trial"))
        self.assertIsNotNone(row["last_login_at"] or row["created_at"])

        self.assertEqual(anon.call("admin_settings_save", {"settings": {"trial_hours": 0}})[1]["error"], "invalid_value")
        self.assertEqual(anon.call("admin_settings_save", {"settings": {"mail_body": "kod yok"}})[1]["error"], "invalid_value")
        self.assertEqual(anon.call("admin_settings_save", {"settings": {"google_client_id": "evil.example.com"}})[1]["error"], "invalid_value")
        status, saved = anon.call("admin_settings_save", {"settings": {"trial_hours": 48, "smtp_user": "focus.ornek@gmail.com", "smtp_pass": "abcd efgh ijkl mnop", "mail_subject": "Kod: {kod}", "mail_body": "Merhaba {ad}, kodunuz {kod}"}})
        self.assertEqual(status, 200, saved)
        self.assertTrue(saved["settings"]["smtp_pass_set"])
        self.assertNotIn("smtp_pass", saved["settings"])
        self.assertEqual(saved["settings"]["trial_hours"], "48")
        self.assertTrue(user.session()[1]["settings"]["verification_on"])

        uid = row["id"]
        self.assertEqual(anon.call("admin_user_update", {"id": uid, "action": "grant", "value": {"plan": "team", "months": 2}})[0], 200)
        self.assertEqual(user.session()[1]["entitlement"]["plan"], "team")
        self.assertEqual(anon.call("admin_user_update", {"id": uid, "action": "revoke"})[0], 200)
        sql(f"UPDATE users SET created_at = UTC_TIMESTAMP() - INTERVAL 30 DAY WHERE id={uid}")
        self.assertEqual(user.session()[1]["entitlement"]["plan"], "none")
        self.assertEqual(anon.call("admin_user_update", {"id": uid, "action": "trial", "value": 24})[0], 200)
        self.assertEqual(user.session()[1]["entitlement"]["plan"], "trial", "deneme uzatilabilmeli")
        self.assertEqual(anon.call("admin_user_update", {"id": uid, "action": "drop_table"})[1]["error"], "invalid_request")
        self.assertEqual(anon.call("delete_account", {"password": good["password"]})[1]["error"], "last_admin")

    def test_email_verification_flow(self):
        import hashlib
        import hmac
        sql("UPDATE users SET role='user'")
        admin = Client()
        admin.session()
        admin.call("setup_admin", {"token": "local-setup-token-0123456789abcdef", "email": f"adm{secrets.token_hex(3)}@ornek.com", "name": "Yonetici", "password": "Mavi-Okyanus-Akintisi-2026!"})
        self.assertEqual(admin.call("admin_settings_save", {"settings": {"smtp_user": "focus.ornek@gmail.com", "smtp_host": "127.0.0.1", "smtp_port": 465, "smtp_pass": "abcdefghijklmnop"}})[0], 200)
        c = Client()
        c.session()
        time.sleep(3.1)
        email = f"v{secrets.token_hex(3)}@ornek.com"
        status, body = c.call("register", {"email": email, "name": "Dogrulama", "password": "deniz-akintisi-42", "website": "", "accept": True})
        self.assertEqual(status, 201)
        self.assertFalse(body["user"]["verified"])
        self.assertEqual(body["mail"], "code_send_failed", "yerelde SMTP yok; kayit yine de tamamlanmali")
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[1]["error"], "email_unverified")
        out = subprocess.run(shlex.split(MYSQL, posix=False) + ["-N", "-e", f"SELECT id FROM users WHERE email='{email}'"], capture_output=True, text=True).stdout
        uid = int(out.strip())
        code = "482913"
        digest = hmac.new(b"local-test-secret-0123456789abcdefghijklmnop", f"{uid}|{code}".encode(), hashlib.sha256).hexdigest()
        sql(f"REPLACE INTO email_codes (user_id, code_hash, expires_at, attempts, sent_at) VALUES ({uid}, '{digest}', UTC_TIMESTAMP() + INTERVAL 10 MINUTE, 0, UTC_TIMESTAMP())")
        self.assertEqual(c.call("verify_email", {"code": "12ab56"})[1]["error"], "bad_code")
        self.assertEqual(c.call("verify_email", {"code": "000000"})[1]["error"], "bad_code")
        status, body = c.call("verify_email", {"code": code})
        self.assertEqual(status, 200, body)
        self.assertTrue(body["user"]["verified"])
        self.assertEqual(c.call("consume", {"hours": 6, "request_id": secrets.token_hex(16)})[0], 200)

    def test_google_sign_in_guards(self):
        c = Client()
        c.session()
        self.assertEqual(c.call("google", {"credential": "a.b.c"})[1]["error"], "google_disabled")
        sql("INSERT INTO settings (k, v) VALUES ('google_client_id', '123456-abc.apps.googleusercontent.com')")
        self.assertEqual(c.call("google", {"credential": "<script>"})[1]["error"], "google_invalid")
        status, body = c.call("google", {"credential": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln"})
        self.assertIn(body["error"], ["google_invalid", "google_unreachable"], "sahte jeton kabul edilmemeli")

    def test_auth_required(self):
        c = Client()
        c.session()
        for action in ["consume", "subscribe", "password", "delete_account", "cancel_request"]:
            self.assertEqual(c.call(action, {})[0], 401, action)
        self.assertEqual(c.call("admin_list")[0], 401)


if __name__ == "__main__":
    unittest.main()
