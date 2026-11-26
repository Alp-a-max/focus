"""InfinityFree'ye yüklenecek dosyaları tek bir zip'te toplar.

    python tools/paketle.py      ->  dist/focus-site.zip

Yalnızca sitenin çalışması için gereken dosyalar alınır. Testler, Python modeli,
sunum, Node sunucusu, gizli yapılandırma (config.php) ve geliştirme dosyaları dışarıda kalır.
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "platform.html", "yontem.html", "giris.html", "kayit.html", "hesap.html", "yonetim.html", "gizlilik.html", ".htaccess"]
DIRS = {"css": {".css"}, "js": {".js"}, "assets": {".json", ".svg", ".png", ".jpg", ".webp"},
        "api": {".php", ".sql", ".htaccess"}}
SKIP = {"api/config.php", "focus-config.php"}


def files():
    for name in PAGES:
        yield ROOT / name
    for d, exts in DIRS.items():
        for p in sorted((ROOT / d).rglob("*")):
            rel = p.relative_to(ROOT).as_posix()
            if p.is_file() and rel not in SKIP and (p.suffix in exts or p.name in exts):
                yield p


def main():
    out = ROOT / "dist" / "focus-site.zip"
    out.parent.mkdir(exist_ok=True)
    total = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in files():
            rel = p.relative_to(ROOT).as_posix()
            if p.stat().st_size > 10 * 1024 * 1024:
                raise SystemExit(f"InfinityFree tek dosya sınırı (10 MB) aşıldı: {rel}")
            z.write(p, rel)
            total += 1
    print(f"{total} dosya -> {out}")


if __name__ == "__main__":
    main()
