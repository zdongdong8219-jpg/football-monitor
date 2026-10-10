$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$gh='C:\Users\Administrator\Documents\Codex\2026-09-23\new-chat\work\publish-tools\bin\gh.exe'
$env:GH_CONFIG_DIR='C:\Users\Administrator\Documents\Codex\2026-09-23\new-chat\work\publish-tools\auth'
$repo='repos/zdongdong8219-jpg/football-monitor'
$latest=Join-Path $root 'data/latest.json'
$report=Get-Content $latest -Raw -Encoding UTF8 | ConvertFrom-Json
if(-not $report.date){throw 'Report date is required'}
$remotePayload=& $gh api "$repo/contents/data/latest.json?ref=main" | ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Cannot verify existing final report; publication stopped'}
$existing=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($remotePayload.content -replace '\s',''))) | ConvertFrom-Json
if($existing.date -eq $report.date -and $existing.finalLocked -eq $true){
  throw 'This sales date already has a locked final report. Preserve it; publish any user-authorized correction as a new audited version.'
}
$reports=Join-Path $root 'data/reports'
$null=[IO.Directory]::CreateDirectory($reports)
$archive=Join-Path $reports "$($report.date).json"
Copy-Item -LiteralPath $latest -Destination $archive -Force
& 'C:\Users\Administrator\AppData\Local\OpenAI\Codex\runtimes\cua_node\f53823cd54b14f45\bin\node.exe' (Join-Path $root 'scripts/check-build.mjs')
if($LASTEXITCODE -ne 0){throw 'Build check failed'}
$ref=& $gh api "$repo/git/ref/heads/main" | ConvertFrom-Json
$parent=& $gh api "$repo/git/commits/$($ref.object.sha)" | ConvertFrom-Json
$entries=@()
foreach($file in @($latest,$archive)){
  $relative=$file.Substring($root.Length+1).Replace('\','/')
  $payload=@{content=[Convert]::ToBase64String([IO.File]::ReadAllBytes($file));encoding='base64'}|ConvertTo-Json -Compress
  $blob=$payload|& $gh api "$repo/git/blobs" --method POST --input -|ConvertFrom-Json
  if($LASTEXITCODE -ne 0){throw "Upload failed: $relative"}
  $entries+=@{path=$relative;mode='100644';type='blob';sha=$blob.sha}
}
$treePayload=@{base_tree=$parent.tree.sha;tree=$entries}|ConvertTo-Json -Depth 10 -Compress
$tree=$treePayload|& $gh api "$repo/git/trees" --method POST --input -|ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Tree creation failed'}
$commitPayload=@{message="Publish football report $($report.date)";tree=$tree.sha;parents=@($ref.object.sha)}|ConvertTo-Json -Depth 10 -Compress
$commit=$commitPayload|& $gh api "$repo/git/commits" --method POST --input -|ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Commit creation failed'}
(@{sha=$commit.sha;force=$false}|ConvertTo-Json -Compress)|& $gh api "$repo/git/refs/heads/main" --method PATCH --input -|Out-Null
if($LASTEXITCODE -ne 0){throw 'Remote changed; report was not published'}
$remoteState=& $gh api "$repo/contents/data/state.json?ref=main" | ConvertFrom-Json
[IO.File]::WriteAllBytes((Join-Path $root 'data/state.json'),[Convert]::FromBase64String(($remoteState.content -replace '\s','')))
& (Join-Path $PSScriptRoot 'backup-football.ps1') -Commit $commit.sha
if($LASTEXITCODE -ne 0){throw 'Report published but local backup failed'}
Write-Output "Published report: $($report.date); commit: $($commit.sha)"
