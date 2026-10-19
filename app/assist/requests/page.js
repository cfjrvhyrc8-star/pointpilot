import {notFound} from 'next/navigation';
import RequestWorkspace from './workspace.js';
export const dynamic='force-dynamic';
export default function RequestsPage(){
 if(process.env.VERCEL_ENV!=='preview'&&process.env.POINTPILOT_ASSIST_PREVIEW!=='true')notFound();
 if(process.env.POINTPILOT_ASSIST_REQUESTS!=='true')return <main><h1>Saved requests are not enabled yet</h1><p>Database isolation and deployment checks must be completed before intake opens. No request or payment has been created.</p><a href="/assist">Back to Assist preview</a></main>;
 return <RequestWorkspace/>;
}
