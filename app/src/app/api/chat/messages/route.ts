import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

// GET: セッションのメッセージ取得（ページネーション対応）
export async function GET(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const before = searchParams.get("before"); // created_at カーソル

    if (!sessionId) return NextResponse.json({ error: "sessionIdが必要です。" }, { status: 400 });

    // セッション所有権チェック
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();
    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });
    }

    // メッセージ取得（新しい順に PAGE_SIZE+1 件取得して hasMore を判定）
    let query = supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Messages fetch error:", error);
      return NextResponse.json({ error: "取得に失敗しました。" }, { status: 500 });
    }

    const hasMore = (rows?.length ?? 0) > PAGE_SIZE;
    const messages = (rows ?? []).slice(0, PAGE_SIZE).reverse(); // 古い順に並べ直す

    return NextResponse.json({ messages, hasMore });
  } catch (error) {
    console.error("Messages API error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}

// POST: 新規セッション作成 or 最新セッション取得
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

    const { companyId, forceNew } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyIdが必要です。" }, { status: 400 });

    // 会社所有権チェック
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .single();
    if (!company) return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });

    // 強制新規でなければ最新セッションを取得
    if (!forceNew) {
      const { data: existing } = await supabaseAdmin
        .from("chat_sessions")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ sessionId: existing[0].id, isNew: false });
      }
    }

    // 新規作成
    const { data: newSession, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({ company_id: companyId, user_id: user.id })
      .select("id")
      .single();

    if (error || !newSession) {
      console.error("Session create error:", error);
      return NextResponse.json({ error: "セッション作成に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: newSession.id, isNew: true });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
