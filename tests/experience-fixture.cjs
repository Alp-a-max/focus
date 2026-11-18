/* Feature suites represent an existing user. First-run flows have their own suite. */
const prepare = target => target.addInitScript(() => {
    localStorage.setItem('odak-experience-v1', JSON.stringify({mode:'standard', language:'tr', completed:true}));
});
module.exports = test => test.beforeEach(async ({page}) => { await prepare(page); });
module.exports.prepare = prepare;
