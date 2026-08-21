# Yueji repository instructions

## Release policy

- After completing and verifying any user-visible version, do not publish it silently.
- Proactively ask the user: `本版本已验证，是否同步到 GitHub 并发布到线上网址？`
- If the user confirms, run `npm run publish -- -Message "<concise version summary>"` from this repository.
- The publish command is the single supported release path. It checks the project, builds `docs/`, commits the complete version, pushes `main`, and lets GitHub Pages update the live site.
- After publishing, verify `https://daizhetang-create.github.io/yueji/` and report the commit and live status.
- Never commit `.env`, merchant private keys, API v3 keys, AppSecret, certificates, or user data.
