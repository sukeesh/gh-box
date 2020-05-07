require("dotenv").config();
const {Octokit} = require("@octokit/rest");
const axios = require("axios");
const humanize = require('humanize-number');

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  CONSIDER_PRIVATE: considerPrivate
} = process.env;

const octokit = new Octokit({ auth: `token ${githubToken}` });

async function formatBytes(bytes, decimals = 0) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function main() {
  const arr = [];
  const isPrivate = (considerPrivate == 'true');
  const userDataRaw = octokit.users.getAuthenticated();
  const userData = JSON.parse(JSON.stringify(await userDataRaw)).data;
  const contributionData = await axios(`https://github-contributions.now.sh/api/v1/${userData.login}`);
  const pkDataRaw = octokit.users.listPublicKeys();
  const pkData = JSON.parse(JSON.stringify(await pkDataRaw)).data;
  arr.push(await formatBytes(userData.disk_usage*1024));
  isPrivate ? arr.push(userData.public_repos + userData.owned_private_repos) : arr.push(userData.public_repos);
  arr.push(contributionData.data.years[0].total);
  arr.push(contributionData.data.years[0].year);
  userData.hireable ? arr.push('💼 Opted to Hire') : arr.push('🚫 Not opted to Hire');
  arr.push(userData.public_gists);
  arr.push(pkData.length);
  await updateGist(arr);
}

async function updateGist(data) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];

  const contributionPoint = [
    `🏆 ${humanize(data[2])} Contributions in year ${data[3]}`
  ];
  lines.push(contributionPoint.join(" "));

  const totalDiskUsage = [
    `📦 Used ${data[0]} in GitHub's Storage`
  ];
  lines.push(totalDiskUsage.join(" "));

  const publicGists = [
    `📜 ${data[5]} Public Gists`
  ];
  lines.push(publicGists.join(" "));

  const publicKeys = [
    `🔑 ${data[6]} Public Keys`
  ];
  lines.push(publicKeys.join(" "));

  const isHireable = [
    data[4]
  ];
  lines.push(isHireable.join(" "));

  if (lines.length == 0) return;

  try {
    console.log(lines.join("\n"))
    // Get original filename to update that same file
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `🐱 GitHub Data`,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

(async () => {
  await main();
})();
