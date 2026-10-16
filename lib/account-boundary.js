// Invalidates pending reads when identity changes, requests overlap, or a view unmounts.
export function createAccountBoundary(){
  let identity;
  let revision=0;
  return {
    begin(){return ++revision},
    current(ticket){return ticket===revision},
    invalidate(){revision++},
    observe(next){
      const changed=identity!==undefined&&identity!==next;
      identity=next;
      if(changed)revision++;
      return changed;
    },
    verify(ticket,id){
      if(ticket!==revision||(identity!==undefined&&identity!==id))return false;
      identity=id;
      return true;
    }
  };
}
