# Used by the "Hide a GPU while the game starts" game setting on Windows.
#
# Some games (Fortnite for example) ignore the GPU preference set in Windows / the
# GPU driver and command line options like -graphicsadapter, and pick a GPU on their
# own. On PCs with more than one GPU that can be the wrong one. The only reliable way
# to steer them is to hide the unwanted GPU while the game picks its adapter.
#
# This script:
#   1. Disables the GPU (needs admin, so Heroic starts this script elevated)
#   2. Waits until a new process whose exe lives in the game's folder opens a GPU
#      (the "GPU Engine" performance counters, same data Task Manager uses)
#   3. Re-enables the GPU a few seconds later, or right away once Heroic says the game
#      has exited, or after a timeout. It is always re-enabled, even on errors.
#
# All options come in as one base64-encoded JSON object so no quoting is needed when
# passing them through the UAC prompt:
#   instanceId : PnP instance ID of the GPU to hide
#   gameDir    : the game's install folder
#   statusFile : this script writes "disabled", "enabled" or "error" to it
#   stopFile   : Heroic creates this file once the game has exited
#   logFile    : progress log, Heroic copies it into the game's log
#   deadline   : Unix time in ms. If the UAC prompt was accepted after this, Heroic has
#                already launched the game without us, so do nothing
#   timeoutSec : re-enable the GPU after this many seconds even if the game wasn't seen

param([Parameter(Mandatory = $true)][string]$Params)

$ErrorActionPreference = 'Stop'

$opts = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Params)) | ConvertFrom-Json

$CodeDisabled = 22 # ConfigManagerErrorCode of a disabled device
$EnableDelaySec = 5 # how long the game gets to finish picking its adapter

function Write-Log([string]$message) {
  $line = (Get-Date -Format 'HH:mm:ss.fff') + ' ' + $message
  Add-Content -LiteralPath $opts.logFile -Value $line -Encoding UTF8
}

function Set-Status([string]$status) {
  Set-Content -LiteralPath $opts.statusFile -Value $status -Encoding ASCII
}

function Get-DeviceErrorCode {
  return (Get-PnpDevice -InstanceId $opts.instanceId).ConfigManagerErrorCode
}

function Invoke-Pnputil([string]$verb) {
  $output = & "$env:SystemRoot\System32\pnputil.exe" $verb $opts.instanceId
  Write-Log "pnputil $verb exited with $LASTEXITCODE"
  if ($LASTEXITCODE -ne 0) { Write-Log ($output | Out-String).Trim() }
}

function Test-StopRequested {
  return Test-Path -LiteralPath $opts.stopFile
}

# Exe names (without extension) anywhere inside the game folder
function Get-GameExeNames {
  $names = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  if ($opts.gameDir -and (Test-Path -LiteralPath $opts.gameDir)) {
    Get-ChildItem -LiteralPath $opts.gameDir -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue |
      ForEach-Object { [void]$names.Add($_.BaseName) }
  }
  return , $names
}

# Waits until a process that started after $existingPids, and whose exe is one of
# $exeNames, opens a GPU. Returns that process' name, or $null on timeout / stop.
function Wait-ForGame($existingPids, $exeNames) {
  $category = New-Object System.Diagnostics.PerformanceCounterCategory 'GPU Engine'
  $timeout = (Get-Date).AddSeconds($opts.timeoutSec)

  while ((Get-Date) -lt $timeout) {
    if (Test-StopRequested) {
      Write-Log 'Game exited before it opened a GPU'
      return $null
    }

    try { $instances = $category.GetInstanceNames() }
    catch { $instances = @() }

    # Instance names look like pid_1234_luid_0x00000000_0x0000D1A3_phys_0_eng_0_engtype_3D
    # One exists as soon as a process opens a GPU, which happens when it picks its
    # adapter, well before the first frame is rendered
    foreach ($instance in $instances) {
      if ($instance -notmatch '^pid_(\d+)_') { continue }
      $processId = [int]$Matches[1]
      if ($existingPids.Contains($processId)) { continue }

      # Doesn't need a process handle, so this works for anti-cheat protected games too
      try { $name = [System.Diagnostics.Process]::GetProcessById($processId).ProcessName }
      catch { continue }

      if ($exeNames.Count -gt 0 -and -not $exeNames.Contains($name)) {
        [void]$existingPids.Add($processId)
        continue
      }

      Write-Log "Game opened a GPU: $name (pid $processId)"
      return $name
    }

    Start-Sleep -Milliseconds 250
  }

  Write-Log "Game wasn't detected within $($opts.timeoutSec) seconds"
  return $null
}

if ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -gt $opts.deadline) {
  Write-Log 'Started too late, the game was already launched. Not hiding the GPU'
  Set-Status 'error'
  exit 1
}

$disabled = $false
try {
  # Processes running now can't be the game
  $existingPids = New-Object 'System.Collections.Generic.HashSet[int]'
  Get-Process | ForEach-Object { [void]$existingPids.Add($_.Id) }

  Write-Log "Disabling $($opts.instanceId)"
  Invoke-Pnputil '/disable-device'
  for ($i = 0; $i -lt 40 -and (Get-DeviceErrorCode) -ne $CodeDisabled; $i++) {
    Start-Sleep -Milliseconds 250
  }
  if ((Get-DeviceErrorCode) -ne $CodeDisabled) {
    Write-Log 'GPU did not get disabled'
    Set-Status 'error'
    exit 1
  }
  $disabled = $true
  Set-Status 'disabled'

  $exeNames = Get-GameExeNames
  if ($exeNames.Count -gt 0) {
    Write-Log "Watching for $($exeNames.Count) exe name(s) from $($opts.gameDir)"
  } else {
    Write-Log 'No exes found in the game folder, watching for any new process that opens a GPU'
  }

  if (Wait-ForGame $existingPids $exeNames) {
    for ($i = 0; $i -lt $EnableDelaySec * 4 -and -not (Test-StopRequested); $i++) {
      Start-Sleep -Milliseconds 250
    }
  }
} catch {
  Write-Log "Error: $_"
} finally {
  if ($disabled) {
    Invoke-Pnputil '/enable-device'
    Set-Status 'enabled'
  }
}
