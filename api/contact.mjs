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
      return jsonResponse(405, { error: "Please use the contact form to send a message." });
    }

    let webhookUrl;
    try {
      webhookUrl = new URL(process.env.DISCORD_CONTACT_WEBHOOK || "");
    } catch {
      return jsonResponse(503, { error: "The contact form is not configured yet. Please try again later." });
    }
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

    const contactMessage = {
      username: "Threadline Contact Form",
      allowed_mentions: { parse: [] },
      embeds: [{
        title: "New Threadline contact message",
        color: 0x382b43,
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
      const deliveryResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactMessage)
      });
      if (!deliveryResponse.ok) {
        const detail = (await deliveryResponse.text()).slice(0, 1000);
        console.error("Contact delivery was rejected", {
          status: deliveryResponse.status,
          detail
        });
        return jsonResponse(502, { error: "We couldn't send your message right now. Please try again later." });
      }
    } catch (error) {
      console.error("Contact delivery request failed", {
        name: error?.name || "Error",
        message: error?.message || "Unknown network error"
      });
      return jsonResponse(502, { error: "We couldn't send your message right now. Please try again later." });
    }

    return jsonResponse(200, { ok: true });
  }
};
