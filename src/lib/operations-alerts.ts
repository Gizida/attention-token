import 'server-only';

export async function sendOperationsAlert(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.OPERATIONS_ALERT_EMAIL?.trim();
  if (!apiKey || !to) {
    console.warn(`Operations alert not delivered (${subject}): Resend is not configured`);
    return;
  }

  const from = process.env.OPERATIONS_ALERT_FROM?.trim() || 'Attention Token <alerts@attentiontoken.net>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(`Resend alert failed with status ${response.status}`);
}
