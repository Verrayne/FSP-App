export interface PortfolioFilters {
  search: string
  submissionStatus: string
  regulatoryStatus: string
  relationshipStatus: string
  sort: 'name' | 'fsp_number' | 'submission_status' | 'submit_date'
  direction: 'asc' | 'desc'
  page: number
  pageSize: 10 | 25 | 50
}
export interface SubmissionFilters {
  search: string
  work: string
  reviewMode: string
  route: string
  periodId: string | null
  sort: 'submit_date' | 'fsp' | 'status'
  direction: 'asc' | 'desc'
  page: number
  pageSize: 10 | 25 | 50
}
