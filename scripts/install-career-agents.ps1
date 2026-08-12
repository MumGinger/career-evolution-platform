$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'integrations\codex\agents'
$targetDir = Join-Path $HOME '.codex\agents'

if (-not (Test-Path $sourceDir)) {
    throw "Career agent source directory not found: $sourceDir"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$agents = Get-ChildItem -Path $sourceDir -Filter '*.toml' -File
if ($agents.Count -eq 0) {
    throw "No Career Codex agent TOML files found in $sourceDir"
}

foreach ($agent in $agents) {
    Copy-Item -Path $agent.FullName -Destination (Join-Path $targetDir $agent.Name) -Force
}

Write-Host "Installed $($agents.Count) Career Evolution Platform agents to $targetDir"
$agents | ForEach-Object { Write-Host " - $($_.BaseName)" }
