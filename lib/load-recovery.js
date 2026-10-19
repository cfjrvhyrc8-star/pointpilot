// Returns a cleanup function immediately, suitable for a React effect.
export function startLoad({request,onSuccess,onError,onSettled},timeoutMs=15000){
 const controller=new AbortController();let active=true,timer,cancelPending;
 const finish=async()=>{
  try{
   const result=await Promise.race([
    Promise.resolve().then(()=>{if(!active)throw new Error('Cancelled');return request(controller.signal)}),
    new Promise((_,reject)=>{cancelPending=()=>reject(new Error('Cancelled'))}),
    new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('Loading timed out. Please retry. Your saved data has not been changed.'));controller.abort()},timeoutMs)})
   ]);
   if(active)onSuccess(result);
  }catch(error){if(active)onError(error)}
  finally{clearTimeout(timer);if(active)onSettled()}
 };
 const done=finish();
 return {done,cancel:()=>{active=false;clearTimeout(timer);controller.abort();cancelPending?.()}};
}
