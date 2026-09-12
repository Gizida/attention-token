import 'server-only';

const resendConfigured = () => Boolean(
  process.env.RESEND_API_KEY?.trim() && process.env.OPERATIONS_ALERT_EMAIL?.trim(),
);

const telegramConfigured = () => Boolean(
  process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
);

async function sendResendAlert(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const to = process.env.OPERATIONS_ALERT_EMAIL!.trim();
  const from = process.env.OPERATIONS_ALERT_FROM?.trim()
    || 'Attention Token <alerts@attentiontoken.net>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(`Resend alert failed with status ${response.status}`);
}

async function sendTelegramAlert(subject: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID!.trim();
  const message = `${subject}\n\n${text}`.slice(0, 4096);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) throw new Error(`Telegram alert failed with status ${response.status}`);
}

export async function sendOperationsAlert(subject: string, text: string): Promise<void> {
  const deliveries: Array<{ channel: string; promise: Promise<void> }> = [];
  if (resendConfigured()) {
    deliveries.push({ channel: 'Resend', promise: sendResendAlert(subject, text) });
  }
  if (telegramConfigured()) {
    deliveries.push({ channel: 'Telegram', promise: sendTelegramAlert(subject, text) });
  }

  if (deliveries.length === 0) {
    console.warn(`Operations alert not delivered (${subject}): no alert channel is configured`);
    return;
  }

  const results = await Promise.allSettled(deliveries.map(({ promise }) => promise));
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [`${deliveries[index].channel}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : []);

  for (const failure of failures) console.error(`Operations alert delivery failed: ${failure}`);
  if (failures.length === deliveries.length) {
    throw new Error(`All operations alert deliveries failed: ${failures.join('; ')}`);
  }
}
