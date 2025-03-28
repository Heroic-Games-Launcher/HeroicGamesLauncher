import { fixAsarPath, publicDir } from 'backend/constants/paths'
import { spawnSync } from 'child_process'
import { join } from 'path'
import { gte as semverGte } from 'semver'

const vulkanHelperBin = fixAsarPath(
  join(publicDir, 'bin', process.arch, process.platform, 'vulkan-helper')
)

type VulkanVersion = [maj: number, min: number, patch: number]

let instance_version: ReturnType<typeof spawnSync> | null = null
let physical_versions: ReturnType<typeof spawnSync> | null = null

/**
 * @returns The version of the installed Vulkan API interface, or `false` if
 * unsupported. <br>
 * Note that this is the interface version, not the version a user's GPU(s)
 * support. For that, see {@link get_supported_vulkan_versions}
 */
function get_vulkan_instance_version(): VulkanVersion | false {
  if (!instance_version)
    instance_version = spawnSync(vulkanHelperBin, ['instance-version'], {
      encoding: 'utf-8'
    })

  try {
    return JSON.parse(instance_version.stdout.toString()) as VulkanVersion
  } catch {
    return false
  }
}

/**
 * @returns A list of device names and their supported Vulkan versions
 */
function get_supported_vulkan_versions(): [
  name: string,
  version: VulkanVersion
][] {
  if (!physical_versions)
    physical_versions = spawnSync(vulkanHelperBin, ['physical-versions'], {
      encoding: 'utf-8'
    })
  try {
    const output = JSON.parse(physical_versions.stdout.toString()) as Array<{
      name: string
      major: number
      minor: number
      patch: number
    }>
    return output.map(({ name, major, minor, patch }) => [
      name,
      [major, minor, patch]
    ])
  } catch {
    return []
  }
}

function get_nvngx_path(): string {
  const result = spawnSync(vulkanHelperBin, ['nvapi-path'], {
    encoding: 'utf-8'
  })

  return result.stdout.trim()
}

/**
 * Helper function to detect if any GPU in the system supports a specified Vulkan version
 * @returns The name of first the adapter supporting the target version, or `false` if none do
 */
function any_gpu_supports_version(
  target_version: VulkanVersion
): string | false {
  for (const [name, supported_version] of get_supported_vulkan_versions()) {
    if (semverGte(supported_version.join('.'), target_version.join('.'))) {
      return name
    }
  }
  return false
}

export { get_vulkan_instance_version, any_gpu_supports_version, get_nvngx_path }
