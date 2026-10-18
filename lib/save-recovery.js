// A cancelled HTTP request does not prove that the server rolled back a write.
export async function saveWithRecovery({request,setSaving,setSaved,setError,onSuccess=()=>{},formatError=error=>error?.message||"Unable to confirm the save. Please check your connection."},timeoutMs=15000){
 const controller=new AbortController();
 let timer;
 setSaving(true);setSaved(false);setError("");
 try{
  const result=await Promise.race([
   Promise.resolve().then(()=>request(controller.signal)),
   new Promise((_,reject)=>{timer=setTimeout(()=>{
    reject(new Error("Save timed out. The server may have received it. Reload to check the saved version before retrying; unsaved edits will be lost on reload."));
    controller.abort();
   },timeoutMs)})
  ]);
  if(result.error)throw result.error;
  onSuccess(result.data);
  setSaved(true);
 }catch(error){setError(formatError(error));}
 finally{clearTimeout(timer);setSaving(false);}
}
