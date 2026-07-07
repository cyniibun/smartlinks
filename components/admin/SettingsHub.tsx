"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArtworkPreview } from "@/components/admin/ArtworkPreview";
import { AsyncError } from "@/components/admin/AsyncError";
import { COMMON_TIMEZONES } from "@/lib/timezone";

type Artist={id:string;name:string;image_url?:string;default_label_name?:string;default_tiktok_pixel_id?:string;default_meta_pixel_id?:string;default_ga_measurement_id?:string;default_head_entries?:unknown[];bio?:string;website_url?:string;instagram_url?:string;tiktok_url?:string;youtube_url?:string;spotify_artist_url?:string;apple_artist_url?:string};
type Member={role:string;profiles?:{email:string;full_name?:string}|null};
type WorkspaceSettings={name:string;slug:string;timezone:string;default_market:string;default_theme:string;default_tiktok_pixel_id:string;default_meta_pixel_id:string;default_ga_measurement_id:string};
const sections=["Workspace","Account","Artists","Pixels","Team","Domains","Billing"] as const;type Section=typeof sections[number];

export function SettingsHub({workspaceId,workspaceName,initialWorkspace,email,initialProfile,initialArtists,members,planId}:{workspaceId:string;workspaceName:string;initialWorkspace:WorkspaceSettings;email:string;initialProfile:{username?:string;full_name?:string};initialArtists:Artist[];members:Member[];planId?:string}) {
  const router=useRouter();
  const[section,setSection]=useState<Section>("Workspace");
  const[workspace,setWorkspace]=useState(initialWorkspace);
  const[artists,setArtists]=useState(initialArtists);
  const[artistId,setArtistId]=useState(initialArtists[0]?.id||"");
  const[headJson,setHeadJson]=useState(JSON.stringify(initialArtists[0]?.default_head_entries||[],null,2));
  const[profile,setProfile]=useState(initialProfile);
  const[notice,setNotice]=useState("");
  const[error,setError]=useState("");
  const[errorDetail,setErrorDetail]=useState("");
  const[busyAction,setBusyAction]=useState("");
  const artist=artists.find(a=>a.id===artistId);

  const run=async(label:string,work:()=>Promise<void>)=>{
    setBusyAction(label);setError("");setErrorDetail("");setNotice("");
    try{await work()}catch(reason){setError(label==="workspace"?"Unable to save workspace settings.":label==="artist"?"Unable to save artist defaults.":"Unable to save account settings.");setErrorDetail(reason instanceof Error?reason.message:"Action failed.")}
    finally{setBusyAction("")}
  };
  const patchArtist=(values:Partial<Artist>)=>setArtists(v=>v.map(a=>a.id===artistId?{...a,...values}:a));
  const saveArtist=async()=>run("artist",async()=>{
    if(!artist)return;let headEntries:unknown[];
    try{headEntries=JSON.parse(headJson);if(!Array.isArray(headEntries))throw new Error()}catch{throw new Error("Custom head entries must be valid JSON containing a list.")}
    const r=await fetch(`/api/admin/artists/${artist.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId,name:artist.name,imageUrl:artist.image_url,defaultLabelName:artist.default_label_name,tiktokPixelId:artist.default_tiktok_pixel_id,metaPixelId:artist.default_meta_pixel_id,gaMeasurementId:artist.default_ga_measurement_id,headEntries,bio:artist.bio,websiteUrl:artist.website_url,instagramUrl:artist.instagram_url,tiktokUrl:artist.tiktok_url,youtubeUrl:artist.youtube_url,spotifyArtistUrl:artist.spotify_artist_url,appleArtistUrl:artist.apple_artist_url})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||`Save failed (${r.status})`);setNotice("Artist defaults saved.");
  });
  const saveProfile=async()=>run("profile",async()=>{
    const r=await fetch("/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({username:profile.username,fullName:profile.full_name})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||`Save failed (${r.status})`);setNotice("Account profile saved.");
  });
  const saveWorkspace=async()=>run("workspace",async()=>{
    const r=await fetch("/api/admin/workspace",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId,name:workspace.name,slug:workspace.slug,timezone:workspace.timezone,defaultMarket:workspace.default_market,defaultTheme:workspace.default_theme,defaultTiktokPixelId:workspace.default_tiktok_pixel_id,defaultMetaPixelId:workspace.default_meta_pixel_id,defaultGaMeasurementId:workspace.default_ga_measurement_id})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||`Save failed (${r.status})`);setWorkspace({...workspace,...j.workspace,timezone:j.workspace.timezone||j.workspace.default_timezone||workspace.timezone});setNotice("Workspace settings saved.");router.refresh();
  });

  return <main className="admin-main"><div className="admin-title-row"><div><span className="admin-kicker">SETTINGS</span><h1>{workspace.name||workspaceName}</h1><p>Workspace identity, defaults, access, and account preferences.</p></div></div><div className="settings-layout"><aside>{sections.map(s=><button className={s===section?"active":""} onClick={()=>{setSection(s);setNotice("");setError("");setErrorDetail("")}} key={s}>{s}</button>)}</aside><section className="admin-panel settings-panel">
    {notice&&<div className="admin-alert">{notice}</div>}{error&&<AsyncError message={error} detail={errorDetail}/>}
    {section==="Workspace"&&<><h2>Workspace</h2><p className="muted">Identity, resolver behavior, timezone, and lowest-priority workspace defaults.</p><div className="editor-grid">
      <label>Workspace name<input value={workspace.name} onChange={e=>setWorkspace({...workspace,name:e.target.value})}/></label>
      <label>Workspace slug<input value={workspace.slug} onChange={e=>setWorkspace({...workspace,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})}/></label>
      <label>Timezone<select value={workspace.timezone} onChange={e=>setWorkspace({...workspace,timezone:e.target.value})}>{COMMON_TIMEZONES.map(timezone=><option key={timezone} value={timezone}>{timezone}</option>)}</select></label>
      <label>Default resolver market<input value={workspace.default_market} maxLength={2} onChange={e=>setWorkspace({...workspace,default_market:e.target.value.toUpperCase()})} placeholder="US"/></label>
      <label>Default theme<select value={workspace.default_theme} onChange={e=>setWorkspace({...workspace,default_theme:e.target.value})}><option value="minimal">Minimal</option><option value="glass">Glass</option><option value="monochrome">Monochrome</option></select></label>
      <label>Default TikTok Pixel ID<input value={workspace.default_tiktok_pixel_id} onChange={e=>setWorkspace({...workspace,default_tiktok_pixel_id:e.target.value})}/></label>
      <label>Default Meta Pixel ID<input value={workspace.default_meta_pixel_id} onChange={e=>setWorkspace({...workspace,default_meta_pixel_id:e.target.value})}/></label>
      <label>Default GA4 Measurement ID<input value={workspace.default_ga_measurement_id} onChange={e=>setWorkspace({...workspace,default_ga_measurement_id:e.target.value})}/></label>
    </div><button className="admin-primary" disabled={busyAction==="workspace"} onClick={()=>void saveWorkspace()}>{busyAction==="workspace"?"Saving workspace…":"Save workspace"}</button></>}
    {section==="Account"&&<><h2>Account</h2><label>Email<input value={email} readOnly/></label><label>Full name<input value={profile.full_name||""} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></label><label>Username<input value={profile.username||""} onChange={e=>setProfile({...profile,username:e.target.value})}/></label><button className="admin-primary" disabled={busyAction==="profile"} onClick={()=>void saveProfile()}>{busyAction==="profile"?"Saving account…":"Save account"}</button><p className="muted">Password updates are managed by Supabase Auth — coming soon.</p><form action="/api/admin/logout" method="post"><button>Sign out</button></form></>}
    {(section==="Artists"||section==="Pixels")&&<><h2>{section}</h2><label>Artist<select value={artistId} onChange={e=>{setArtistId(e.target.value);const next=artists.find(a=>a.id===e.target.value);setHeadJson(JSON.stringify(next?.default_head_entries||[],null,2))}}>{artists.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>{artist?<>{section==="Artists"&&<><ArtworkPreview url={artist.image_url} title={`${artist.name} image`}/><div className="editor-grid"><label>Name<input value={artist.name} onChange={e=>patchArtist({name:e.target.value})}/></label><label>Image URL<input value={artist.image_url||""} onChange={e=>patchArtist({image_url:e.target.value})}/></label><label>Default label name<input value={artist.default_label_name||""} onChange={e=>patchArtist({default_label_name:e.target.value})}/></label><label>Website<input value={artist.website_url||""} onChange={e=>patchArtist({website_url:e.target.value})}/></label><label>Instagram<input value={artist.instagram_url||""} onChange={e=>patchArtist({instagram_url:e.target.value})}/></label><label>TikTok<input value={artist.tiktok_url||""} onChange={e=>patchArtist({tiktok_url:e.target.value})}/></label><label>YouTube<input value={artist.youtube_url||""} onChange={e=>patchArtist({youtube_url:e.target.value})}/></label><label>Spotify artist URL<input value={artist.spotify_artist_url||""} onChange={e=>patchArtist({spotify_artist_url:e.target.value})}/></label><label>Apple artist URL<input value={artist.apple_artist_url||""} onChange={e=>patchArtist({apple_artist_url:e.target.value})}/></label><label className="full">Bio<textarea value={artist.bio||""} onChange={e=>patchArtist({bio:e.target.value})}/></label></div></>}{section==="Pixels"&&<><p className="muted">New Link Pages inherit these values. Individual pages can still override them.</p><div className="editor-grid"><label>TikTok Pixel ID / code<input value={artist.default_tiktok_pixel_id||""} onChange={e=>patchArtist({default_tiktok_pixel_id:e.target.value})}/></label><label>Meta Pixel ID / code<input value={artist.default_meta_pixel_id||""} onChange={e=>patchArtist({default_meta_pixel_id:e.target.value})}/></label><label>GA4 ID / code<input value={artist.default_ga_measurement_id||""} onChange={e=>patchArtist({default_ga_measurement_id:e.target.value})}/></label><label className="full">Custom head entries (JSON)<textarea value={headJson} onChange={e=>setHeadJson(e.target.value)}/></label></div></>}<button className="admin-primary" disabled={busyAction==="artist"} onClick={()=>void saveArtist()}>{busyAction==="artist"?"Saving defaults…":"Save artist defaults"}</button></>:<p>No artists yet. Create one from Create / Search.</p>}</>}
    {section==="Team"&&<><h2>Team</h2><div className="recent-table">{members.map((m,i)=><div key={i}><strong>{m.profiles?.full_name||m.profiles?.email||"Member"}</strong><span>{m.profiles?.email}</span><span>{m.role}</span></div>)}</div><button disabled>Invite user — coming soon</button><p className="muted">Role editing will use owner/admin/member/viewer permissions.</p></>}
    {section==="Domains"&&<><h2>Domains</h2><p>Primary Smart Link domain: <strong>link.tone-link.com</strong></p><p className="muted">Custom-domain DNS verification and automatic SSL are future plan features.</p></>}
    {section==="Billing"&&<><h2>Billing</h2><p>Current plan: <strong>{planId||"free"}</strong></p><p className="muted">Stripe billing is not enabled yet. Account-level owner bypasses remain honored.</p></>}
  </section></div></main>;
}
