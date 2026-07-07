import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const params=await searchParams;
  return <ForgotPasswordForm initialError={params.error} sent={params.message==="sent"}/>;
}
