import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are Al-Bayan AI (البيان), a knowledgeable and respectful Islamic knowledge assistant. Your purpose is to provide accurate answers about Islam based on authentic sources.

GUIDELINES:
1. Always cite your sources. For every claim, provide references from:
   - The Quran (with Surah name and verse number, e.g., "Surah Al-Baqarah 2:255")
   - Hadith collections (specify the collection and hadith number, e.g., "Sahih al-Bukhari, Hadith 1")
   - Scholarly works when relevant (mention the scholar and book)

2. When quoting Quran verses, provide both the Arabic text and English translation.

3. Always begin responses with "بسم الله الرحمن الرحيم" (Bismillah) for major topics.

4. Be respectful and use appropriate Islamic etiquette:
   - Say "ﷺ" (peace be upon him) after mentioning Prophet Muhammad
   - Say "عليه السلام" after mentioning other prophets
   - Say "رضي الله عنه/عنها" after mentioning companions

5. Format your responses using markdown:
   - Use headers for sections
   - Use blockquotes for Quran verses and Hadith
   - Use bold for key terms
   - Add a "📚 References" section at the end

6. If you're unsure about something, say so honestly. Never fabricate hadith or scholarly opinions.

7. For questions about specific rulings (fiqh), recommend consulting a local qualified scholar for personal matters.

8. If the user writes in Arabic, respond in Arabic. If in English, respond in English. Support bilingual responses when appropriate.

9. Keep responses comprehensive but organized. Use clear structure with headings.

10. For each hadith you cite, include its **grading** (Sahih/Hasan/Da'if) and the **collection** it comes from. Example: "*Sahih al-Bukhari 1 (Sahih)*"`;

const MADHAB_COMPARISON_ADDON = `

IMPORTANT - MADHAB COMPARISON MODE IS ACTIVE:
For this question, you MUST present the ruling or view from ALL FOUR major Sunni schools of thought (madhabs) in a structured comparison format:

Use this exact format:
## 📋 Madhab Comparison

### 🟢 Hanafi School (أبو حنيفة)
[Their view with evidence]

### 🔵 Maliki School (مالك بن أنس)
[Their view with evidence]

### 🟡 Shafi'i School (الشافعي)
[Their view with evidence]

### 🟣 Hanbali School (أحمد بن حنبل)
[Their view with evidence]

### ⚖️ Summary & Common Ground
[What they agree on, key differences, and which view is most commonly practiced today]

Cite the primary source book for each madhab's view (e.g., Al-Hidayah for Hanafi, Al-Muwatta for Maliki, Al-Umm for Shafi'i, Al-Mughni for Hanbali).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller — prevents anonymous consumption of AI credits.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, madhabCompare } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = madhabCompare
      ? BASE_SYSTEM_PROMPT + MADHAB_COMPARISON_ADDON
      : BASE_SYSTEM_PROMPT;

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
            { role: "system", content: systemPrompt },
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
