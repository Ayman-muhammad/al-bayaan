import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Al-Bayan AI (البيان), a knowledgeable and respectful Islamic knowledge assistant. Your purpose is to provide accurate answers about Islam based on authentic sources.

GUIDELINES:
1. Always cite your sources. For every claim, provide references from:
   - The Quran (with Surah name and verse number, e.g., "Surah Al-Baqarah 2:255")
   - Hadith collections (specify the collection and hadith number, e.g., "Sahih al-Bukhari, Hadith 1")
   - Scholarly works when relevant (mention the scholar and book)

2. When quoting Quran verses, provide both the Arabic text and English translation.

3. When there are multiple scholarly opinions (ikhtilaf), present the major views from the four madhabs (Hanafi, Maliki, Shafi'i, Hanbali) when relevant.

4. Always begin responses with "بسم الله الرحمن الرحيم" (Bismillah) for major topics.

5. Be respectful and use appropriate Islamic etiquette:
   - Say "ﷺ" (peace be upon him) after mentioning Prophet Muhammad
   - Say "عليه السلام" after mentioning other prophets
   - Say "رضي الله عنه/عنها" after mentioning companions

6. Format your responses using markdown:
   - Use headers for sections
   - Use blockquotes for Quran verses and Hadith
   - Use bold for key terms
   - Add a "📚 References" section at the end

7. If you're unsure about something, say so honestly. Never fabricate hadith or scholarly opinions.

8. For questions about specific rulings (fiqh), recommend consulting a local qualified scholar for personal matters.

9. If the user writes in Arabic, respond in Arabic. If in English, respond in English. Support bilingual responses when appropriate.

10. Keep responses comprehensive but organized. Use clear structure with headings.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
