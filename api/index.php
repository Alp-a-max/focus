<?php
declare(strict_types=1);

/**
 * FOCUS hesap API'si — tek giriş noktası.
 * Kullanım: GET/POST /api/index.php?a=<eylem>, gövde JSON.
 * Her POST için: aynı kaynak (Origin) + X-CSRF-Token + application/json zorunludur.
 */

// Hata ayrıntısı asla yanıta karışmasın (JSON bozulur, bilgi sızar); yalnızca sunucu loguna yazılır.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

const FOCUS_API = true;
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/plans.php';
require __DIR__ . '/lib/settings.php';
require __DIR__ . '/lib/mailer.php';
require __DIR__ . '/lib/google.php';
require __DIR__ . '/lib/accounts.php';

const SESSION_IDLE = 14 * 86400;
const SESSION_ABSOLUTE = 30 * 86400;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Cross-Origin-Resource-Policy: same-origin');

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(FocusError $e): never
{
    respond(['ok' => false, 'error' => $e->errorCode, 'message' => $e->getMessage(), 'field' => $e->field], $e->status);
}

function input(): array
{
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($type, 'application/json')) {
        throw new FocusError('bad_content_type', 415, 'İstek JSON olmalı.');
    }
    $raw = file_get_contents('php://input', false, null, 0, 16385);
    if ($raw === false || strlen($raw) > 16384) {
        throw new FocusError('too_large', 413, 'İstek çok büyük.');
    }
    $data = json_decode($raw, true, 8);
    if (!is_array($data)) {
        throw new FocusError('bad_json', 400, 'İstek okunamadı.');
    }
    return $data;
}

function checkOrigin(array $config): void
{
    $allowed = array_merge([rtrim($config['site_origin'], '/')], $config['extra_origins'] ?? []);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin !== null) {
        if (!in_array(rtrim($origin, '/'), $allowed, true)) {
            throw new FocusError('bad_origin', 403, 'Bu istek başka bir siteden geldiği için reddedildi.');
        }
        return;
    }
    $referer = (string)($_SERVER['HTTP_REFERER'] ?? '');
    foreach ($allowed as $base) {
        if (str_starts_with($referer, $base . '/')) {
            return;
        }
    }
    throw new FocusError('bad_origin', 403, 'İsteğin kaynağı doğrulanamadı.');
}

function startSession(array $config): void
{
    $secure = str_starts_with($config['site_origin'], 'https://');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string)SESSION_IDLE);
    session_name($secure ? '__Host-focus' : 'focus_sid');
    session_set_cookie_params(['lifetime' => SESSION_IDLE, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_at'] = time();
    }
}

function signIn(array $user): void
{
    session_regenerate_id(true);
    $_SESSION = [
        'uid' => (int)$user['id'],
        'ver' => (int)$user['session_version'],
        'started' => time(),
        'seen' => time(),
        'csrf' => bin2hex(random_bytes(32)),
        'csrf_at' => time(),
    ];
}

function signOut(): void
{
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => $p['samesite']]);
    session_destroy();
}

function currentUser(FocusAccounts $accounts): ?array
{
    $uid = $_SESSION['uid'] ?? null;
    if (!is_int($uid)) {
        return null;
    }
    $user = $accounts->user($uid);
    $expired = time() - (int)($_SESSION['seen'] ?? 0) > SESSION_IDLE || time() - (int)($_SESSION['started'] ?? 0) > SESSION_ABSOLUTE;
    if (!$user || $expired || (int)$user['session_version'] !== (int)($_SESSION['ver'] ?? -1)) {
        signOut();
        return null;
    }
    $_SESSION['seen'] = time();
    return $user;
}

function requireUser(?array $user): array
{
    if (!$user) {
        throw new FocusError('auth_required', 401, 'Bu işlem için giriş yapın.');
    }
    return $user;
}

function requireAdmin(?array $user): array
{
    $user = requireUser($user);
    if ($user['role'] !== 'admin') {
        throw new FocusError('forbidden', 403, 'Bu sayfa yalnızca yöneticiler içindir.');
    }
    return $user;
}

function publicUser(array $user): array
{
    return [
        'email' => $user['email'],
        'name' => $user['name'],
        'organization' => $user['organization'],
        'admin' => $user['role'] === 'admin',
        'since' => $user['created_at'],
        'verified' => $user['email_verified_at'] !== null,
        'google' => (bool)$user['google'],
        'has_password' => (bool)$user['has_password'],
    ];
}

function sessionPayload(FocusAccounts $accounts, ?array $user, array $config): array
{
    $pending = $user ? $accounts->pendingSubscription((int)$user['id']) : null;
    $settings = $accounts->settings();
    return [
        'ok' => true,
        'csrf' => $_SESSION['csrf'] ?? null,
        'user' => $user ? publicUser($user) : null,
        'entitlement' => $user ? $accounts->entitlement((int)$user['id']) : null,
        'pending' => $pending ? ['plan' => $pending['plan_id'], 'billing' => $pending['billing'], 'reference' => $pending['reference'], 'amount_cents' => (int)$pending['amount_cents'], 'created_at' => $pending['created_at']] : null,
        'payment_note' => $user ? (string)($config['payment_note'] ?? '') : null,
        'settings' => $settings->publicView(),
        'needs_setup' => $accounts->adminCount() === 0,
        'plans' => array_values(array_filter(FocusPlans::all(), static fn($p) => $p['id'] !== 'admin')),
    ];
}

/** Kayıttan sonra doğrulama kodunu gönderir; gönderim hatası kaydı geri almaz, kullanıcı tekrar isteyebilir. */
function sendFirstCode(FocusAccounts $accounts, int $userId): ?string
{
    if (!$accounts->settings()->verificationOn()) {
        return null;
    }
    try {
        $accounts->issueCode($userId);
        return 'code_sent';
    } catch (FocusError $e) {
        return 'code_send_failed';
    }
}

try {
    $config = FocusCore::config();
    $action = is_string($_GET['a'] ?? null) ? $_GET['a'] : '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $posts = ['register', 'login', 'google', 'logout', 'verify_email', 'resend_code', 'subscribe', 'cancel_request', 'cancel_subscription',
        'consume', 'password', 'delete_account', 'setup_admin', 'admin_decide', 'admin_user_update', 'admin_settings_save', 'admin_test_mail'];
    $gets = ['session', 'admin_list', 'admin_users', 'admin_settings'];
    if (!in_array($action, array_merge($posts, $gets), true)) {
        throw new FocusError('unknown_action', 404, 'Bilinmeyen işlem.');
    }
    $expected = in_array($action, $posts, true) ? 'POST' : 'GET';
    if ($method !== $expected) {
        header('Allow: ' . $expected);
        throw new FocusError('method_not_allowed', 405, 'Bu işlem ' . $expected . ' ile çağrılmalı.');
    }

    startSession($config);
    FocusCore::rateLimit('ip', FocusCore::clientIp(), 300, 300);
    $accounts = new FocusAccounts(FocusCore::db());
    $user = currentUser($accounts);
    $body = [];

    if ($expected === 'POST') {
        checkOrigin($config);
        $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new FocusError('csrf', 403, 'Oturum doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.');
        }
        $body = input();
    }

    switch ($action) {
        case 'session':
            respond(sessionPayload($accounts, $user, $config));

        case 'register':
            if ($user) {
                throw new FocusError('already_signed_in', 409, 'Zaten giriş yaptınız.');
            }
            // Bot önlemleri: görünmez tuzak alanı dolu olmamalı, form en az 3 sn açık kalmış olmalı.
            if (($body['website'] ?? '') !== '' || time() - (int)($_SESSION['csrf_at'] ?? time()) < 3) {
                FocusCore::audit(null, 'register_bot_blocked');
                throw new FocusError('try_again', 400, 'Kayıt tamamlanamadı. Birkaç saniye bekleyip tekrar deneyin.');
            }
            if (($body['accept'] ?? false) !== true) {
                throw new FocusError('terms_required', 422, 'Devam etmek için gizlilik bildirimini onaylayın.', 'accept');
            }
            FocusCore::rateLimit('register', FocusCore::clientIp(), 5, 3600);
            $id = $accounts->register($body['email'] ?? null, $body['name'] ?? null, $body['organization'] ?? '', $body['password'] ?? null);
            signIn($accounts->user($id));
            $mail = sendFirstCode($accounts, $id);
            respond(sessionPayload($accounts, $accounts->user($id), $config) + ['mail' => $mail], 201);

        case 'login':
            FocusCore::rateLimit('login-ip', FocusCore::clientIp(), 20, 900);
            if (is_string($body['email'] ?? null)) {
                FocusCore::rateLimit('login-email', mb_strtolower(trim($body['email'])), 10, 900);
            }
            $row = $accounts->login($body['email'] ?? null, $body['password'] ?? null);
            signIn($row);
            respond(sessionPayload($accounts, $accounts->user((int)$row['id']), $config));

        case 'google':
            FocusCore::rateLimit('google', FocusCore::clientIp(), 20, 900);
            $claims = FocusGoogle::verify($body['credential'] ?? null, $accounts->settings()->get('google_client_id'));
            $row = $accounts->googleLogin($claims);
            signIn($row);
            respond(sessionPayload($accounts, $accounts->user((int)$row['id']), $config));

        case 'logout':
            if ($user) {
                FocusCore::audit((int)$user['id'], 'logout');
            }
            signOut();
            respond(['ok' => true]);

        case 'verify_email':
            $user = requireUser($user);
            FocusCore::rateLimit('verify', (string)$user['id'], 10, 900);
            $accounts->verifyCode((int)$user['id'], $body['code'] ?? null);
            respond(sessionPayload($accounts, $accounts->user((int)$user['id']), $config));

        case 'resend_code':
            $user = requireUser($user);
            FocusCore::rateLimit('resend', (string)$user['id'], 5, 3600);
            $accounts->issueCode((int)$user['id']);
            respond(['ok' => true, 'mail' => 'code_sent']);

        case 'subscribe':
            $user = requireUser($user);
            FocusCore::rateLimit('subscribe', (string)$user['id'], 10, 86400);
            $accounts->requestSubscription((int)$user['id'], $body['plan'] ?? null, $body['billing'] ?? null);
            respond(sessionPayload($accounts, $user, $config), 201);

        case 'cancel_request':
            $user = requireUser($user);
            $accounts->cancelPending((int)$user['id']);
            respond(sessionPayload($accounts, $user, $config));

        case 'cancel_subscription':
            $user = requireUser($user);
            $accounts->cancelActive((int)$user['id']);
            respond(sessionPayload($accounts, $user, $config));

        case 'consume':
            $user = requireUser($user);
            FocusCore::rateLimit('consume', (string)$user['id'], 120, 3600);
            respond(['ok' => true] + $accounts->consume((int)$user['id'], $body['hours'] ?? null, $body['request_id'] ?? null));

        case 'password':
            $user = requireUser($user);
            FocusCore::rateLimit('password', (string)$user['id'], 5, 900);
            $accounts->changePassword((int)$user['id'], $body['current'] ?? null, $body['new'] ?? null);
            signIn($accounts->user((int)$user['id']));
            respond(sessionPayload($accounts, $accounts->user((int)$user['id']), $config));

        case 'delete_account':
            $user = requireUser($user);
            FocusCore::rateLimit('delete', (string)$user['id'], 5, 900);
            $accounts->deleteAccount((int)$user['id'], $body['password'] ?? null);
            signOut();
            respond(['ok' => true]);

        case 'setup_admin':
            FocusCore::rateLimit('setup', FocusCore::clientIp(), 5, 3600);
            $id = $accounts->setupAdmin($body['token'] ?? null, $body['email'] ?? null, $body['name'] ?? 'Yönetici', $body['password'] ?? null);
            signIn($accounts->user($id));
            respond(sessionPayload($accounts, $accounts->user($id), $config), 201);

        case 'admin_list':
            requireAdmin($user);
            respond(['ok' => true, 'items' => $accounts->listSubscriptions(is_string($_GET['status'] ?? null) ? $_GET['status'] : 'pending')]);

        case 'admin_decide':
            $admin = requireAdmin($user);
            $accounts->decide((int)$admin['id'], $body['id'] ?? null, $body['decision'] ?? null);
            respond(['ok' => true, 'items' => $accounts->listSubscriptions('pending')]);

        case 'admin_users':
            requireAdmin($user);
            respond(['ok' => true, 'items' => $accounts->listUsers()]);

        case 'admin_user_update':
            $admin = requireAdmin($user);
            $accounts->adminUpdateUser((int)$admin['id'], $body['id'] ?? null, $body['action'] ?? null, $body['value'] ?? null);
            respond(['ok' => true, 'items' => $accounts->listUsers()]);

        case 'admin_settings':
            requireAdmin($user);
            respond(['ok' => true, 'settings' => $accounts->settings()->forAdmin()]);

        case 'admin_settings_save':
            $admin = requireAdmin($user);
            $s = $body['settings'] ?? null;
            if (!is_array($s)) {
                throw new FocusError('invalid_request', 422, 'Ayarlar okunamadı.');
            }
            $clean = [];
            $text = static function ($v, int $max, string $label): string {
                if (!is_string($v) || mb_strlen($v) > $max) {
                    throw new FocusError('invalid_value', 422, "$label en çok $max karakter olabilir.");
                }
                return trim($v);
            };
            if (array_key_exists('trial_hours', $s)) {
                if (!is_int($s['trial_hours']) || $s['trial_hours'] < 1 || $s['trial_hours'] > 8760) {
                    throw new FocusError('invalid_value', 422, 'Deneme süresi 1–8760 saat olmalı.');
                }
                $clean['trial_hours'] = (string)$s['trial_hours'];
            }
            foreach (['subscriptions_enabled', 'verification_required'] as $flag) {
                if (array_key_exists($flag, $s)) {
                    $clean[$flag] = $s[$flag] === true ? '1' : '0';
                }
            }
            if (array_key_exists('google_client_id', $s)) {
                $v = $text($s['google_client_id'], 200, 'Google istemci kimliği');
                if ($v !== '' && !preg_match('/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', $v)) {
                    throw new FocusError('invalid_value', 422, 'Google istemci kimliği "...apps.googleusercontent.com" ile bitmeli.');
                }
                $clean['google_client_id'] = $v;
            }
            if (array_key_exists('smtp_host', $s)) {
                $v = $text($s['smtp_host'], 120, 'SMTP sunucusu');
                if (!preg_match('/^[a-z0-9.-]+$/i', $v)) {
                    throw new FocusError('invalid_value', 422, 'SMTP sunucusu geçersiz.');
                }
                $clean['smtp_host'] = $v;
            }
            if (array_key_exists('smtp_port', $s)) {
                if (!in_array($s['smtp_port'], [465, 587], true)) {
                    throw new FocusError('invalid_value', 422, 'SMTP portu 465 veya 587 olmalı.');
                }
                $clean['smtp_port'] = (string)$s['smtp_port'];
            }
            foreach (['smtp_user' => 'Gmail adresi', 'mail_from' => 'Gönderen adres'] as $k => $label) {
                if (array_key_exists($k, $s)) {
                    $v = $text($s[$k], 190, $label);
                    if ($v !== '' && filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
                        throw new FocusError('invalid_value', 422, "$label geçersiz.");
                    }
                    $clean[$k] = $v;
                }
            }
            if (isset($s['smtp_pass']) && $s['smtp_pass'] !== '') {
                $clean['smtp_pass'] = str_replace(' ', '', $text($s['smtp_pass'], 200, 'Uygulama şifresi'));
            }
            if (array_key_exists('mail_from_name', $s)) {
                $clean['mail_from_name'] = $text($s['mail_from_name'], 80, 'Gönderen adı');
            }
            if (array_key_exists('mail_subject', $s)) {
                $clean['mail_subject'] = $text($s['mail_subject'], 150, 'Konu');
            }
            if (array_key_exists('mail_body', $s)) {
                $v = $text($s['mail_body'], 4000, 'E-posta metni');
                if (!str_contains($v, '{kod}')) {
                    throw new FocusError('invalid_value', 422, 'E-posta metni {kod} ifadesini içermeli.');
                }
                $clean['mail_body'] = $v;
            }
            $accounts->settings()->set($clean);
            FocusCore::audit((int)$admin['id'], 'settings_saved', implode(',', array_keys($clean)));
            respond(['ok' => true, 'settings' => $accounts->settings()->forAdmin()]);

        case 'admin_test_mail':
            $admin = requireAdmin($user);
            FocusCore::rateLimit('testmail', (string)$admin['id'], 5, 3600);
            (new FocusMailer($accounts->settings()))->sendCode($admin['email'], $admin['name'], '123456');
            respond(['ok' => true, 'sent_to' => $admin['email']]);
    }
} catch (FocusError $e) {
    fail($e);
} catch (Throwable $e) {
    error_log('FOCUS api error: ' . get_class($e) . ' ' . $e->getMessage());
    respond(['ok' => false, 'error' => 'server_error', 'message' => 'Beklenmeyen bir hata oluştu. Tekrar deneyin.'], 500);
}
