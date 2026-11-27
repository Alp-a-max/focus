<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * Yönetici panelinden değiştirilebilen ayarlar. Gizli değerler (SMTP uygulama şifresi)
 * app_secret'tan türetilen anahtarla AES-256-GCM ile şifrelenerek saklanır ve asla geri gösterilmez.
 */
final class FocusSettings
{
    public const DEFAULTS = [
        'trial_hours' => '24',
        'subscriptions_enabled' => '0',
        'verification_required' => '1',
        'google_client_id' => '',
        'smtp_host' => 'smtp.gmail.com',
        'smtp_port' => '465',
        'smtp_user' => '',
        'smtp_pass' => '',
        'mail_from' => '',
        'mail_from_name' => 'FOCUS',
        'mail_subject' => 'FOCUS doğrulama kodunuz: {kod}',
        'mail_body' => "Merhaba {ad},\n\nFOCUS hesabınızı doğrulamak için kodunuz:\n\n{kod}\n\nKod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\nFOCUS",
    ];
    private const SECRETS = ['smtp_pass'];
    private ?array $cache = null;

    public function __construct(private PDO $db)
    {
    }

    public function all(): array
    {
        if ($this->cache === null) {
            $this->cache = self::DEFAULTS;
            foreach ($this->db->query('SELECT k, v FROM settings') as $row) {
                if (array_key_exists($row['k'], self::DEFAULTS)) {
                    $this->cache[$row['k']] = (string)$row['v'];
                }
            }
        }
        return $this->cache;
    }

    public function get(string $key): string
    {
        $value = $this->all()[$key] ?? '';
        return in_array($key, self::SECRETS, true) ? $this->decrypt($value) : $value;
    }

    public function set(array $values): void
    {
        $stmt = $this->db->prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
        foreach ($values as $key => $value) {
            if (!array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            $stmt->execute([$key, in_array($key, self::SECRETS, true) && $value !== '' ? $this->encrypt((string)$value) : (string)$value]);
        }
        $this->cache = null;
    }

    public function trialHours(): int
    {
        return max(1, min(24 * 365, (int)$this->get('trial_hours')));
    }

    public function subscriptionsEnabled(): bool
    {
        return $this->get('subscriptions_enabled') === '1';
    }

    public function mailConfigured(): bool
    {
        return $this->get('smtp_user') !== '' && $this->get('smtp_pass') !== '' && $this->get('smtp_host') !== '';
    }

    public function verificationOn(): bool
    {
        return $this->get('verification_required') === '1' && $this->mailConfigured();
    }

    /** Panelde gösterilecek hâli: gizli değerler yerine yalnızca "kayıtlı mı" bilgisi. */
    public function forAdmin(): array
    {
        $out = $this->all();
        foreach (self::SECRETS as $key) {
            $out[$key . '_set'] = $out[$key] !== '';
            unset($out[$key]);
        }
        $out['mail_configured'] = $this->mailConfigured();
        return $out;
    }

    public function publicView(): array
    {
        return [
            'trial_hours' => $this->trialHours(),
            'subscriptions_enabled' => $this->subscriptionsEnabled(),
            'google_client_id' => $this->get('google_client_id'),
            'verification_on' => $this->verificationOn(),
        ];
    }

    private function key(): string
    {
        return hash_hmac('sha256', 'focus-settings-v1', FocusCore::config()['app_secret'], true);
    }

    private function encrypt(string $plain): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA, $iv, $tag);
        return 'v1:' . base64_encode($iv . $tag . $cipher);
    }

    private function decrypt(string $stored): string
    {
        if (!str_starts_with($stored, 'v1:')) {
            return '';
        }
        $raw = base64_decode(substr($stored, 3), true);
        if ($raw === false || strlen($raw) < 29) {
            return '';
        }
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
        return $plain === false ? '' : $plain;
    }
}
