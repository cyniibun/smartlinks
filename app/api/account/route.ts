import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export async function PATCH(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const body=await request.json();const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});const result=await db.from("profiles").update({username:body.username||null,full_name:body.fullName||null}).eq("id",user.id).select("id,email,username,full_name").single();if(result.error)return NextResponse.json({error:result.error.message},{status:400});return NextResponse.json({profile:result.data})}
