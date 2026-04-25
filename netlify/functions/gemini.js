/* ============================================================
   netlify/functions/gemini.js
   This is the secret middleman function.
   It reads the API key from Netlify's secret locker
   and calls Gemini AI — your key never touches the browser.
   ============================================================ */

exports.handler = async function (event, context) {

  /* Only allow POST requests */
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  /* Read the secret API key from Netlify environment */
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured in Netlify" })
    };
  }

  /* Parse the disease name sent from the website */
  let diseaseName;
  try {
    const body = JSON.parse(event.body);
    diseaseName = body.diseaseName;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request body" })
    };
  }

  /* Build the prompt */
  const prompt = `
You are a helpful, friendly assistant on a plant care website. A home gardener has uploaded a photo and the AI detected their rose plant might have "${diseaseName}".

Write TWO short sections for them:

1. CAUSE: In 2-3 simple sentences, explain what causes ${diseaseName} on rose plants. Use everyday words only. No Latin or scientific terms. Write as if explaining to someone who has never gardened before.

2. TREATMENT: In 3-4 simple sentences, tell them exactly what to do to fix it. Be specific — mention what type of product to look for at a garden shop, what to do with infected leaves, and one habit to prevent it returning.

Reply in EXACTLY this format (no extra text, no markdown):
CAUSE: [your explanation here]
TREATMENT: [your treatment here]
`.trim();

  /* Call Gemini API */
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 350, temperature: 0.65 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini responded with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    /* Parse CAUSE and TREATMENT */
    const causeMatch = text.match(/CAUSE:\s*([\s\S]*?)(?=TREATMENT:|$)/i);
    const treatMatch = text.match(/TREATMENT:\s*([\s\S]*)/i);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cause:     causeMatch ? causeMatch[1].trim() : "Could not load explanation.",
        treatment: treatMatch ? treatMatch[1].trim() : "Please consult a local garden centre."
      })
    };

  } catch (err) {
    console.error("Gemini function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        cause:     "Could not load explanation right now.",
        treatment: "Please consult a local garden centre for advice."
      })
    };
  }
};
