<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * Hesap, doğrulama, abonelik ve kota kuralları. Tüm haklar burada, sunucuda hesaplanır;
 * tarayıcıdaki hiçbir değer (localStorage, gizli alan vb.) hak sayılmaz.
 */
final class FocusAccounts
{
    public const MAX_FAILED_LOGINS = 5;
    private const COMMON_PASSWORDS = ['1234567890', '12345678910', 'qwertyuiop', 'password123', 'sifre12345', 'parola1234', '1q2w3e4r5t', 'qwerty1234', 'abcdefghij', 'focus12345', 'galatasaray', 'fenerbahce', 'besiktas1903', 'trabzonspor'];
    // Var olmayan kullanıcıda da aynı sürede yanıt vermek için kullanılan sabit özet.
    private const DUMMY_HASH = '$2y$12$HvC6Fpq6/nn4MV7SYgihq.ijo83w4t.5MVJjng/2jqcklIiTdCJYy';
    private FocusSettings $settings;

    public function __construct(private PDO $db, ?FocusSettings $settings = null)
    {
        $this->settings = $settings ?? new FocusSettings($db);
    }

    public function settings(): FocusSettings
    {
        return $this->settings;
    }

    // ---------- Doğrulama ----------

    public static function cleanEmail(mixed $email): string
    {
        $email = is_string($email) ? mb_strtolower(trim($email)) : '';
        if ($email === '' || strlen($email) > 190 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new FocusError('invalid_email', 422, 'Geçerli bir e-posta adresi girin.', 'email');
        }
        return $email;
    }

    public static function cleanText(mixed $value, int $min, int $max, string $field, string $label): string
    {
        $value = is_string($value) ? trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '') : '';
        $len = mb_strlen($value);
        if ($len < $min || $len > $max) {
            throw new FocusError('invalid_' . $field, 422, $min > 0 ? "{$label} {$min}–{$max} karakter olmalı." : "{$label} en çok {$max} karakter olabilir.", $field);
        }
        return $value;
    }

    public static function checkPassword(mixed $password, string $email): string
    {
        if (!is_string($password) || strlen($password) < 10 || strlen($password) > 128) {
            throw new FocusError('weak_password', 422, 'Şifre 10–128 karakter olmalı.', 'password');
        }
        $lower = mb_strtolower($password);
        $local = explode('@', $email)[0];
        if (in_array($lower, self::COMMON_PASSWORDS, true) || count(array_unique(mb_str_split($password))) < 5
            || (strlen($local) >= 4 && str_contains($lower, $local))) {
            throw new FocusError('weak_password', 422, 'Bu şifre kolay tahmin edilir. E-postanızı veya tekrar eden karakterleri içermeyen bir şifre seçin.', 'password');
        }
        return $password;
    }

    // ---------- Kayıt ve giriş ----------

    public function register(mixed $email, mixed $name, mixed $organization, mixed $password): int
    {
        $email = self::cleanEmail($email);
        $name = self::cleanText($name, 2, 80, 'name', 'Ad soyad');
        $organization = self::cleanText($organization ?? '', 0, 120, 'organization', 'Kurum adı');
        $password = self::checkPassword($password, $email);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        // E-posta gönderimi ayarlı değilse doğrulama istenmez (hesap doğrulanmış sayılır).
        $verifiedAt = $this->settings->verificationOn() ? null : FocusCore::now();
        try {
            $this->db->prepare('INSERT INTO users (email, name, organization, password_hash, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$email, $name, $organization, $hash, $verifiedAt, FocusCore::now()]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new FocusError('email_taken', 409, 'Bu e-postayla zaten bir hesap var. Giriş yapmayı deneyin.', 'email');
            }
            throw $e;
        }
        $id = (int)$this->db->lastInsertId();
        FocusCore::audit($id, 'register');
        return $id;
    }

    /** Başarılıysa kullanıcı satırını döndürür. Hata mesajı hangi alanın yanlış olduğunu söylemez. */
    public function login(mixed $email, mixed $password): array
    {
        $generic = new FocusError('bad_credentials', 401, 'E-posta veya şifre hatalı.');
        try {
            $email = self::cleanEmail($email);
        } catch (FocusError) {
            throw $generic;
        }
        if (!is_string($password) || $password === '' || strlen($password) > 128) {
            throw $generic;
        }
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) {
            password_verify($password, self::DUMMY_HASH);
            throw $generic;
        }
        if ($user['locked_until'] !== null && strtotime($user['locked_until'] . ' UTC') > time()) {
            throw new FocusError('locked', 423, 'Çok sayıda hatalı deneme nedeniyle hesap geçici olarak kilitlendi. 15 dakika sonra tekrar deneyin.');
        }
        if ($user['password_hash'] === null || !password_verify($password, $user['password_hash'])) {
            if ($user['password_hash'] === null) {
                password_verify($password, self::DUMMY_HASH);
            }
            $fails = (int)$user['failed_logins'] + 1;
            $lock = $fails >= self::MAX_FAILED_LOGINS ? gmdate('Y-m-d H:i:s', time() + 900) : null;
            $this->db->prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
                ->execute([$lock ? 0 : $fails, $lock, $user['id']]);
            FocusCore::audit((int)$user['id'], $lock ? 'login_locked' : 'login_failed');
            throw $generic;
        }
        $rehash = password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT) ? password_hash($password, PASSWORD_DEFAULT) : $user['password_hash'];
        $this->db->prepare('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ?, password_hash = ? WHERE id = ?')
            ->execute([FocusCore::now(), $rehash, $user['id']]);
        FocusCore::audit((int)$user['id'], 'login');
        return $user;
    }

    public function user(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, email, name, organization, role, session_version, created_at, last_login_at, email_verified_at, trial_until,
                                           google_sub IS NOT NULL AS google, password_hash IS NOT NULL AS has_password FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function changePassword(int $userId, mixed $current, mixed $new): void
    {
        $stmt = $this->db->prepare('SELECT email, password_hash FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        // Yalnızca Google ile açılmış ve henüz şifresi olmayan hesap, mevcut şifre olmadan şifre belirleyebilir.
        if (!$row || ($row['password_hash'] !== null && (!is_string($current) || !password_verify($current, $row['password_hash'])))) {
            throw new FocusError('bad_credentials', 401, 'Mevcut şifre hatalı.', 'current');
        }
        $new = self::checkPassword($new, $row['email']);
        // Oturum sürümü artar: diğer cihazlardaki oturumlar kapanır.
        $this->db->prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $userId]);
        FocusCore::audit($userId, 'password_changed');
    }

    public function deleteAccount(int $userId, mixed $password): void
    {
        $stmt = $this->db->prepare('SELECT password_hash, role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if ($row && $row['role'] === 'admin' && $this->adminCount() <= 1) {
            throw new FocusError('last_admin', 409, 'Tek yönetici hesabı silinemez.');
        }
        $hash = $row ? $row['password_hash'] : null;
        $ok = $row && ($hash === null ? $password === 'SİL' : (is_string($password) && password_verify($password, $hash)));
        if (!$ok) {
            throw new FocusError('bad_credentials', 401, $hash === null && $row ? 'Onaylamak için kutuya SİL yazın.' : 'Şifre hatalı.', 'password');
        }
        $this->db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        FocusCore::audit(null, 'account_deleted', 'user#' . $userId);
    }

    // ---------- E-posta doğrulama ----------

    private function codeHash(int $userId, string $code): string
    {
        return hash_hmac('sha256', $userId . '|' . $code, FocusCore::config()['app_secret']);
    }

    /** 6 haneli kod üretir, yalnızca özetini saklar ve e-postayla gönderir. */
    public function issueCode(int $userId): void
    {
        $user = $this->user($userId);
        if (!$user) {
            throw new FocusError('not_found', 404, 'Hesap bulunamadı.');
        }
        if ($user['email_verified_at'] !== null) {
            throw new FocusError('already_verified', 409, 'E-posta zaten doğrulandı.');
        }
        $last = $this->db->prepare('SELECT sent_at FROM email_codes WHERE user_id = ?');
        $last->execute([$userId]);
        $sentAt = $last->fetchColumn();
        if ($sentAt && strtotime($sentAt . ' UTC') > time() - 60) {
            throw new FocusError('code_too_soon', 429, 'Yeni kod için bir dakika bekleyin.');
        }
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $this->db->prepare('REPLACE INTO email_codes (user_id, code_hash, expires_at, attempts, sent_at) VALUES (?, ?, ?, 0, ?)')
            ->execute([$userId, $this->codeHash($userId, $code), gmdate('Y-m-d H:i:s', time() + 900), FocusCore::now()]);
        (new FocusMailer($this->settings))->sendCode($user['email'], $user['name'], $code);
        FocusCore::audit($userId, 'verify_code_sent');
    }

    public function verifyCode(int $userId, mixed $code): void
    {
        $code = is_string($code) ? trim($code) : '';
        if (!preg_match('/^[0-9]{6}$/', $code)) {
            throw new FocusError('bad_code', 422, 'Kod 6 haneli olmalı.', 'code');
        }
        $stmt = $this->db->prepare('SELECT * FROM email_codes WHERE user_id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row || strtotime($row['expires_at'] . ' UTC') < time() || (int)$row['attempts'] >= 5) {
            throw new FocusError('code_expired', 410, 'Kodun süresi doldu. Yeni kod isteyin.', 'code');
        }
        if (!hash_equals($row['code_hash'], $this->codeHash($userId, $code))) {
            $this->db->prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE user_id = ?')->execute([$userId]);
            throw new FocusError('bad_code', 422, 'Kod hatalı.', 'code');
        }
        $this->db->prepare('UPDATE users SET email_verified_at = ? WHERE id = ?')->execute([FocusCore::now(), $userId]);
        $this->db->prepare('DELETE FROM email_codes WHERE user_id = ?')->execute([$userId]);
        FocusCore::audit($userId, 'email_verified');
    }

    // ---------- Google ile giriş ----------

    /** Doğrulanmış Google kimliğiyle kullanıcıyı bulur, mevcut hesaba bağlar ya da yeni hesap açar. */
    public function googleLogin(array $g): array
    {
        $find = function (string $column, string $value): ?array {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE $column = ?");
            $stmt->execute([$value]);
            return $stmt->fetch() ?: null;
        };
        $user = $find('google_sub', $g['sub']);
        if (!$user) {
            $user = $find('email', $g['email']);
            if ($user) {
                // Google bu e-postanın sahibini doğruladı: hesabı bağla ve e-postayı doğrulanmış say.
                $this->db->prepare('UPDATE users SET google_sub = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')
                    ->execute([$g['sub'], FocusCore::now(), $user['id']]);
                FocusCore::audit((int)$user['id'], 'google_linked');
            } else {
                $name = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $g['name']) ?? '');
                $name = mb_substr($name !== '' ? $name : explode('@', $g['email'])[0], 0, 80);
                $this->db->prepare('INSERT INTO users (email, name, password_hash, google_sub, email_verified_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)')
                    ->execute([$g['email'], $name, $g['sub'], FocusCore::now(), FocusCore::now()]);
                FocusCore::audit((int)$this->db->lastInsertId(), 'register_google');
            }
            $user = $find('google_sub', $g['sub']);
        }
        $this->db->prepare('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?')->execute([FocusCore::now(), $user['id']]);
        FocusCore::audit((int)$user['id'], 'login_google');
        return $user;
    }

    // ---------- Abonelik ----------

    /** Süresi geçmiş abonelikleri kapatır (zamanlanmış görev gerekmez; her okumada çalışır). */
    private function expire(int $userId): void
    {
        $this->db->prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active' AND period_end <= ?")
            ->execute([$userId, FocusCore::now()]);
    }

    public function activeSubscription(int $userId): ?array
    {
        $this->expire($userId);
        $stmt = $this->db->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY period_end DESC LIMIT 1");
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function pendingSubscription(int $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function requestSubscription(int $userId, mixed $planId, mixed $billing): array
    {
        if (!$this->settings->subscriptionsEnabled()) {
            throw new FocusError('subscriptions_closed', 403, 'Ücretli paketler şu an kapalı. Deneme hesabı ücretsiz kullanılabilir.');
        }
        $plan = is_string($planId) ? FocusPlans::get($planId) : null;
        if (!$plan || !$plan['paid'] || !in_array($billing, ['month', 'year'], true)) {
            throw new FocusError('invalid_plan', 422, 'Geçerli bir paket ve ödeme dönemi seçin.');
        }
        if ($this->pendingSubscription($userId)) {
            throw new FocusError('pending_exists', 409, 'Onay bekleyen bir talebiniz var. Önce onu iptal edin.');
        }
        $active = $this->activeSubscription($userId);
        if ($active && $active['plan_id'] === $plan['id'] && !$active['cancel_at_period_end']) {
            throw new FocusError('already_active', 409, 'Bu paket zaten etkin.');
        }
        $reference = 'FOC-' . strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));
        $this->db->prepare("INSERT INTO subscriptions (user_id, plan_id, billing, status, reference, amount_cents, created_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)")
            ->execute([$userId, $plan['id'], $billing, $reference, FocusPlans::price($plan['id'], $billing), FocusCore::now()]);
        FocusCore::audit($userId, 'subscription_requested', $plan['id'] . '/' . $billing . ' ' . $reference);
        return $this->pendingSubscription($userId);
    }

    public function cancelPending(int $userId): void
    {
        $stmt = $this->db->prepare("UPDATE subscriptions SET status = 'cancelled', decided_at = ? WHERE user_id = ? AND status = 'pending'");
        $stmt->execute([FocusCore::now(), $userId]);
        if ($stmt->rowCount() === 0) {
            throw new FocusError('not_found', 404, 'İptal edilecek bekleyen talep yok.');
        }
        FocusCore::audit($userId, 'subscription_request_cancelled');
    }

    /** Etkin aboneliği dönem sonunda bitirir; kalan süre kullanılabilir. */
    public function cancelActive(int $userId): void
    {
        $active = $this->activeSubscription($userId);
        if (!$active) {
            throw new FocusError('not_found', 404, 'Etkin ücretli abonelik yok.');
        }
        $this->db->prepare('UPDATE subscriptions SET cancel_at_period_end = 1 WHERE id = ?')->execute([$active['id']]);
        FocusCore::audit($userId, 'subscription_cancelled', (string)$active['reference']);
    }

    // ---------- Kota ----------

    /** Kullanıcının geçerli paketini ve kalan hakkını hesaplar. */
    public function entitlement(int $userId): array
    {
        $user = $this->user($userId);
        $utc = new DateTimeZone('UTC');
        $now = new DateTimeImmutable('now', $utc);
        $isAdmin = $user['role'] === 'admin';
        $active = $isAdmin ? null : $this->activeSubscription($userId);
        $plan = FocusPlans::get($isAdmin ? 'admin' : ($active ? $active['plan_id'] : 'trial'));
        $trialEnd = $user['trial_until'] !== null
            ? new DateTimeImmutable($user['trial_until'], $utc)
            : (new DateTimeImmutable((string)$user['created_at'], $utc))->modify('+' . $this->settings->trialHours() . ' hours');
        $trialActive = !$isAdmin && !$active && $trialEnd > $now;
        if ($active || $isAdmin) {
            // Aylık hak, dönem başlangıcından itibaren her ay yenilenir.
            $start = new DateTimeImmutable($active ? $active['period_start'] : (string)$user['created_at'], $utc);
            $months = 0;
            while ($start->modify('+' . ($months + 1) . ' month') <= $now) {
                $months++;
            }
            $windowStart = $start->modify('+' . $months . ' month');
            $windowEnd = $start->modify('+' . ($months + 1) . ' month');
            $limit = (int)$plan['monthly'];
            $unit = 'month';
        } else {
            $localMidnight = new DateTimeImmutable('today', FocusCore::timezone());
            $windowStart = $localMidnight->setTimezone($utc);
            $windowEnd = $localMidnight->modify('+1 day')->setTimezone($utc);
            $limit = $trialActive ? (int)$plan['daily'] : 0;
            $unit = 'day';
        }
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM usage_events WHERE user_id = ? AND created_at >= ? AND created_at < ?');
        $stmt->execute([$userId, $windowStart->format('Y-m-d H:i:s'), $windowEnd->format('Y-m-d H:i:s')]);
        $used = (int)$stmt->fetchColumn();
        $hasPlan = $isAdmin || $active || $trialActive;
        return [
            'plan' => $hasPlan ? $plan['id'] : 'none',
            'plan_name' => $hasPlan ? $plan['name'] : 'Paket yok',
            'trial_active' => $trialActive,
            'trial_ends_at' => ($active || $isAdmin) ? null : $trialEnd->format(DATE_ATOM),
            'verified' => $user['email_verified_at'] !== null,
            'max_hours' => $plan['max_hours'],
            'limit' => $limit,
            'used' => $used,
            'remaining' => max(0, $limit - $used),
            'period' => $unit,
            'resets_at' => $windowEnd->format(DATE_ATOM),
            'subscription' => $active ? [
                'reference' => $active['reference'],
                'billing' => $active['billing'],
                'period_end' => (new DateTimeImmutable($active['period_end'], $utc))->format(DATE_ATOM),
                'cancel_at_period_end' => (bool)$active['cancel_at_period_end'],
            ] : null,
        ];
    }

    /**
     * Bir tahmin hakkı kullanır. Aynı request_id ile tekrar çağrılırsa ikinci kez düşmez.
     * Kullanıcı satırı kilitlenir; eşzamanlı isteklerle kota aşılamaz.
     */
    public function consume(int $userId, mixed $hours, mixed $requestId): array
    {
        if (!is_int($hours) || !in_array($hours, FocusPlans::ENGINE_HORIZONS, true)) {
            throw new FocusError('invalid_hours', 422, 'Tahmin ufku 6, 12 veya 24 saat olmalı.');
        }
        if (!is_string($requestId) || !preg_match('/^[a-f0-9]{32}$/', $requestId)) {
            throw new FocusError('invalid_request', 422, 'Geçersiz istek kimliği.');
        }
        $this->db->beginTransaction();
        try {
            $this->db->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE')->execute([$userId]);
            $dup = $this->db->prepare('SELECT 1 FROM usage_events WHERE user_id = ? AND request_id = ?');
            $dup->execute([$userId, $requestId]);
            if ($dup->fetchColumn()) {
                $this->db->commit();
                return ['allowed' => true, 'repeated' => true] + $this->entitlement($userId);
            }
            $e = $this->entitlement($userId);
            if (!$e['verified']) {
                throw new FocusError('email_unverified', 403, 'Tahmin için önce e-posta adresinizi doğrulayın. Kodu hesap sayfasından girebilirsiniz.');
            }
            if ($e['plan'] === 'none') {
                throw new FocusError('trial_ended', 403, 'Ücretsiz deneme süreniz bitti. Süre uzatma için FOCUS ekibine yazın.');
            }
            if ($hours > $e['max_hours']) {
                throw new FocusError('horizon_not_included', 403, $e['plan_name'] . " paketi en çok {$e['max_hours']} saatlik tahmin içerir.");
            }
            if ($e['remaining'] <= 0) {
                throw new FocusError('quota_exhausted', 403, $e['period'] === 'day'
                    ? 'Bugünkü tahmin hakkınız bitti. Yarın yenilenir.'
                    : 'Bu ayki tahmin hakkınız bitti. Bir sonraki dönemde yenilenir.');
            }
            $this->db->prepare('INSERT INTO usage_events (user_id, request_id, hours, plan_id, created_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$userId, $requestId, $hours, $e['plan'], FocusCore::now()]);
            $this->db->commit();
        } catch (Throwable $t) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $t;
        }
        return ['allowed' => true, 'repeated' => false] + $this->entitlement($userId);
    }

    // ---------- Yönetici ----------

    public function adminCount(): int
    {
        return (int)$this->db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    }

    /** İlk yönetici hesabı: yalnızca hiç yönetici yokken ve yapılandırmadaki kurulum anahtarı doğruysa. */
    public function setupAdmin(mixed $token, mixed $email, mixed $name, mixed $password): int
    {
        $expected = (string)(FocusCore::config()['setup_token'] ?? '');
        if (strlen($expected) < 24 || str_starts_with($expected, 'DEGISTIRIN') || !is_string($token) || !hash_equals($expected, $token)) {
            FocusCore::audit(null, 'admin_setup_denied');
            throw new FocusError('bad_setup_token', 403, 'Kurulum anahtarı hatalı.', 'token');
        }
        if ($this->adminCount() > 0) {
            throw new FocusError('admin_exists', 409, 'Yönetici hesabı zaten var.');
        }
        $email = self::cleanEmail($email);
        if (!is_string($password) || strlen($password) < 16) {
            throw new FocusError('weak_password', 422, 'Yönetici şifresi en az 16 karakter olmalı.', 'password');
        }
        self::checkPassword($password, $email);
        $existing = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $existing->execute([$email]);
        $id = $existing->fetchColumn();
        if ($id) {
            $this->db->prepare("UPDATE users SET role = 'admin', password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), session_version = session_version + 1 WHERE id = ?")
                ->execute([password_hash($password, PASSWORD_DEFAULT), FocusCore::now(), $id]);
            $id = (int)$id;
        } else {
            $id = $this->register($email, $name, 'FOCUS', $password);
            $this->db->prepare("UPDATE users SET role = 'admin', email_verified_at = ? WHERE id = ?")->execute([FocusCore::now(), $id]);
        }
        FocusCore::audit($id, 'admin_created');
        return $id;
    }

    /** Yönetici paneli kullanıcı listesi: kullanım, son giriş ve paket bilgisi. */
    public function listUsers(): array
    {
        $stmt = $this->db->prepare(
            "SELECT u.id, u.email, u.name, u.organization, u.role, u.created_at, u.last_login_at, u.email_verified_at, u.trial_until,
                    u.google_sub IS NOT NULL AS google,
                    (SELECT COUNT(*) FROM usage_events e WHERE e.user_id = u.id) AS uses_total,
                    (SELECT COUNT(*) FROM usage_events e WHERE e.user_id = u.id AND e.created_at >= ?) AS uses_30d,
                    (SELECT MAX(e.created_at) FROM usage_events e WHERE e.user_id = u.id) AS last_use_at,
                    (SELECT CONCAT(s.plan_id, '|', s.period_end) FROM subscriptions s
                       WHERE s.user_id = u.id AND s.status = 'active' AND s.period_end > UTC_TIMESTAMP() ORDER BY s.period_end DESC LIMIT 1) AS active_sub
             FROM users u ORDER BY u.created_at DESC LIMIT 1000");
        $stmt->execute([gmdate('Y-m-d H:i:s', time() - 30 * 86400)]);
        $hours = $this->settings->trialHours();
        $now = time();
        return array_map(static function (array $u) use ($hours, $now): array {
            $trialEnd = $u['trial_until'] ?? gmdate('Y-m-d H:i:s', strtotime($u['created_at'] . ' UTC') + $hours * 3600);
            [$plan, $end] = $u['active_sub'] ? explode('|', $u['active_sub']) : [null, null];
            $u['plan'] = $u['role'] === 'admin' ? 'admin' : ($plan ?? (strtotime($trialEnd . ' UTC') > $now ? 'trial' : 'none'));
            $u['plan_end'] = $u['role'] === 'admin' ? null : ($end ?? $trialEnd);
            unset($u['active_sub'], $u['trial_until']);
            foreach (['id', 'google', 'uses_total', 'uses_30d'] as $k) {
                $u[$k] = (int)$u[$k];
            }
            return $u;
        }, $stmt->fetchAll());
    }

    /** Yönetici işlemleri: deneme süresini uzatma, paket verme/geri alma, e-postayı doğrulanmış sayma. */
    public function adminUpdateUser(int $adminId, mixed $userId, mixed $action, mixed $value): void
    {
        if (!is_int($userId) || !$this->user($userId)) {
            throw new FocusError('not_found', 404, 'Kullanıcı bulunamadı.');
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        switch ($action) {
            case 'trial':
                if (!is_int($value) || $value < 0 || $value > 24 * 365) {
                    throw new FocusError('invalid_value', 422, 'Saat 0 ile 8760 arasında olmalı.');
                }
                $this->db->prepare('UPDATE users SET trial_until = ? WHERE id = ?')->execute([$now->modify("+$value hours")->format('Y-m-d H:i:s'), $userId]);
                break;
            case 'grant':
                $plan = is_array($value) ? FocusPlans::get((string)($value['plan'] ?? '')) : null;
                $months = is_array($value) ? ($value['months'] ?? null) : null;
                if (!$plan || !$plan['paid'] || !is_int($months) || $months < 1 || $months > 36) {
                    throw new FocusError('invalid_value', 422, 'Geçerli bir paket ve 1–36 ay seçin.');
                }
                $this->db->prepare("UPDATE subscriptions SET status = 'expired', period_end = ? WHERE user_id = ? AND status = 'active'")
                    ->execute([$now->format('Y-m-d H:i:s'), $userId]);
                $this->db->prepare("INSERT INTO subscriptions (user_id, plan_id, billing, status, reference, amount_cents, period_start, period_end, created_at, decided_at, decided_by)
                                    VALUES (?, ?, 'month', 'active', ?, 0, ?, ?, ?, ?, ?)")
                    ->execute([$userId, $plan['id'], 'ADM-' . strtoupper(bin2hex(random_bytes(4))), $now->format('Y-m-d H:i:s'),
                        $now->modify("+$months month")->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s'), $adminId]);
                break;
            case 'revoke':
                $this->db->prepare("UPDATE subscriptions SET status = 'expired', period_end = ? WHERE user_id = ? AND status = 'active'")
                    ->execute([$now->format('Y-m-d H:i:s'), $userId]);
                break;
            case 'verify':
                $this->db->prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')->execute([$now->format('Y-m-d H:i:s'), $userId]);
                break;
            default:
                throw new FocusError('invalid_request', 422, 'Geçersiz işlem.');
        }
        FocusCore::audit($adminId, 'admin_user_' . $action, 'user#' . $userId);
    }

    public function listSubscriptions(string $status): array
    {
        if (!in_array($status, ['pending', 'active', 'all'], true)) {
            throw new FocusError('invalid_filter', 422, 'Geçersiz filtre.');
        }
        $sql = 'SELECT s.id, s.plan_id, s.billing, s.status, s.reference, s.amount_cents, s.period_start, s.period_end, s.cancel_at_period_end, s.created_at, u.email, u.name, u.organization
                FROM subscriptions s JOIN users u ON u.id = s.user_id';
        $sql .= $status === 'all' ? ' ORDER BY s.id DESC LIMIT 200' : ' WHERE s.status = ? ORDER BY s.id DESC LIMIT 200';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($status === 'all' ? [] : [$status]);
        return $stmt->fetchAll();
    }

    public function decide(int $adminId, mixed $subscriptionId, mixed $decision): void
    {
        if (!is_int($subscriptionId) || !in_array($decision, ['approve', 'reject'], true)) {
            throw new FocusError('invalid_request', 422, 'Geçersiz karar.');
        }
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT * FROM subscriptions WHERE id = ? AND status = 'pending' FOR UPDATE");
            $stmt->execute([$subscriptionId]);
            $sub = $stmt->fetch();
            if (!$sub) {
                throw new FocusError('not_found', 404, 'Bekleyen talep bulunamadı; başka bir yönetici karar vermiş olabilir.');
            }
            $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            if ($decision === 'approve') {
                $this->db->prepare("UPDATE subscriptions SET status = 'expired', period_end = ? WHERE user_id = ? AND status = 'active'")
                    ->execute([$now->format('Y-m-d H:i:s'), $sub['user_id']]);
                $end = $now->modify($sub['billing'] === 'year' ? '+1 year' : '+1 month');
                $this->db->prepare("UPDATE subscriptions SET status = 'active', period_start = ?, period_end = ?, decided_at = ?, decided_by = ? WHERE id = ?")
                    ->execute([$now->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s'), $adminId, $sub['id']]);
            } else {
                $this->db->prepare("UPDATE subscriptions SET status = 'rejected', decided_at = ?, decided_by = ? WHERE id = ?")
                    ->execute([$now->format('Y-m-d H:i:s'), $adminId, $sub['id']]);
            }
            $this->db->commit();
        } catch (Throwable $t) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $t;
        }
        FocusCore::audit($adminId, 'subscription_' . $decision, (string)$sub['reference']);
    }
}
