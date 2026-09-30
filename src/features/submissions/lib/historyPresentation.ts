export function submissionAttemptLabel(attemptNumber: number) {
  return attemptNumber === 1 ? 'Original submission' : `Resubmission ${attemptNumber - 1}`
}

export function readableHistoryCode(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}
