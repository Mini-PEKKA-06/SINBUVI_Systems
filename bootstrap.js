// The early portal guard owns the single navigation-relative startup deadline.
(async()=>{
 const startup=window.portalStartup;
 if(!startup?.isActive())return;
 try{
  load();
  statusMessage(DEMO_MODE?'Browser-only classroom demo · localStorage · not saved to MySQL':'Classroom prototype · Connecting to MySQL…');
  if(!DEMO_MODE){
   const result=await apiRequest('session.php',null,{signal:startup.signal});
   if(!startup.isActive())return;
   if(result.account){
    applyAccount(result.account,{signal:startup.signal});
    await refreshDatabase(false,{signal:startup.signal});
    if(!startup.isActive())return;
    state.page='Dashboard';
   }else{
    state.page='Login';
    statusMessage('Classroom prototype · MySQL · Sign in to load records');
   }
  }else state.page='Login';
  render();
  startup.complete();
 }catch(error){
  if(!startup.isActive())return;
  console.error('Singin Connect startup:',error);
  state.page='Splash';
  const message=error.kind==='database'?'The database is unavailable. Start MySQL or check the database configuration, then retry.':error.kind==='network'?'The portal API could not be reached. Check the local server connection, then retry.':error.kind==='response'?'The portal API returned an invalid response. Check the PHP setup, then retry.':error.kind==='api'?error.message:'The portal could not initialize. A local application error occurred. Reload the current release or check the browser console.';
  startup.fail(message);
 }
})();
