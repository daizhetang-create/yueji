# Yueji repository instructions

## Release policy

- After completing and verifying any user-visible version, do not publish it silently.
- Proactively ask the user: `本版本已验证，是否同步到 GitHub，并同时发布到 Cloudflare 与 GitHub Pages？`
- If the user confirms, run `npm run publish -- -Message "<concise version summary>"` from this repository.
- The publish command is the single supported release path. It checks the project, builds `docs/`, commits the complete version, pushes `main`, lets GitHub Pages update, and deploys the root build to the Cloudflare Pages project `yueji`.
- After publishing, verify both `https://yueji-e39.pages.dev/` and `https://daizhetang-create.github.io/yueji/`, then report the commit and both live statuses.
- Never commit `.env`, merchant private keys, API v3 keys, AppSecret, certificates, or user data.
