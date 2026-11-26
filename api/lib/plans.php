<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * Sunucu tarafı paket tanımları. Hak ve fiyatın tek yetkili kaynağı burasıdır;
 * js/plans.js yalnızca gösterim içindir ve bu değerlerle aynı tutulmalıdır.
 * Tutarlar USD sent cinsinden tam sayıdır. Yıllık ödeme = 10 aylık ücret.
 */
final class FocusPlans
{
    public const ENGINE_HORIZONS = [6, 12, 24];

    public static function all(): array
    {
        return [
            'free' => ['id' => 'free', 'name' => 'Ücretsiz', 'max_hours' => 24, 'daily' => 5, 'monthly' => null, 'month_cents' => 0, 'paid' => false],
            'starter' => ['id' => 'starter', 'name' => 'Başlangıç', 'max_hours' => 24, 'daily' => null, 'monthly' => 100, 'month_cents' => 6900, 'paid' => true],
            'professional' => ['id' => 'professional', 'name' => 'Profesyonel', 'max_hours' => 48, 'daily' => null, 'monthly' => 200, 'month_cents' => 27900, 'paid' => true],
            'enterprise' => ['id' => 'enterprise', 'name' => 'Kurumsal', 'max_hours' => 72, 'daily' => null, 'monthly' => 500, 'month_cents' => 99900, 'paid' => true],
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
