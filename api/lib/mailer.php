<?php
declare(strict_types=1);
defined('FOCUS_API') || exit;

/**
 * Küçük SMTP istemcisi (SSL, AUTH LOGIN). Gmail için: smtp.gmail.com, 465,
 * kullanıcı = Gmail adresi, şifre = Google hesabında oluşturulan 16 haneli "uygulama şifresi".
 * Harici kütüphane gerektirmez.
 */
final class FocusMailer
{
    public function __construct(private FocusSettings $settings)
    {
    }

    public function sendCode(string $to, string $name, string $code): void
    {
        $vars = ['{kod}' => $code, '{ad}' => $name, '{eposta}' => $to];
        $this->send($to, strtr($this->settings->get('mail_subject'), $vars), strtr($this->settings->get('mail_body'), $vars));
    }

    public function send(string $to, string $subject, string $body): void
    {
        if (!$this->settings->mailConfigured()) {
            throw new FocusError('mail_not_configured', 503, 'E-posta gönderimi henüz ayarlanmadı.');
        }
        $host = $this->settings->get('smtp_host');
        $port = (int)$this->settings->get('smtp_port') ?: 465;
        $user = $this->settings->get('smtp_user');
        $from = $this->settings->get('mail_from') ?: $user;
        $fromName = $this->settings->get('mail_from_name') ?: 'FOCUS';
        foreach ([$to, $from] as $address) {
            if (filter_var($address, FILTER_VALIDATE_EMAIL) === false || preg_match('/[\r\n]/', $address)) {
                throw new FocusError('mail_bad_address', 422, 'Geçersiz e-posta adresi.');
            }
        }
        $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host]]);
        $target = ($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $socket = @stream_socket_client($target, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
        if (!$socket) {
            error_log("FOCUS smtp connect failed: $errno $errstr");
            throw new FocusError('mail_failed', 502, 'E-posta sunucusuna bağlanılamadı. Ayarları kontrol edin.');
        }
        stream_set_timeout($socket, 15);
        try {
            $this->expect($socket, 220);
            $this->command($socket, 'EHLO focus', 250);
            if ($port !== 465) {
                $this->command($socket, 'STARTTLS', 220);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
                    throw new RuntimeException('starttls');
                }
                $this->command($socket, 'EHLO focus', 250);
            }
            $this->command($socket, 'AUTH LOGIN', 334);
            $this->command($socket, base64_encode($user), 334);
            $this->command($socket, base64_encode($this->settings->get('smtp_pass')), 235, true);
            $this->command($socket, 'MAIL FROM:<' . $from . '>', 250);
            $this->command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
            $this->command($socket, 'DATA', 354);
            $headers = [
                'From: ' . $this->encodeHeader($fromName) . ' <' . $from . '>',
                'To: <' . $to . '>',
                'Subject: ' . $this->encodeHeader($subject),
                'Date: ' . date(DATE_RFC2822),
                'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@'), 1) . '>',
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
            ];
            $message = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode(str_replace("\n", "\r\n", str_replace("\r\n", "\n", $body))));
            fwrite($socket, $message . "\r\n.\r\n");
            $this->expect($socket, 250);
            fwrite($socket, "QUIT\r\n");
        } catch (FocusError $e) {
            throw $e;
        } catch (Throwable $e) {
            error_log('FOCUS smtp failed: ' . $e->getMessage());
            throw new FocusError('mail_failed', 502, 'E-posta gönderilemedi. Gmail adresini ve uygulama şifresini kontrol edin.');
        } finally {
            fclose($socket);
        }
    }

    private function encodeHeader(string $text): string
    {
        $text = preg_replace('/[\r\n]+/', ' ', $text);
        return '=?UTF-8?B?' . base64_encode($text) . '?=';
    }

    private function command($socket, string $line, int|array $expect, bool $secret = false): void
    {
        fwrite($socket, $line . "\r\n");
        $this->expect($socket, $expect, $secret ? 'AUTH' : strtok($line, ' :'));
    }

    private function expect($socket, int|array $codes, string $step = 'greeting'): void
    {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        $code = (int)substr($response, 0, 3);
        if (!in_array($code, (array)$codes, true)) {
            throw new RuntimeException("$step -> $code");
        }
    }
}
