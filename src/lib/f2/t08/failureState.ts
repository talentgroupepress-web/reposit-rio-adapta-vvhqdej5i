import type { T08FailureCode, T08FailureResult } from './manualBatch'

export type { T08FailureCode, T08FailureResult }

export const T08_FAILURE_ORDER: T08FailureCode[] = [
  '401',
  '403',
  '429',
  'timeout',
  'payload_invalid',
]

export function failureStateLabel(result: T08FailureResult) {
  return result.safeState === 'fallback_manual' ? 'fallback_manual' : 'bloqueada'
}
