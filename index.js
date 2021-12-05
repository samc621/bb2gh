const axios = require('axios').default;
const cp = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const assert = require('assert');

const {
    BB_USERNAME,
    BB_PASSWORD,
    BB_ORGANIZATION,
    GH_USERNAME,
    GH_PASSWORD,
    GH_ORGANIZATION
} = process.env

assert(BB_USERNAME && BB_PASSWORD && BB_ORGANIZATION && GH_USERNAME && GH_PASSWORD && GH_ORGANIZATION);

const bbAuth = Buffer.from(`${BB_USERNAME}:${BB_PASSWORD}`).toString('base64');
const ghAuth = Buffer.from(`${GH_USERNAME}:${GH_PASSWORD}`).toString('base64');

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const rm = promisify(fs.rm);

const fetchBBRepos = async (url) => {
    const { data } = await axios.get(url, {
        headers: {
            'Authorization': `Basic ${bbAuth}`
        }
    });
    const { next, values } = data;
    const repoNames = values.map((repo) => repo.name);
    return { repoNames, next };
}

const createGHRepoIfNotExists = async (repo) => {
    try {
        await axios.get(`https://api.github.com/repos/${GH_ORGANIZATION}/${repo}`, {
            headers: {
                'Authorization': `Basic ${ghAuth}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        console.log(`Repo ${repo} already exists on Github`);
        return;
    } catch (err) {
        // no-op
    }
    await axios.post(`https://api.github.com/orgs/${GH_ORGANIZATION}/repos`,
        {
            name: repo,
            visibility: 'private'
        }, {
        headers: {
            'Authorization': `Basic ${ghAuth}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    })
    console.log(`Created repo ${repo} on Github`);
}

(async () => {
    let repos = [];
    console.log('Fetching repos from Bitbucket...')
    let { repoNames, next } = await fetchBBRepos(`https://api.bitbucket.org/2.0/repositories/${BB_ORGANIZATION}`);
    repos = repos.concat(repoNames);
    while (next) {
        const { repoNames: _repoNames, next: _next } = await fetchBBRepos(next);
        repos = repos.concat(_repoNames);
        next = _next;
    }
    const numRepos = repos.length;
    console.log(`Fetched all ${numRepos} repo(s) from Bitbucket`, repos);
    if (!(await exists('tmp'))) {
        await mkdir('tmp');
    }
    for (const [repoIndex, repo] of repos.entries()) {
        if (await exists(`/tmp/${repo}.git`)) {
            await rm(`/tmp/${repo}.git`, { recursive: true });
        }
        const clone = cp.spawn('git', ['clone', '--bare', `git@bitbucket.org:${BB_ORGANIZATION}/${repo}.git`], { cwd: 'tmp', stdio: 'inherit' });
        await new Promise((resolve) => {
            clone.on('close', async () => {
                console.log(`Cloned repo ${repo}, now creating it on Github...`)
                await createGHRepoIfNotExists(repo);
                console.log(`Mirroring ${repo} on Github...`);
                const push = cp.spawn('git', ['push', '--mirror', `git@github.com:${GH_ORGANIZATION}/${repo}.git`], { cwd: `tmp/${repo}.git`, stdio: 'inherit' })
                await new Promise((_resolve) => {
                    push.on('close', async () => {
                        const reposLeft = numRepos - repoIndex - 1;
                        console.log(`Mirrored repo ${repo} on Github, ${reposLeft} repos left`);
                        await rm(`tmp/${repo}.git`, { recursive: true });
                        _resolve()
                    })
                });
                resolve();
            });
        })
    }
})();

