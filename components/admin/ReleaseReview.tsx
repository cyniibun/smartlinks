"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArtworkPreview } from "@/components/admin/ArtworkPreview";
import { detectPlatformUrl } from "@/lib/platformDetection";
import type { ResolvedLink, ResolvedRelease } from "@/lib/resolver";

type Artist = { id: string; name: string };
type Candidate = { provider:string; title:string; artist:string; artworkUrl?:string; releaseDate?:string; isrc?:string; links:Array<{platform:string;label:string;url:string;section:string}> };
type StoredImport = { candidate: Candidate; query: string };
type EditableLink = ResolvedLink & { selected: boolean };
const releaseTypes=["single","album","ep","playlist","podcast","podcast_episode","audiobook","youtube_video","merch","event","ticket_page","presave","artist_bio","short_link","custom"];
const platforms=["spotify","apple_music","youtube","youtube_music","soundcloud","pandora","deezer","amazon_music","tidal","itunes","amazon","bandcamp","audiomack","other"];
const sections=["listen","watch","buy","podcast","merch","tickets","other"];
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function ReleaseReview({workspaceId,artists}:{workspaceId:string;artists:Artist[]}) {
  const router=useRouter(); const searchParams=useSearchParams();
  const [ready,setReady]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [resolved,setResolved]=useState<ResolvedRelease|null>(null); const [sourceUrl,setSourceUrl]=useState("");
  const [title,setTitle]=useState(""); const [displayArtist,setDisplayArtist]=useState(""); const [artistId,setArtistId]=useState(artists[0]?.id||"new"); const [newArtist,setNewArtist]=useState("");
  const [releaseType,setReleaseType]=useState("single"); const [releaseDate,setReleaseDate]=useState(""); const [slug,setSlug]=useState(""); const [labelName,setLabelName]=useState(""); const [artworkUrl,setArtworkUrl]=useState("");
  const [links,setLinks]=useState<EditableLink[]>([]);

  useEffect(()=>{
    const importId=searchParams.get("importId"); const raw=importId?sessionStorage.getItem(`tone-link-import:${importId}`):null;
    if(!raw){setError("This review session expired. Return to search and choose the release again.");setReady(true);return}
    let stored:StoredImport;
    try{stored=JSON.parse(raw) as StoredImport}catch{setError("The imported release could not be read. Return to search and try again.");setReady(true);return}
    const c=stored.candidate; const url=c.links[0]?.url||(/^https?:\/\//i.test(stored.query)?stored.query:"");
    setTitle(c.title);setDisplayArtist(c.artist);setSlug(slugify(c.title));setArtworkUrl(c.artworkUrl||"");setReleaseDate(c.releaseDate||"");setSourceUrl(url);
    setLinks(c.links.map((link,index)=>({...link,platform:link.platform as EditableLink["platform"],section:link.section as EditableLink["section"],confidence:index===0?1:.5,source:c.provider,enabledByDefault:index===0,selected:index===0})));
    setReady(true);setBusy(true);
    void fetch("/api/admin/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sourceUrl:url,title:c.title,artist:c.artist,isrc:c.isrc})}).then(async response=>{const json=await response.json();if(!response.ok)throw new Error(json.error||`Resolver failed (${response.status})`);const release=json.release as ResolvedRelease;setResolved(release);setTitle(release.title||c.title);setDisplayArtist(release.artist||c.artist);setSlug(slugify(release.title||c.title));setArtworkUrl(release.artworkUrl||c.artworkUrl||"");setReleaseDate(release.releaseDate||c.releaseDate||"");setLinks(release.links.map(link=>({...link,selected:link.enabledByDefault}))) }).catch(reason=>setError(`${reason instanceof Error?reason.message:"Platform resolution failed."} You can still review, add links, and save.`)).finally(()=>setBusy(false));
  },[searchParams]);

  const updateLink=(index:number,change:Partial<EditableLink>)=>setLinks(current=>current.map((link,i)=>i===index?{...link,...change}:link));
  const setLinkUrl=(index:number,url:string)=>{const detected=detectPlatformUrl(url);updateLink(index,{url,...detected,selected:true} as Partial<EditableLink>)};
  const addLink=()=>setLinks(current=>[...current,{platform:"other",label:"Custom",url:"",section:"other",confidence:1,source:"manual",enabledByDefault:true,selected:true}]);
  const setPlatform=(index:number,platform:string)=>{const defaults:Record<string,{label:string;section:EditableLink["section"]}>={spotify:{label:"Spotify",section:"listen"},apple_music:{label:"Apple Music",section:"listen"},youtube:{label:"YouTube",section:"watch"},youtube_music:{label:"YouTube Music",section:"listen"},soundcloud:{label:"SoundCloud",section:"listen"},pandora:{label:"Pandora",section:"listen"},deezer:{label:"Deezer",section:"listen"},amazon_music:{label:"Amazon Music",section:"listen"},tidal:{label:"TIDAL",section:"listen"},itunes:{label:"iTunes",section:"buy"},amazon:{label:"Amazon",section:"buy"},bandcamp:{label:"Bandcamp",section:"buy"},audiomack:{label:"Audiomack",section:"listen"},other:{label:"Custom",section:"other"}};updateLink(index,{platform:platform as EditableLink["platform"],...(defaults[platform]||{})})};
  const save=async(published:boolean)=>{setBusy(true);setError("");try{const response=await fetch("/api/admin/releases",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId,artistId:artistId==="new"?undefined:artistId,newArtistName:newArtist,title,artist:displayArtist||newArtist,releaseType,slug,artworkUrl,releaseDate,labelName,sourceImportUrl:sourceUrl,importProvider:resolved?.provider,importConfidence:resolved?.confidence,links,published})});const json=await response.json();if(!response.ok)throw new Error(json.error||`Save failed (${response.status})`);router.push(`/dashboard/${workspaceId}/link-pages/${json.page.id}?created=1`)}catch(reason){setError(reason instanceof Error?reason.message:"Unable to save this link.")}finally{setBusy(false)}};

  if(!ready)return <main className="admin-main"><p>Loading review…</p></main>;
  return <main className="admin-main review-page">
    <div className="admin-title-row"><div><span className="admin-kicker">CREATE / SEARCH</span><h1>Review and publish</h1><p>Confirm the release, destinations, and public page details.</p></div><Link className="admin-secondary" href={`/dashboard/${workspaceId}/create`}>← Back to Search</Link></div>
    {error&&<div className="admin-alert error">{error}</div>}
    <section className="admin-panel review-metadata"><div><ArtworkPreview url={artworkUrl} title={`${title||"Release"} artwork`}/><p className="muted">{displayArtist}{releaseDate?` · ${releaseDate}`:""}</p></div><div className="review-fields">
      <label>Title<input value={title} onChange={event=>setTitle(event.target.value)}/></label>
      <label>Display artist<input value={displayArtist} onChange={event=>setDisplayArtist(event.target.value)}/></label>
      <label>Assign artist<select value={artistId} onChange={event=>{setArtistId(event.target.value);const selected=artists.find(artist=>artist.id===event.target.value);if(selected)setDisplayArtist(selected.name)}}><option value="new">+ Create new artist</option>{artists.map(artist=><option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
      {artistId==="new"&&<label>New artist name<input value={newArtist} onChange={event=>{setNewArtist(event.target.value);setDisplayArtist(event.target.value)}}/></label>}
      <label>Release type<select value={releaseType} onChange={event=>setReleaseType(event.target.value)}>{releaseTypes.map(type=><option key={type} value={type}>{type.replaceAll("_"," ")}</option>)}</select></label>
      <label>Release date<input type="date" value={releaseDate} onChange={event=>setReleaseDate(event.target.value)}/></label>
      <label>Slug<input value={slug} onChange={event=>setSlug(slugify(event.target.value))}/></label>
      <label>Label name<input value={labelName} onChange={event=>setLabelName(event.target.value)}/></label>
      <label className="full">Artwork URL<input value={artworkUrl} onChange={event=>setArtworkUrl(event.target.value)} title={artworkUrl}/></label>
    </div></section>
    <section className="admin-panel"><div className="panel-title"><div><h2>Platform links</h2><p className="muted">Enable, categorize, or add any destination before publishing.</p></div><button onClick={addLink}>+ Add link</button></div><div className="platform-editor-list">{links.map((link,index)=><div className="platform-editor-row" key={`${index}-${link.source}`}>
      <label className="toggle"><input type="checkbox" checked={link.selected} onChange={event=>updateLink(index,{selected:event.target.checked})}/> Enabled</label>
      <select aria-label="Platform" value={link.platform} onChange={event=>setPlatform(index,event.target.value)}>{platforms.map(platform=><option key={platform} value={platform}>{platform.replaceAll("_"," ")}</option>)}</select>
      <select aria-label="Section" value={link.section} onChange={event=>updateLink(index,{section:event.target.value as EditableLink["section"]})}>{sections.map(section=><option key={section}>{section}</option>)}</select>
      <input className="link-url" aria-label="Destination URL" value={link.url} onChange={event=>setLinkUrl(index,event.target.value)} placeholder="https://…" title={link.url}/>
      {link.confidence<.8&&<span className="provider-warning">Review</span>}<button className="danger" aria-label="Remove link" onClick={()=>setLinks(current=>current.filter((_,i)=>i!==index))}>Remove</button>
    </div>)}</div></section>
    {resolved?.report?.length?<details className="admin-panel resolver-report"><summary>Resolver results</summary>{resolved.report.map((item,index)=><div key={`${item.platform}-${index}`}><strong>{item.status==="matched"?"✓":item.status==="review"?"⚠":"✕"} {item.platform}</strong><span>{item.reason}</span></div>)}</details>:null}
    <div className="wizard-publish"><Link className="admin-secondary" href={`/dashboard/${workspaceId}/create`}>Cancel</Link><button onClick={()=>void save(false)} disabled={busy}>{busy?"Saving…":"Save draft"}</button><button className="admin-primary" onClick={()=>void save(true)} disabled={busy}>{busy?"Saving…":"Publish smart link"}</button></div>
  </main>;
}
