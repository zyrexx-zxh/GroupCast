const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;

function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

/**
 * Format and optionally translate a message for WhatsApp broadcast.
 *
 * @param {string} rawText   - Original message text
 * @param {string} language  - 'none' | 'hindi' | 'english'
 * @returns {Promise<string>} - WhatsApp-markdown-formatted final message
 */
async function formatAndTranslate(rawText, language = 'none') {
  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const langInstruction = language !== 'none'
    ? `\n\nAfter formatting the message, add a divider line "---" and then append a translated version of the ENTIRE message in ${language.charAt(0).toUpperCase() + language.slice(1)}. The translated part should also use WhatsApp markdown formatting.`
    : '';

  const prompt = `You are a WhatsApp message formatter for a professional B2B broadcasting platform.

Your task:
1. Reformat the user's raw message using ONLY WhatsApp markdown syntax:
   - *bold* for important words, headings, or action items
   - _italic_ for dates, times, or emphasis
   - Use line breaks for readability
   - Do NOT use HTML, asterisks for bullets (use • instead), or any other markdown
2. Keep the tone professional but clear.
3. Output ONLY the final formatted message — no explanations, no preamble.${langInstruction}

Raw message:
"""
${rawText}
"""`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return text;
}

module.exports = { formatAndTranslate };
