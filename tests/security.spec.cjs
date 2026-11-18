const {test,expect}=require('@playwright/test');
test('remote model timestamps are displayed as text rather than executable markup',async({page})=>{
  await page.route('**/api/observations',r=>r.fulfill({json:[]}));
  const attack='<img src=x onerror="window.odakInjected=true">';
  await page.route('**/v1/{marine,forecast}?*',r=>{
    const marine=r.request().url().includes('/marine?'),s=marine?'ocean_current_velocity':'wind_speed_10m',d=marine?'ocean_current_direction':'wind_direction_10m';
    return r.fulfill({json:{latitude:36.45,longitude:31.3,current:{time:attack,[s]:1,[d]:90},current_units:{[s]:'km/h',[d]:'°'},
      hourly:{time:[],[s]:[],[d]:[]},hourly_units:{[s]:'km/h',[d]:'°'}}});
  });
  await page.goto('/#intelligence');
  await expect(page.locator('#dataStatus')).toContainText(attack);
  await expect(page.locator('#dataStatus img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.odakInjected)).toBeUndefined();
});
