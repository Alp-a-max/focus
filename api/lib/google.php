<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * "Google ile giriş" kimlik jetonunu (ID token) Google'ın tokeninfo uç noktasıyla doğrular.
 * Kontroller: imza (Google tarafında), hedef kitle = bizim istemci kimliğimiz, yayıncı, süre, doğrulanmış e-posta.
 */
final class FocusGoogle
{
    public static function verify(mixed $credential, string $clientId): array
    {
        if ($clientId === '') {
            throw new FocusError('google_disabled', 503, 'Google ile giriş henüz ayarlanmadı.');
        }
        if (!is_string($credential) || strlen($credential) > 4096 || !preg_match('/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/', $credential)) {
            throw new FocusError('google_invalid', 400, 'Google oturumu doğrulanamadı.');
        }
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential);
        $body = null;
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_FOLLOWLOCATION => false]);
            $body = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if (PHP_VERSION_ID < 80000) {
                curl_close($ch);
            }
            if ($body === false) {
                error_log('FOCUS google tokeninfo unreachable');
                throw new FocusError('google_unreachable', 502, 'Google doğrulama servisine ulaşılamadı.');
            }
            if ($status !== 200) {
                throw new FocusError('google_invalid', 401, 'Google oturumu doğrulanamadı.');
            }
        } else {
            $body = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => false]]));
            if ($body === false) {
                throw new FocusError('google_invalid', 401, 'Google oturumu doğrulanamadı.');
            }
        }
        $claims = json_decode((string)$body, true);
        if (!is_array($claims)
            || ($claims['aud'] ?? '') !== $clientId
            || !in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            || (int)($claims['exp'] ?? 0) < time()
            || !in_array($claims['email_verified'] ?? '', ['true', true], true)
            || empty($claims['sub']) || empty($claims['email'])) {
            throw new FocusError('google_invalid', 401, 'Google oturumu doğrulanamadı.');
        }
        return ['sub' => (string)$claims['sub'], 'email' => mb_strtolower((string)$claims['email']), 'name' => (string)($claims['name'] ?? '')];
    }
}
