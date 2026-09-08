/**
 * Trusted operation ports. Implementations belong in authenticated server-side
 * API handlers once the Prompt 02 authorization model exists.
 */
export interface FspOperations {
  claimFsp(input: { fspId: string }): Promise<{ claimId: string }>
  inviteFspUser(input: { fspId: string; email: string }): Promise<{ invitationId: string }>
  removeFspUser(input: { membershipId: string }): Promise<void>
}
