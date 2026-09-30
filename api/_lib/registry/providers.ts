import { ManualCsvProvider } from './manualCsvProvider.js'
import type { RegistryProvider } from './types.js'

class MockRegistryProvider extends ManualCsvProvider {
  override code = 'DEVELOPMENT_FIXTURE'
}

class FscaAuthorisedProvider implements RegistryProvider {
  code = 'FSCA_AUTHORISED'
  parse(): Promise<never> {
    return Promise.reject(new Error('FSCA_AUTHORISED_PROVIDER_NOT_CONFIGURED'))
  }
}

export function getRegistryProvider(code: string): RegistryProvider {
  if (code === 'FSCA_MANUAL_CSV') return new ManualCsvProvider()
  if (code === 'DEVELOPMENT_FIXTURE') return new MockRegistryProvider()
  if (code === 'FSCA_AUTHORISED') return new FscaAuthorisedProvider()
  throw new Error('UNKNOWN_REGISTRY_PROVIDER')
}
