param(
  [string]$Message = "Publish verified Yueji version"
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
Set-Location -LiteralPath $repoRoot

$remote = (git remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -notmatch 'daizhetang-create/yueji(?:\.git)?$') {
  throw 'Unexpected Git remote. Publishing stopped.'
}

npm run check
if ($LASTEXITCODE -ne 0) { throw 'Project checks failed. Publishing stopped.' }

npm run build:pages
if ($LASTEXITCODE -ne 0) { throw 'Website build failed. Publishing stopped.' }

git add -A
if ($LASTEXITCODE -ne 0) { throw 'Unable to stage release files.' }

$staged = git diff --cached --name-only
if ($staged) {
  git commit -m $Message
  if ($LASTEXITCODE -ne 0) { throw 'Unable to commit the release.' }
} else {
  Write-Output 'No new release changes to commit.'
}

git push origin main
if ($LASTEXITCODE -ne 0) { throw 'GitHub push failed.' }

Write-Output 'GitHub push complete. GitHub Pages will publish main/docs automatically.'
Write-Output 'Live URL: https://daizhetang-create.github.io/yueji/'
