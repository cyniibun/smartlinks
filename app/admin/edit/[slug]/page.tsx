import { redirect } from "next/navigation";
export default async function EditSongPage({ params }: { params: Promise<{ slug: string }> }) { redirect(`/dashboard/edit/${(await params).slug}`); }
