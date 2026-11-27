<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * Sunucu tarafı paket tanımları. Hak ve fiyatın tek yetkili kaynağı burasıdır;
 * sayfalardaki fiyatlar bu değerlerle aynı tutulmalıdır.
 * Tutarlar Türk lirası kuruş cinsinden tam sayıdır. Yıllık ödeme = 10 aylık ücret.
 * Yeni hesaplar ücretsiz deneme alır; süresi yönetici panelinden ayarlanır (varsayılan 24 saat).
 */
final class FocusPlans
{
    public const ENGINE_HORIZONS = [6, 12, 24];
    public const CURRENCY = 'TRY';

    public static function all(): array
    {
        return [
            'trial' => ['id' => 'trial', 'name' => 'Ücretsiz deneme', 'max_hours' => 24, 'daily' => 10, 'monthly' => null, 'month_cents' => 0, 'paid' => false],
            // Kullandıkça öde: aylık ücret yok, tahmin başına ödeme (ödeme altyapısı açılınca satın alınır).
            'payg' => ['id' => 'payg', 'name' => 'Kullandıkça öde', 'max_hours' => 24, 'daily' => null, 'monthly' => null, 'month_cents' => 0, 'per_forecast_cents' => 500, 'paid' => false],
            'team' => ['id' => 'team', 'name' => 'Ekip', 'max_hours' => 24, 'daily' => null, 'monthly' => 500, 'month_cents' => 44900, 'paid' => true],
            // Kurum: 72 saate kadar ufuk hakkı; çalışan motor bugün 24 saate kadar hesaplar.
            'institution' => ['id' => 'institution', 'name' => 'Kurum', 'max_hours' => 72, 'daily' => null, 'monthly' => 2000, 'month_cents' => 129900, 'paid' => true],
            // Yönetici hesabı: en üst paket, satılmaz.
            'admin' => ['id' => 'admin', 'name' => 'Yönetici (Kurum)', 'max_hours' => 72, 'daily' => null, 'monthly' => 100000, 'month_cents' => 0, 'paid' => false],
        ];
    }

    public static function get(string $id): ?array
    {
        return self::all()[$id] ?? null;
    }

    public static function price(string $id, string $billing): int
    {
        $plan = self::get($id);
        if (!$plan || !$plan['paid'] || !in_array($billing, ['month', 'year'], true)) {
            throw new InvalidArgumentException('plan');
        }
        return $billing === 'year' ? $plan['month_cents'] * 10 : $plan['month_cents'];
    }
}
