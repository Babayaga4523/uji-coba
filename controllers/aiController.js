exports.chat = async (req, res) => {
  try {
    const { message, systemPrompt } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });

    const prompt = (systemPrompt || "Kamu adalah AI asisten admin rental mobil.").trim();

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rental-mobil-ruby.vercel.app",
        "X-Title": "Rental Mobil Admin AI"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message }
        ],
        max_tokens: 1024
      })
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return res.status(502).json({ error: `OpenRouter error: ${resp.status}`, detail });
    }

    const data = await resp.json();
    const aiReply = data.choices?.[0]?.message?.content || "Maaf, AI tidak merespons.";
    res.json({ response: aiReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};