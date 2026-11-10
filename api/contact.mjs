const MAX_LENGTHS = {
  email: 254,
  accessCode: 120,
  subject: 160,
  message: 4000
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanField(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Use the contact form to send a message." });
    }

    const webhookUrl = new URL("https://discord.com/api/webhooks/1569775755427184741/K8Lsm64B_H1Rqu9rKBQf6nCm0POxwlrObTvAAOXx-JMergD1-jnIAFTRZg-qWuvmBGwT0");
    if (
      webhookUrl.protocol !== "https:" ||
      webhookUrl.hostname !== "discord.com" ||
      !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(webhookUrl.pathname)
    ) {
      return jsonResponse(503, { error: "The contact form is not configured yet. Please try again later." });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: "Please submit the contact form again." });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(400, { error: "Please submit the contact form again." });
    }

    const email = cleanField(body.email);
    const accessCode = cleanField(body.accessCode);
    const subject = cleanField(body.subject);
    const message = cleanField(body.message);
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (
      !emailIsValid || email.length > MAX_LENGTHS.email ||
      accessCode.length > MAX_LENGTHS.accessCode ||
      !subject || subject.length > MAX_LENGTHS.subject ||
      !message || message.length > MAX_LENGTHS.message
    ) {
      return jsonResponse(422, { error: "Please check the required fields and try again." });
    }

    const discordMessage = {
      username: "Threadline Contact Form",
      allowed_mentions: { parse: [] },
      embeds: [{
        title: "New Threadline contact message",
        color: 0x44788b,
        description: message,
        fields: [
          { name: "Email", value: email, inline: true },
          { name: "Threadline Access Code", value: accessCode || "Not provided", inline: true },
          { name: "Subject", value: subject, inline: false }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordMessage)
      });
      if (!discordResponse.ok) {
        return jsonResponse(502, { error: "Discord could not receive your message. Please try again later." });
      }
    } catch {
      return jsonResponse(502, { error: "Discord could not receive your message. Please try again later." });
    }

    return jsonResponse(200, { ok: true });
  }
};
