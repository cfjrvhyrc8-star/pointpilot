// Dashboard data is session-specific and provider state changes frequently.
// Do not let a stale static shell keep an older client bundle alive after a deploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardLayout({children}){
  return children;
}
