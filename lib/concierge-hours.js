export const CONCIERGE_HOURS={timezone:'Asia/Kolkata',label:'Monday–Saturday, 9:30 AM–6:00 PM IST',openMinute:570,closeMinute:1080};
// Published regular hours only; holiday exceptions supplied by operations.
export function conciergeOpenAt(instant,closedDates=[]){
 const date=new Date(instant);if(!Number.isFinite(date.getTime()))throw new Error('Invalid instant');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:CONCIERGE_HOURS.timezone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 const localDate=`${parts.year}-${parts.month}-${parts.day}`,minute=Number(parts.hour)*60+Number(parts.minute);
 return {open:parts.weekday!=='Sun'&&!closedDates.includes(localDate)&&minute>=570&&minute<1080,localDate,timezone:CONCIERGE_HOURS.timezone};
}
