async page => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://localhost:8088/software-para-psicologos');
  await page.getByRole('button',{name:'Acceder',exact:true}).waitFor();
  const consent=page.getByRole('button',{name:'Rechazar estadísticas de uso'});
  if(await consent.isVisible())await consent.click();
  const origin=await page.evaluate(()=>performance.timeOrigin);
  const documents=[];
  const onRequest=request=>{
    if(request.isNavigationRequest() && request.frame()===page.mainFrame())documents.push(request.url());
  };
  page.on('request',onRequest);
  const results=[];
  try {
    for(const [label,path,heading] of [
      ['Agenda','/agenda-para-psicologos','Tu agenda de psicología, organizada con calma'],
      ['Pacientes e historia clínica','/gestion-pacientes-psicologos','Pacientes e historia clínica, con el contexto que necesitas'],
      ['Facturación','/facturacion-para-psicologos',null],
      ['HERA por dentro','/profesionales/recorrido','Así se trabaja con HERA'],
      ['Planes y precios','/planes','Planes para tu consulta de psicología.'],
      ['Funcionalidades','/software-para-psicologos',null],
    ]) {
      const start=Date.now();
      await page.getByRole('link',{name:label,exact:true}).first().click();
      await page.waitForURL(url=>url.pathname===path);
      if(heading)await page.getByRole('heading',{name:heading,exact:true}).waitFor();
      await page.getByRole('button',{name:'Acceder',exact:true}).waitFor();
      results.push({path,interactiveMs:Date.now()-start});
      const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
      if(!canonical.endsWith(path))throw new Error('Wrong canonical: '+canonical);
      const schema=await page.locator('#hera-page-schema').allTextContents();
      if (path === '/planes' ? schema.length > 0 : schema.length !== 1 || JSON.parse(schema[0]).url !== canonical)
        throw new Error('Structured data mismatches the visible page: '+path);
    }
    // The body CTA must use the same navigation as the header.
    await page.getByRole('link',{name:'Ver HERA por dentro',exact:true}).first().click();
    await page.getByRole('heading',{name:'Así se trabaja con HERA'}).waitFor();
    await page.goBack();
    await page.waitForURL(url=>url.pathname==='/software-para-psicologos');
    await page.locator('.pro-hero .pro-actions').getByRole('link',{name:'Ver planes y precios',exact:false}).first().click();
    await page.getByRole('heading',{name:'Planes para tu consulta de psicología.'}).waitFor();
    if(await page.evaluate(()=>performance.timeOrigin)!==origin || documents.length)
      throw new Error('Internal navigation reloaded the application: '+JSON.stringify(documents));
    return {transitions:results,documentReloads:documents.length,bodyLinks:true,back:true,canonicals:true};
  }finally{page.off('request',onRequest);}
}
