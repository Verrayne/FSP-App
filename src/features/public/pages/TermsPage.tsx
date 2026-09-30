import { LegalPage, type LegalSection } from './LegalPage'

const sections: LegalSection[] = [
  {
    title: 'Introduction',
    content: (
      <p>
        These terms describe the intended basis on which authorised users may access the FSP
        Compliance platform. Final contractual terms will be approved and issued by the confirmed
        service operator before production use.
      </p>
    ),
  },
  {
    title: 'Eligibility',
    content: (
      <p>
        Users must be legally capable of using the service and must act for a participating
        organisation where required. Additional eligibility requirements may apply.
      </p>
    ),
  },
  {
    title: 'Accounts',
    content: (
      <p>
        Users are responsible for keeping their credentials secure, providing accurate account
        information and notifying support of suspected unauthorised access.
      </p>
    ),
  },
  {
    title: 'Authorised FSP access',
    content: (
      <p>
        Identifying or selecting an FSP does not itself provide access. Users may act for an FSP
        only after access has been approved through the platform’s controlled authorisation process.
      </p>
    ),
  },
  {
    title: 'Acceptable use',
    content: (
      <p>
        Users must not misuse the platform, interfere with its security or availability, attempt
        unauthorised access, upload malicious material or use the service unlawfully.
      </p>
    ),
  },
  {
    title: 'Submission information',
    content: (
      <p>
        Users remain responsible for reviewing the accuracy and completeness of information
        submitted on behalf of an FSP. The platform does not provide legal or B-BBEE verification
        advice.
      </p>
    ),
  },
  {
    title: 'Uploaded documents',
    content: (
      <p>
        Users must have authority to upload documents and must ensure they are relevant, lawful and
        appropriate for the requested submission.
      </p>
    ),
  },
  {
    title: 'User responsibilities',
    content: (
      <p>
        Users must follow applicable submission instructions, maintain current contact details and
        use individual accounts rather than sharing credentials.
      </p>
    ),
  },
  {
    title: 'Intellectual property',
    content: (
      <p>
        Ownership and permitted use of the platform, its content and uploaded materials will be
        defined in the final contractual terms.
      </p>
    ),
  },
  {
    title: 'Availability',
    content: (
      <p>
        The service is intended to be available through supported browsers, but maintenance, faults
        and events outside the operator’s control may affect availability. Final service commitments
        remain to be agreed.
      </p>
    ),
  },
  {
    title: 'Suspension and termination',
    content: (
      <p>
        Access may be restricted where necessary to protect the platform, comply with law,
        investigate misuse or enforce the final terms. Detailed procedures remain subject to
        contractual review.
      </p>
    ),
  },
  {
    title: 'Liability',
    content: (
      <p>
        Appropriate limitations, exclusions and remedies will be settled during legal review. No
        detailed limitation of liability is stated in this prototype notice.
      </p>
    ),
  },
  {
    title: 'Privacy',
    content: (
      <p>
        Information handling is described in the Privacy Notice and will be governed by the final
        privacy documentation applicable to the service.
      </p>
    ),
  },
  {
    title: 'Changes to the terms',
    content: (
      <p>
        The final terms will explain how amendments are communicated and when updated terms take
        effect.
      </p>
    ),
  },
  {
    title: 'Governing law',
    content: (
      <p>
        The governing law, jurisdiction and dispute process will be confirmed by legal counsel
        before production use.
      </p>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        The operator’s legal and support contact details will be inserted once formally confirmed.
      </p>
    ),
  },
]

/** LEGAL REVIEW REQUIRED before production publication. */
export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      metaDescription="General terms governing intended use of the FSP Compliance platform by authorised Financial Services Provider users."
      description="These terms provide a conservative outline for use of the platform. Final contractual wording and operator details will be confirmed before production use."
      sections={sections}
    />
  )
}
