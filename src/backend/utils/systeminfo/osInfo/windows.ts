import { z } from 'zod'
import { genericSpawnWrapper } from '../../os/processes'

const Win32_OperatingSystem = z.object({
  Caption: z.string(),
  Version: z.string()
})

async function osInfo_windows(): Promise<{ name: string; version?: string }> {
  const { stdout } = await genericSpawnWrapper('powershell', [
    'Get-CimInstance',
    '-Class',
    'Win32_OperatingSystem',
    '-Property',
    'Caption,Version',
    '|',
    'Select-Object',
    'Caption,Version',
    '|',
    'ConvertTo-Json',
    '-Compress'
  ])
  try {
    const w32_os = Win32_OperatingSystem.parse(JSON.parse(stdout))
    return { name: w32_os.Caption, version: w32_os.Version }
  } catch {
    return { name: 'Unknown Windows Version' }
  }
}

export { osInfo_windows }
