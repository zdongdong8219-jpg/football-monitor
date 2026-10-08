param([string]$Commit='local-snapshot')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$destination='D:\AAA项目文件\项目文件存档6666666666666666666666666666666666\模型备份包'
$null=[IO.Directory]::CreateDirectory($destination)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$target=Join-Path $destination "football-monitor-$stamp.zip"
$partial="$target.partial"
$allowed=@('.html','.js','.mjs','.json','.md','.ps1','.yml','.yaml','.css')
$files=Get-ChildItem -LiteralPath $root -File -Recurse | Where-Object {
  $relative=$_.FullName.Substring($root.Length+1).Replace('\','/')
  $allowed -contains $_.Extension.ToLowerInvariant() -and $relative -notmatch '(^|/)(\.git|node_modules|auth)(/|$)' -and $_.Name -notmatch '(?i)(token|credential|cookie|secret|^\.env)'
}
$stream=[IO.File]::Open($partial,[IO.FileMode]::CreateNew)
$archive=New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
try{
  foreach($file in $files){$relative=$file.FullName.Substring($root.Length+1).Replace('\','/');$null=[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$relative,[IO.Compression.CompressionLevel]::Optimal)}
  $entry=$archive.CreateEntry('BACKUP-MANIFEST.json');$writer=New-Object IO.StreamWriter($entry.Open(),(New-Object Text.UTF8Encoding($false)));try{$writer.Write((@{createdAt=(Get-Date).ToString('o');commit=$Commit;fileCount=$files.Count;project='football-monitor';ftModel='not included'}|ConvertTo-Json))}finally{$writer.Dispose()}
}finally{$archive.Dispose();$stream.Dispose()}
$check=[IO.Compression.ZipFile]::OpenRead($partial);try{foreach($required in @('public/index.html','data/state.json','data/latest.json','scripts/collect.mjs')){if(-not $check.GetEntry($required)){throw "Missing backup file: $required"}}}finally{$check.Dispose()}
[IO.File]::Move($partial,$target)
foreach($old in Get-ChildItem -LiteralPath $destination -File){if($old.Name -notmatch '^football-monitor-\d{8}-\d{6}-\d{3}\.zip$' -or $old.FullName -eq $target -or $old.LastWriteTime -gt (Get-Item $target).LastWriteTime){continue};Remove-Item -LiteralPath $old.FullName -ErrorAction Stop}
Write-Output "Backup ready: $target"
