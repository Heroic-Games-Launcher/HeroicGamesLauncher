import { execFile } from 'child_process'
import type { BrowserWindow } from 'electron'

// Windows refuses SetForegroundWindow from a background process while the
// user is sending input to another app. The usual way around it, as used by
// AutoHotkey's WinActivate: attach to the foreground thread's input queue,
// inject an Alt press, raise the window, and fall back to SwitchToThisWindow.
const USER32 = [
  'bool SetForegroundWindow(IntPtr h)',
  'bool ShowWindow(IntPtr h, int n)',
  'bool IsWindow(IntPtr h)',
  'IntPtr GetForegroundWindow()',
  'uint GetWindowThreadProcessId(IntPtr h, IntPtr p)',
  'bool AttachThreadInput(uint a, uint b, bool f)',
  'bool BringWindowToTop(IntPtr h)',
  'bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int z, uint f)',
  'void SwitchToThisWindow(IntPtr h, bool a)',
  'void keybd_event(byte k, byte s, uint f, UIntPtr e)'
]
  .map((sig) => `[DllImport("user32.dll")] public static extern ${sig};`)
  .join(' ')
const KERNEL32 =
  '[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();'

// PowerShell function that activates $t and reports the previous foreground
const ACTIVATE = [
  'function Activate($t) {',
  '  $fg = [W.U]::GetForegroundWindow();',
  '  if ($fg -eq $t) { return "prev=$fg already=True ok=True" };',
  '  $ft = [W.U]::GetWindowThreadProcessId($fg, [IntPtr]::Zero);',
  '  $ct = [W.U]::GetCurrentThreadId();',
  '  $att = ($ft -ne 0) -and ($ft -ne $ct) -and [W.U]::AttachThreadInput($ft, $ct, $true);',
  '  [W.U]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero);',
  '  [W.U]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero);',
  '  [W.U]::ShowWindow($t, 9) | Out-Null;',
  // HWND_TOPMOST then HWND_NOTOPMOST with NOSIZE|NOMOVE|SHOWWINDOW
  '  [W.U]::SetWindowPos($t, [IntPtr](-1), 0, 0, 0, 0, 0x43) | Out-Null;',
  '  [W.U]::SetWindowPos($t, [IntPtr](-2), 0, 0, 0, 0, 0x43) | Out-Null;',
  '  [W.U]::BringWindowToTop($t) | Out-Null;',
  '  $r1 = [W.U]::SetForegroundWindow($t);',
  '  if ($att) { [W.U]::AttachThreadInput($ft, $ct, $false) | Out-Null };',
  '  if ([W.U]::GetForegroundWindow() -ne $t) { [W.U]::SwitchToThisWindow($t, $true) };',
  '  Start-Sleep -Milliseconds 150;',
  '  return "prev=$fg attached=$att sfw=$r1 now=$([W.U]::GetForegroundWindow()) ok=$([W.U]::GetForegroundWindow() -eq $t)"',
  '}'
].join(' ')

function run(script: string): Promise<string> {
  const full = `Add-Type -Namespace W -Name U -MemberDefinition '${USER32} ${KERNEL32}'; ${ACTIVATE}; ${script}`
  return new Promise((resolve) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', full],
      // AttachThreadInput can stall on a hung thread, never block later calls
      { windowsHide: true, timeout: 8000 },
      (error, stdout, stderr) =>
        resolve(
          error ? `error: ${error.message} ${stderr}`.trim() : stdout.trim()
        )
    )
  })
}

const hwndOf = (win: BrowserWindow) =>
  win.getNativeWindowHandle().readBigUInt64LE(0).toString()

// Window that was in front the last time Heroic was pulled forward
let previousForeground = '0'

function rememberPrevious(detail: string) {
  const prev = /prev=(\d+)/.exec(detail)?.[1]
  if (prev && prev !== '0') previousForeground = prev
}

export async function forceForegroundWindow(
  win: BrowserWindow
): Promise<{ ok: boolean; detail: string }> {
  const detail = await run(`Activate ([IntPtr]${hwndOf(win)})`)
  if (!/already=True/.test(detail)) rememberPrevious(detail)
  return { ok: /ok=True/.test(detail), detail }
}

// Heroic in front: go back to the remembered window (or alt-tab).
// Otherwise: bring Heroic forward and remember what was in front.
export async function toggleForegroundWindow(
  win: BrowserWindow
): Promise<{ ok: boolean; detail: string }> {
  const script = [
    `$h = [IntPtr]${hwndOf(win)}; $p = [IntPtr]${previousForeground};`,
    'if ([W.U]::GetForegroundWindow() -ne $h) { "mode=forward " + (Activate $h) }',
    'elseif ($p -ne 0 -and [W.U]::IsWindow($p)) { "mode=back " + (Activate $p) }',
    'else {',
    // Alt+Tab keystroke as the generic "previous app"
    '  [W.U]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [W.U]::keybd_event(0x09, 0, 0, [UIntPtr]::Zero);',
    '  [W.U]::keybd_event(0x09, 0, 2, [UIntPtr]::Zero); [W.U]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero);',
    '  Start-Sleep -Milliseconds 300; "mode=alttab now=$([W.U]::GetForegroundWindow()) ok=$([W.U]::GetForegroundWindow() -ne $h)"',
    '}'
  ].join(' ')
  const detail = await run(script)
  if (/mode=forward/.test(detail)) rememberPrevious(detail)
  return { ok: /ok=True/.test(detail), detail }
}
