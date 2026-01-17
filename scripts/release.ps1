param(
  [Parameter(Position = 0)]
  [string]$Tag,

  [string]$Remote = "origin",
  [string]$Branch,

  [bool]$AutoCommit = $true,
  [string]$CommitMessage,

  [switch]$AllowDirty,
  [switch]$NoPushBranch,
  [switch]$NoPushTag,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ExecGit([string[]]$GitArgs) {
  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & git @GitArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldEap
  }
  if ($exitCode -ne 0) {
    throw ($output | Out-String).Trim()
  }
  return ($output | Out-String).TrimEnd()
}

function GetReleaseUrl([string]$RemoteUrl, [string]$TagName) {
  if (-not $RemoteUrl) { return $null }
  $url = $RemoteUrl.Trim()
  if ($url -match "^git@github\.com:(.+?)(?:\.git)?$") {
    return "https://github.com/$($Matches[1])/releases/tag/$TagName"
  }
  if ($url -match "^https://github\.com/(.+?)(?:\.git)?$") {
    return "https://github.com/$($Matches[1])/releases/tag/$TagName"
  }
  return $null
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git not found. Please install Git first."
}

$repoRoot = ExecGit @("rev-parse", "--show-toplevel")
Set-Location $repoRoot

if (-not $Branch) {
  $Branch = ExecGit @("branch", "--show-current")
}
if (-not $Branch) {
  throw "Detached HEAD. Cannot determine which branch to push."
}

$remoteList = ExecGit @("remote")
if (($remoteList -split "\r?\n") -notcontains $Remote) {
  throw "Remote '$Remote' not found. Existing remotes: $remoteList"
}

if (-not $Tag) {
  $Tag = (Read-Host "Tag to release (e.g. 5.8 or 5.8.0 or v5.8.0)").Trim()
}
while ($true) {
  if (-not $Tag) { throw "Tag is required." }
  if ($Tag -notmatch "\.") { throw "Tag must contain a dot (e.g. 5.8 or 5.8.0)." }

  $existsRemote = ExecGit @("ls-remote", "--tags", $Remote, "refs/tags/$Tag")
  if ($existsRemote -and -not $Force) {
    $Tag = (Read-Host "Remote tag already exists: $Tag. Enter a new tag, or press Enter to cancel").Trim()
    if (-not $Tag) { throw "Cancelled." }
    continue
  }
  break
}

$dirty = ExecGit @("status", "--porcelain")
if ($dirty) {
  if ($AllowDirty) {
    Write-Host "Working tree is dirty (continuing because -AllowDirty was set)."
  } elseif ($AutoCommit) {
    $msg = $CommitMessage
    if (-not $msg) { $msg = "Release $Tag" }
    Write-Host "Working tree is dirty. Auto-committing changes: $msg"
    ExecGit @("add", "-A") | Out-Null
    $staged = ExecGit @("diff", "--cached", "--name-only")
    if ($staged) {
      ExecGit @("commit", "-m", $msg) | Out-Null
    }
    $dirtyAfter = ExecGit @("status", "--porcelain")
    if ($dirtyAfter) {
      throw "Working tree is still dirty after auto-commit. Commit changes first (or pass -AllowDirty)."
    }
  } else {
    throw "Working tree is dirty. Commit changes first (or pass -AllowDirty)."
  }
}

$existsLocal = ExecGit @("tag", "--list", $Tag)
if ($existsLocal) {
  if ($existsRemote -and -not $Force) {
    throw "Tag already exists locally and on remote: $Tag (use -Force to override)."
  }
} else {
  if ($existsRemote -and -not $Force) {
    throw "Remote tag already exists: $Tag (use -Force to override)."
  }
}

$shouldCreateOrMoveTag = -not $existsLocal -or $Force
if ($shouldCreateOrMoveTag) {
  if ($existsLocal) {
    ExecGit @("tag", "-d", $Tag) | Out-Null
  }
  $message = "Release $Tag"
  ExecGit @("tag", "-a", $Tag, "-m", $message) | Out-Null
}

if (-not $NoPushBranch) {
  ExecGit @("push", $Remote, $Branch) | Out-Null
}

if (-not $NoPushTag) {
  if ($Force) {
    ExecGit @("push", $Remote, $Tag, "--force") | Out-Null
  } else {
    ExecGit @("push", $Remote, $Tag) | Out-Null
  }
}

$remoteUrl = ExecGit @("remote", "get-url", $Remote)
$releaseUrl = GetReleaseUrl $remoteUrl $Tag

if ($NoPushTag) {
  Write-Host "Tag created locally: $Tag"
} else {
  Write-Host "Tag pushed: $Tag"
  if ($releaseUrl) {
    Write-Host "Release page: $releaseUrl"
  }
  Write-Host "GitHub Actions should start building and publishing automatically."
}
