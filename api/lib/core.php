<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/** Yapılandırma, veritabanı, hız sınırı ve kayıt yardımcıları. HTTP'den bağımsızdır (CLI testleri için). */
final class FocusCore
{
    private static ?array $config = null;
    private static ?PDO $pdo = null;

    public static function config(): array
    {
        if (self::$config !== null) {
            return self::$config;
        }
        $candidates = array_filter([
            getenv('FOCUS_CONFIG') ?: null,
            dirname(__DIR__, 3) . '/focus-config.php', // htdocs'un bir üstü (önerilen)
            dirname(__DIR__) . '/config.php',          // api/config.php (.htaccess ile korunur)
        ]);
        foreach ($candidates as $path) {
            if (is_file($path) && is_readable($path)) {
                $loaded = require $path;
                if (is_array($loaded)) {
                    self::$config = $loaded;
                    break;
                }
            }
        }
        if (self::$config === null) {
            throw new FocusError('not_configured', 503, 'Hesap sistemi henüz kurulmadı.');
        }
        foreach (['db_host', 'db_name', 'db_user', 'db_pass', 'app_secret', 'site_origin'] as $key) {
            if (!isset(self::$config[$key]) || !is_string(self::$config[$key])) {
                throw new FocusError('not_configured', 503, 'Hesap sistemi yapılandırması eksik.');
            }
        }
        if (strlen(self::$config['app_secret']) < 32 || str_starts_with(self::$config['app_secret'], 'DEGISTIRIN')) {
            throw new FocusError('not_configured', 503, 'Hesap sistemi gizli anahtarı ayarlanmadı.');
        }
        return self::$config;
    }

    public static function useConfig(array $config, ?PDO $pdo = null): void
    {
        self::$config = $config;
        self::$pdo = $pdo;
    }

    public static function db(): PDO
    {
        if (self::$pdo) {
            return self::$pdo;
        }
        $c = self::config();
        try {
            self::$pdo = new PDO(
                'mysql:host=' . $c['db_host'] . ';dbname=' . $c['db_name'] . ';charset=utf8mb4',
                $c['db_user'],
                $c['db_pass'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 5,
                ]
            );
            self::$pdo->exec("SET time_zone = '+00:00'");
        } catch (PDOException $e) {
            error_log('FOCUS db connect failed: ' . $e->getCode());
            throw new FocusError('db_unavailable', 503, 'Veritabanına şu an ulaşılamıyor. Biraz sonra tekrar deneyin.');
        }
        return self::$pdo;
    }

    public static function now(): string
    {
        return gmdate('Y-m-d H:i:s');
    }

    public static function timezone(): DateTimeZone
    {
        try {
            return new DateTimeZone(self::config()['timezone'] ?? 'Europe/Istanbul');
        } catch (Exception) {
            return new DateTimeZone('Europe/Istanbul');
        }
    }

    public static function clientIp(): string
    {
        // Yalnızca bağlantının gerçek adresi kullanılır; X-Forwarded-For gibi başlıklar sahte olabilir.
        return (string)($_SERVER['REMOTE_ADDR'] ?? 'cli');
    }

    public static function ipHash(): string
    {
        return substr(hash_hmac('sha256', self::clientIp(), self::config()['app_secret']), 0, 16);
    }

    /** Sabit pencereli hız sınırı. Sınır aşılırsa FocusError fırlatır. */
    public static function rateLimit(string $name, string $subject, int $max, int $window): void
    {
        $slot = intdiv(time(), $window);
        $bucket = hash_hmac('sha256', $name . '|' . $subject . '|' . $window . '|' . $slot, self::config()['app_secret']);
        $db = self::db();
        $db->prepare('INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1')
            ->execute([$bucket, $slot * $window]);
        $stmt = $db->prepare('SELECT hits FROM rate_limits WHERE bucket = ?');
        $stmt->execute([$bucket]);
        $hits = (int)$stmt->fetchColumn();
        if (random_int(1, 50) === 1) {
            $db->prepare('DELETE FROM rate_limits WHERE window_start < ?')->execute([time() - 172800]);
        }
        if ($hits > $max) {
            $wait = ($slot + 1) * $window - time();
            throw new FocusError('rate_limited', 429, 'Çok fazla deneme yapıldı. ' . max(1, (int)ceil($wait / 60)) . ' dakika sonra tekrar deneyin.');
        }
    }

    public static function audit(?int $userId, string $action, string $detail = ''): void
    {
        try {
            self::db()->prepare('INSERT INTO audit_log (user_id, action, detail, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$userId, $action, mb_substr($detail, 0, 255), self::ipHash(), self::now()]);
        } catch (Throwable $e) {
            error_log('FOCUS audit failed: ' . $e->getMessage());
        }
    }
}

/** Kullanıcıya gösterilebilir hata. Mesaj Türkçedir, kod istemcinin çevirisi içindir. */
final class FocusError extends RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $status, string $message, public readonly ?string $field = null)
    {
        parent::__construct($message);
    }
}
