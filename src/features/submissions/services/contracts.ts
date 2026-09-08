export interface SubmissionOperations {
  startSubmission(input: { periodId: string }): Promise<{ submissionId: string }>
  uploadCertificate(input: {
    submissionId: string
    fileName: string
  }): Promise<{ documentId: string }>
  createAffidavit(input: { submissionId: string }): Promise<{ documentId: string }>
  finaliseSubmission(input: { submissionId: string }): Promise<void>
  reviewSubmission(input: {
    submissionId: string
    decision: 'approved' | 'rejected'
  }): Promise<void>
}
