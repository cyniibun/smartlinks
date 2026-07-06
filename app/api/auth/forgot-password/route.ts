import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request:Request){const form=await request.formData();const email=String(form.get("email")||"").trim();const supabase=getSupabasePublic();if(!supabase)return NextResponse.redirect(new URL("/forgot-password?error=Supabase%20Auth%20is%20not%20configured.",request.url),303);const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/reset-password`});if(error)console.warn("[tone-link:password-reset]",error.message);return NextResponse.redirect(new URL("/forgot-password?message=sent",request.url),303)}
