/**
 * Contains helper functions to work with the `pci.ids` file
 * ({@link https://pci-ids.ucw.cz})
 */
import axios, { AxiosError } from 'axios'
import path from 'path'

import { downloadFile, DAYS } from '../../inet/downloader'
import { toolsPath } from 'backend/constants'

import type { PartialGpuInfo } from './index'
import type { GPUInfo } from '../index'

const pciIdsMap: Record<
  string,
  {
    vendorName: string
    devices: Record<
      string,
      {
        deviceName: string
        subsystems: Record<`${string} ${string}`, string>
      }
    >
  }
> = {}

async function getPicIds(): Promise<typeof pciIdsMap | null> {
  if (Object.keys(pciIdsMap).length !== 0) return pciIdsMap

  const pciIdsFile = await downloadFile('https://pci-ids.ucw.cz/v2.2/pci.ids', {
    axiosConfig: {
      responseType: 'text'
    },
    writeToFile: path.join(toolsPath, 'pci.ids'),
    maxCache: 30 * DAYS
  }).catch((error) => error as AxiosError)
  if (axios.isAxiosError(pciIdsFile)) return null

  let currentVendor: string | null = null
  let currentDevice: string | null = null
  for (const line of pciIdsFile.split('\n')) {
    // Skip comments and empty lines
    if (line.startsWith('#')) continue
    if (line === '') continue

    // Case 1: Line describes a new vendor
    const vendorMatch = line.match(/^(.{4}) {2}(.*)$/)
    const vendorId = vendorMatch?.[1]
    const vendorName = vendorMatch?.[2]
    if (vendorId && vendorName) {
      pciIdsMap[vendorId] = { vendorName, devices: {} }
      currentVendor = vendorId
      continue
    }

    // Case 2: Line describes a new device
    const deviceMatch = line.match(/^\t(.{4}) {2}(.*)$/)
    const deviceId = deviceMatch?.[1]
    const deviceName = deviceMatch?.[2]
    if (deviceId && deviceName && currentVendor) {
      const vendorObj = pciIdsMap[currentVendor]
      if (!vendorObj) continue
      vendorObj.devices[deviceId] = { deviceName, subsystems: {} }
      currentDevice = deviceId
      continue
    }

    // Case 3: Line describes a new subsystem
    const subsystemMatch = line.match(/\t\t(.{4}) (.{4}) {2}(.*)$/)
    if (!subsystemMatch) continue
    const [, subvendor, subdevice, subsystemName] = subsystemMatch
    if (
      subvendor &&
      subdevice &&
      subsystemName &&
      currentVendor &&
      currentDevice
    ) {
      const deviceObj = pciIdsMap[currentVendor]?.devices[currentDevice]
      if (!deviceObj) continue
      deviceObj.subsystems[`${subvendor} ${subdevice}`] = subsystemName
    }
  }

  return pciIdsMap
}

async function populateDeviceAndVendorName(
  partialGpus: PartialGpuInfo[]
): Promise<GPUInfo[]> {
  const pciIds = await getPicIds()
  if (pciIds === null) return partialGpus

  const fullGpuInfo: GPUInfo[] = []
  for (const gpu of partialGpus) {
    const vendorId = gpu.vendorId.toLowerCase()
    const deviceId = gpu.deviceId.toLowerCase()
    const subvendorId = gpu.subvendorId?.toLowerCase()
    const subdeviceId = gpu.subdeviceId?.toLowerCase()
    const vendor = pciIds[vendorId]
    const device = pciIds[vendorId]?.devices[deviceId]
    const subsystem =
      pciIds[vendorId]?.devices[deviceId]?.subsystems[
        `${subvendorId} ${subdeviceId}`
      ]
    fullGpuInfo.push({
      ...gpu,
      deviceString: subsystem ?? device?.deviceName,
      vendorString: vendor?.vendorName
    })
  }
  return fullGpuInfo
}

export { populateDeviceAndVendorName }
