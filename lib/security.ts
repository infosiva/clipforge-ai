/**
 * lib/security.ts — Reusable API security middleware
 *
 * Provides:
 *   1. Rate limiting per IP (configurable per route)
 *   2. IP ban list (auto-bans IPs that hit abuse thresholds)
 *   3. Suspicious pattern detection (scanner tools, path traversal, SQLi probes)
 *   4. Admin alert via Telegram when abuse is detected
 *   5. Circuit breaker — blocks an IP entirely after N violations
 *
 * Usage (Express):
 *   import { createSecurityMiddleware } from '@/lib/security'
 *   const security = createSecurityMiddleware({ alertWebhook: process.env.TELEGRAM_ALERT_URL })
 *   app.use(security.detectAbuse)
 *   app.use('/api/ai', security.rateLimit({ max: 20, windowMs: 60_000 }))
 *
 * Lesson from NinjaPA / tracker-api (2026-05): basic rate-limit alone isn't enough —
 * you need to detect, ban, and alert so you know when you're under attack.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
interface SecurityConfig {
  /** Telegram Bot API URL for admin alerts, e.g. https://api.telegram.org/bot<token>/sendMessage */
  alertWebhook?: string;
  /** Telegram chat ID to send alerts to (admin) */
  alertChatId?: string;
  /** How many violations before an IP is banned (default: 10) */
  banThreshold?: number;
  /** How long a ban lasts in ms (default: 24h) */
  banDurationMs?: number;
}

interface IpRecord {
  count:      number;   // request count in current window
  violations: number;   // cumulative abuse score
  bannedUntil?: number; // epoch ms
  lastSeen:   number;   // epoch ms
}

// ── Suspicious patterns — things no legitimate user sends ─────────────────────
const SUSPICIOUS_PATHS = [
  /\.\.\//,                         // path traversal
  /\/etc\/passwd/,
  /\/proc\//,
  /\.(php|asp|aspx|jsp|cgi)$/i,     // probing for old tech stacks
  /wp-admin|wp-login|xmlrpc/i,       // WordPress scanners
  /\.git\//,                         // git exposure check
  /\/admin\/|\/phpmyadmin/i,
  /union.*select|select.*from|drop.*table/i,  // SQLi
  /<script|javascript:/i,            // XSS probes
  /\$\{.*\}|\{\{.*\}\}/,            // template injection
];

const SUSPICIOUS_UA = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /python-requests\/[01]\./i,  // old Python scrapers commonly used in attacks
  /go-http-client\/1/i,
  /curl\/[67]\./ ,             // specific curl versions used in scan scripts — not all curl
];

// ── In-memory IP store (resets on restart — fine for abuse detection) ─────────
// For persistent bans across restarts, persist to a file or DB in your project.
const ipStore = new Map<string, IpRecord>();

function getIp(req: any): string {
  // Trust X-Forwarded-For from reverse proxies (nginx, Cloudflare)
  // Only use first IP — attackers can forge later entries
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (forwarded as string).split(',')[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
}

function getRecord(ip: string): IpRecord {
  if (!ipStore.has(ip)) {
    ipStore.set(ip, { count: 0, violations: 0, lastSeen: Date.now() });
  }
  return ipStore.get(ip)!;
}

// ── Admin Telegram alert ──────────────────────────────────────────────────────
async function sendAlert(config: SecurityConfig, message: string): Promise<void> {
  if (!config.alertWebhook || !config.alertChatId) return;
  try {
    await fetch(config.alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.alertChatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch {
    // Never crash the app over an alert failure
  }
}

// ── Main factory ──────────────────────────────────────────────────────────────
export function createSecurityMiddleware(config: SecurityConfig = {}) {
  const BAN_DURATION = config.banDurationMs ?? 24 * 60 * 60 * 1000; // 24h

  function banIp(ip: string, record: IpRecord) {
    record.bannedUntil = Date.now() + BAN_DURATION;
    console.warn(`[security] BANNED: ${ip} until ${new Date(record.bannedUntil).toISOString()}`);
  }

  /**
   * detectAbuse — mount app-wide BEFORE all routes.
   *
   * Rule: ban first, alert second — IP is blocked before the alert is sent,
   * so there is zero window where the attacker can keep hitting while you read the message.
   *
   * Suspicious paths and scanner UAs → immediate 24h ban on first hit.
   */
  function detectAbuse(req: any, res: any, next: () => void) {
    const ip     = getIp(req);
    const record = getRecord(ip);
    record.lastSeen = Date.now();

    // Already banned?
    if (record.bannedUntil) {
      if (Date.now() < record.bannedUntil) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      // Expired — reset and let through
      record.bannedUntil = undefined;
      record.violations  = 0;
    }

    const path = req.path ?? req.url ?? '';
    const ua   = req.headers['user-agent'] ?? '';

    // Suspicious path → immediate ban, no second chance
    if (SUSPICIOUS_PATHS.some(p => p.test(path))) {
      record.violations++;
      banIp(ip, record); // ban first
      sendAlert(config,   // alert after — IP already blocked
        `🚨 *IP Banned*\nIP: \`${ip}\`\nReason: suspicious path\n` +
        `Path: \`${path.slice(0, 100)}\`\nViolations: ${record.violations}`
      );
      return res.status(404).json({ error: 'Not found' });
    }

    // Scanner user-agent → immediate ban
    if (SUSPICIOUS_UA.some(p => p.test(ua))) {
      record.violations++;
      banIp(ip, record); // ban first
      sendAlert(config,   // alert after
        `🚨 *Scanner Banned*\nIP: \`${ip}\`\nUA: \`${ua.slice(0, 100)}\`\nViolations: ${record.violations}`
      );
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  }

  /**
   * rateLimit — mount per-route.
   * Bans after RATE_BAN_THRESHOLD violations (default 5).
   * Ban is set before the alert fires — attacker is blocked immediately.
   *
   * @param opts.max              Max requests per window (default 60)
   * @param opts.windowMs         Window in ms (default 60s)
   * @param opts.rateBanThreshold Violations before ban (default 5)
   */
  function rateLimit(opts: { max?: number; windowMs?: number; rateBanThreshold?: number } = {}) {
    const MAX       = opts.max              ?? 60;
    const WINDOW    = opts.windowMs         ?? 60_000;
    const RATE_BAN  = opts.rateBanThreshold ?? 5;

    const windows = new Map<string, { count: number; resetAt: number }>();

    return function rateLimitMiddleware(req: any, res: any, next: () => void) {
      const ip  = getIp(req);
      const now = Date.now();

      // Already banned by detectAbuse or previous rate hits
      const record = getRecord(ip);
      if (record.bannedUntil && now < record.bannedUntil) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const win = windows.get(ip);
      if (!win || now > win.resetAt) {
        windows.set(ip, { count: 1, resetAt: now + WINDOW });
        return next();
      }

      win.count++;
      if (win.count > MAX) {
        record.violations++;
        res.setHeader('Retry-After', Math.ceil(WINDOW / 1000));

        if (record.violations >= RATE_BAN) {
          banIp(ip, record); // ban first
          sendAlert(config,   // alert after
            `🚨 *IP Banned (flood)*\nIP: \`${ip}\`\nRoute: \`${req.path}\`\n` +
            `${win.count} req in ${WINDOW / 1000}s\nViolations: ${record.violations}`
          );
        } else {
          // Accumulating but not banned yet — log only, no alert (avoid noise)
          console.warn(`[security] Rate limit: ${ip} ${req.path} — ${win.count} req, violations: ${record.violations}/${RATE_BAN}`);
        }

        return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil(WINDOW / 1000) });
      }

      next();
    };
  }

  /**
   * Returns current ban/violation stats — useful for an admin dashboard endpoint.
   */
  function getStats() {
    const now = Date.now();
    const banned: string[] = [];
    const suspicious: Array<{ ip: string; violations: number }> = [];

    for (const [ip, record] of ipStore.entries()) {
      if (record.bannedUntil && now < record.bannedUntil) {
        banned.push(ip);
      } else if (record.violations > 0) {
        suspicious.push({ ip, violations: record.violations });
      }
    }

    return {
      totalTracked: ipStore.size,
      banned: banned.length,
      suspicious: suspicious.sort((a, b) => b.violations - a.violations).slice(0, 10),
    };
  }

  return { detectAbuse, rateLimit, getStats };
}
