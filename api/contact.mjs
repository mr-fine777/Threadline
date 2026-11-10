const MAX_LENGTHS = {
  email: 254,
  accessCode: 120,
  subject: 160,
  message: 4000
};

const WEBHOOK_URL = "https://discord.com/api/webhooks/1569775755427184741/K8Lsm64B_H1Rqu9rKBQf6nCm0POxwlrObTvAAOXx-JMergD1-jnIAFTRZg-qWuvmBGwT0";

function respond(status, body, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

function cleanField(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return respond(405, { error: "Please use the contact form to send a message." }, { Allow: "POST" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Please submit the contact form again." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond(400, { error: "Please submit the contact form again." });
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
    return respond(422, { error: "Please check the required fields and try again." });
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
    const deliveryResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactMessage)
    });
    if (!deliveryResponse.ok) {
      const detail = (await deliveryResponse.text()).slice(0, 1000);
      console.error("Contact message delivery rejected", {
        status: deliveryResponse.status,
        detail
      });
      return respond(502, { error: "We couldn't send your message right now. Please try again later." });
    }
  } catch (error) {
    console.error("Contact message delivery request failed", error?.message || "Unknown network error");
    return respond(502, { error: "We couldn't send your message right now. Please try again later." });
  }

  return respond(200, { ok: true });
}
