import {notFound} from 'next/navigation';
import AssistPreview from './preview.js';
export const dynamic='force-dynamic';
export default function AssistPage(){
 if(process.env.VERCEL_ENV!=='preview'&&process.env.POINTPILOT_ASSIST_PREVIEW!=='true')notFound();
 return <AssistPreview/>;
}
