import { app } from 'electron'
import { z } from 'zod'

import { hasExecutable } from '../../os/path'

import type { PartialGpuInfo } from './index'

/**
 * Schema describing the return type of {@link app.getGPUInfo}
 * NOTE: The actual returned value contains a lot more properties that were
 * omitted for clarity here
 */
const GPUInfoSchema = z.object({
  gpuDevice: z.array(
    z.object({
      deviceId: z.number(),
      vendorId: z.number()
    })
  )
})

/**
 * Strategy here: Use Electron's {@link app.getGPUInfo} to get the device and
 * vendor IDs of all GPUs in the system. If possible, use `lspci` to then get
 * the subvendor and subdevice IDs and the current kernel driver in use
 */
async function getGpuInfo_linux(): Promise<PartialGpuInfo[]> {
  const gpus: PartialGpuInfo[] = []

  const gpuInfo = await app.getGPUInfo('basic')
  const verifiedInfo = GPUInfoSchema.parse(gpuInfo)
  const hasLspci = await hasExecutable('lspci')

  for (const gpu of verifiedInfo.gpuDevice) {
    gpus.push({
      // Electron gives us these IDs as numbers, most other use cases need
      // them as hexadecimal strings
      deviceId: gpu.deviceId.toString(16).padStart(4, '0'),
      vendorId: gpu.vendorId.toString(16).padStart(4, '0'),
      ...(hasLspci ? await getLspciInfo(gpu.deviceId, gpu.vendorId) : {})
    })
  }

  return gpus
}

/**
 * Uses `lspci` to find out the device's (1) subvendor id, (2) sub-device id
 * and (3) kernel driver in use
 * @param deviceId The device ID returned by {@link app.getGPUInfo}
 * @param vendorId The vendor ID returned by {@link app.getGPUInfo}
 */
async function getLspciInfo(
  deviceId: number,
  vendorId: number
): Promise<{
  subvendorId?: string
  subdeviceId?: string
  driverVersion?: string
}> {
  const { genericSpawnWrapper } = await import('../../os/processes')
  const { stdout } = await genericSpawnWrapper('lspci', [
    '-d', // work on the following device:
    `${vendorId.toString(16)}:${deviceId.toString(16)}`,
    '-mm', // machine-readable format
    '-k', // display kernel driver in use
    '-v', // be verbose (actually prints the kernel driver and PCI subsystem IDs)
    '-n' // only output numeric values (we'll get the names ourselves later)
  ])

  /*
  Sample output:
Slot:   04:00.0
Class:  0300
Vendor: 1002
Device: 163f
SVendor:        1002
SDevice:        0123
Rev:    ae
ProgIf: 00
Driver: amdgpu
Module: amdgpu

  */

  const match = stdout.match(
    /^SVendor:\t(.{4})\n^SDevice:\t(.{4})[\S\s]*^Driver:\t(\S*)/m
  )
  if (!match) return {}
  return {
    subvendorId: match[1],
    subdeviceId: match[2],
    driverVersion: match[3]
  }
}

export { getGpuInfo_linux }
