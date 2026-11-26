<?php
declare(strict_types=1);

/**
 * FOCUS hesap API'si — tek giriş noktası.
 * Kullanım: GET/POST /api/index.php?a=<eylem>, gövde JSON.
 * Her POST için: aynı kaynak (Origin) + X-CSRF-Token + application/json zorunludur.
 */

const FOCUS_API = true;
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/plans.php';
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
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if ($raw === false || strlen($raw) > 8192) {
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

function publicUser(array $user): array
{
    return ['email' => $user['email'], 'name' => $user['name'], 'organization' => $user['organization'], 'admin' => $user['role'] === 'admin', 'since' => $user['created_at']];
}

function sessionPayload(FocusAccounts $accounts, ?array $user, array $config): array
{
    $pending = $user ? $accounts->pendingSubscription((int)$user['id']) : null;
    return [
        'ok' => true,
        'csrf' => $_SESSION['csrf'] ?? null,
        'user' => $user ? publicUser($user) : null,
        'entitlement' => $user ? $accounts->entitlement((int)$user['id']) : null,
        'pending' => $pending ? ['plan' => $pending['plan_id'], 'billing' => $pending['billing'], 'reference' => $pending['reference'], 'amount_cents' => (int)$pending['amount_cents'], 'created_at' => $pending['created_at']] : null,
        'payment_note' => $user ? (string)($config['payment_note'] ?? '') : null,
        'plans' => array_values(FocusPlans::all()),
    ];
}

try {
    $config = FocusCore::config();
    $action = is_string($_GET['a'] ?? null) ? $_GET['a'] : '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $posts = ['register', 'login', 'logout', 'subscribe', 'cancel_request', 'cancel_subscription', 'consume', 'password', 'delete_account', 'admin_decide'];
    $gets = ['session', 'admin_list'];
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
            respond(sessionPayload($accounts, $accounts->user($id), $config), 201);

        case 'login':
            FocusCore::rateLimit('login-ip', FocusCore::clientIp(), 20, 900);
            if (is_string($body['email'] ?? null)) {
                FocusCore::rateLimit('login-email', mb_strtolower(trim($body['email'])), 10, 900);
            }
            $row = $accounts->login($body['email'] ?? null, $body['password'] ?? null);
            signIn($row);
            respond(sessionPayload($accounts, $accounts->user((int)$row['id']), $config));

        case 'logout':
            if ($user) {
                FocusCore::audit((int)$user['id'], 'logout');
            }
            signOut();
            respond(['ok' => true]);

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
            FocusCore::rateLimit('consume', (string)$user['id'], 60, 3600);
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

        case 'admin_list':
            $user = requireUser($user);
            if ($user['role'] !== 'admin') {
                throw new FocusError('forbidden', 403, 'Bu sayfa yalnızca yöneticiler içindir.');
            }
            respond(['ok' => true, 'items' => $accounts->listSubscriptions(is_string($_GET['status'] ?? null) ? $_GET['status'] : 'pending')]);

        case 'admin_decide':
            $user = requireUser($user);
            if ($user['role'] !== 'admin') {
                throw new FocusError('forbidden', 403, 'Bu işlem yalnızca yöneticiler içindir.');
            }
            $accounts->decide((int)$user['id'], $body['id'] ?? null, $body['decision'] ?? null);
            respond(['ok' => true, 'items' => $accounts->listSubscriptions('pending')]);
    }
} catch (FocusError $e) {
    fail($e);
} catch (Throwable $e) {
    error_log('FOCUS api error: ' . get_class($e) . ' ' . $e->getMessage());
    respond(['ok' => false, 'error' => 'server_error', 'message' => 'Beklenmeyen bir hata oluştu. Tekrar deneyin.'], 500);
}
