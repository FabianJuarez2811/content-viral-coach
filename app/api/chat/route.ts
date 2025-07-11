import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai_key = process.env.OPENAI_API_KEY!;
const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabase_key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabase_url, supabase_key);

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  // 1. Obtenemos el embedding de la pregunta
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openai_key}`,
    },
    body: JSON.stringify({
      input: prompt,
      model: "text-embedding-ada-002",
    }),
  });
  const embeddingJson = await embeddingRes.json();
  const embedding = embeddingJson.data[0].embedding;

  // 2. Buscamos los contenidos relevantes usando la función RPC (RAG)
  const { data: matches, error } = await supabase.rpc("match_page_sections", {
    embedding, // <<--- SOLO ESTE NOMBRE. No uses 'query_embedding'.
    match_threshold: 0.2,
    match_count: 5,
    min_content_length: 20
  });

  if (error) {
    return NextResponse.json({ result: "Error buscando información en la base." });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ result: "No encontré información relevante en la base de conocimiento." });
  }

  // 3. Armar el contexto con los matches
  const context = matches.map((m: any) => m.content).join("\n\n---\n\n");

  // 4. Llamar a GPT-4o SOLO con ese contexto, y forzar que NO invente fuera de ahí
  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openai_key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o", // O "gpt-4"
      messages: [
        {
          role: "system",
          content: `Eres un asistente experto. SOLO puedes responder usando la siguiente información de la base de conocimiento. Si la respuesta no está en el contexto, responde: "No tengo información suficiente en la base de conocimiento para responder esa pregunta."\n\n${context}`,
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.1
    }),
  });

  const data = await gptRes.json();
  return NextResponse.json({
    result: data.choices?.[0]?.message?.content || "Sin respuesta."
  });
}
