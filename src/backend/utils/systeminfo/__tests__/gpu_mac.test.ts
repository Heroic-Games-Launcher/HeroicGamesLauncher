import { parseGpuCoreCount, parseMacGpus } from '../gpu/mac'

test('parseGpuCoreCount reads the core count ioreg reports', () => {
  const ioreg = `+-o AGXAcceleratorG16X  <class AGXAcceleratorG16X, id 0x1000004f8, registered, matched, active, busy 0 (0 ms), retain 39>
    {
      "IOClass" = "AGXAcceleratorG16X"
      "gpu-core-count" = 32
      "model" = "Apple M4 Max"
    }`
  expect(parseGpuCoreCount(ioreg)).toBe(32)
  expect(parseGpuCoreCount('')).toBe(0)
})

test('parseMacGpus reads Apple Silicon and PCI GPUs', () => {
  const output = JSON.stringify({
    SPDisplaysDataType: [
      {
        _name: 'Apple M4 Max',
        spdisplays_mtlgpufamilysupport: 'spdisplays_metal4',
        spdisplays_vendor: 'sppci_vendor_Apple',
        sppci_cores: '32',
        sppci_model: 'Apple M4 Max'
      },
      {
        _name: 'AMD Radeon Pro 5500M',
        'spdisplays_device-id': '0x7340',
        spdisplays_mtlgpufamilysupport: 'spdisplays_metal3',
        spdisplays_vendor: 'sppci_vendor_amd',
        'spdisplays_vendor-id': '0x1002',
        sppci_model: 'AMD Radeon Pro 5500M'
      }
    ]
  })

  expect(parseMacGpus(output)).toEqual([
    {
      deviceId: '',
      vendorId: '106b',
      deviceString: 'M4 Max (32-core GPU)',
      vendorString: 'Apple',
      driverVersion: 'Metal 4'
    },
    {
      deviceId: '7340',
      vendorId: '1002',
      deviceString: 'Radeon Pro 5500M',
      vendorString: 'AMD',
      driverVersion: 'Metal 3'
    }
  ])
})
