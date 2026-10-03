import "../styles/globals.css";
import "../styles/decision-system.css";
import "../styles/dashboard-premium.css";
import ChunkRecovery from "./ChunkRecovery"; export const metadata={title:"PointPilot — Rewards Intelligence",description:"Choose the right card, use points better, and find the smartest route to the trip you want."}; export default function RootLayout({children}){return <html lang="en"><body><ChunkRecovery/>{children}</body></html>}
