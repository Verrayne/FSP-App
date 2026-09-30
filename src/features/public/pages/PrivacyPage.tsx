import { LegalPage, type LegalSection } from './LegalPage'

const sections: LegalSection[] = [
  {
    title: 'Introduction',
    content: (
      <p>
        This notice explains, at a general level, how personal and business information may be
        handled when using the FSP Compliance platform in South Africa. The final notice will
        reflect the operator’s confirmed practices and responsibilities under the Protection of
        Personal Information Act, 2013 (POPIA).
      </p>
    ),
  },
  {
    title: 'Information we collect',
    content: (
      <p>
        Information may include account details, FSP organisation information, submission
        information, uploaded documents and technical records required to operate and protect the
        service.
      </p>
    ),
  },
  {
    title: 'How information is used',
    content: (
      <p>
        Information may be used to provide the service, manage authorised access, support annual
        compliance submissions, respond to support requests, maintain security and meet applicable
        operational or legal requirements.
      </p>
    ),
  },
  {
    title: 'Account information',
    content: (
      <p>
        Account information may include a user’s name, business email address, verification state
        and records relating to access. Final required fields and identity-verification practices
        remain to be confirmed.
      </p>
    ),
  },
  {
    title: 'FSP information',
    content: (
      <p>
        The service is intended to hold organisation information associated with registered
        Financial Services Providers and their insurer relationships. Access will be based on
        controlled authorisation relationships.
      </p>
    ),
  },
  {
    title: 'Uploaded documents',
    content: (
      <p>
        Certificates, affidavits and supporting documents will be stored privately and made
        available only through authorised access paths. Final document classifications and handling
        procedures remain to be approved.
      </p>
    ),
  },
  {
    title: 'Service and security logs',
    content: (
      <p>
        Technical and audit records may be created to operate the service, investigate faults,
        protect accounts and record significant submission activity. The final logging scope will
        avoid unnecessary sensitive content.
      </p>
    ),
  },
  {
    title: 'Who information may be shared with',
    content: (
      <p>
        Information may be shared with the relevant insurer, authorised FSP users and service
        providers required to operate the platform. The final categories of recipients and
        subprocessors will be documented after operational review.
      </p>
    ),
  },
  {
    title: 'Information security',
    content: (
      <p>
        The platform is designed around controlled access, private document storage, encrypted
        network communication, auditability and least privilege. No statement on this page
        represents a security certification.
      </p>
    ),
  },
  {
    title: 'Data retention',
    content: (
      <p>
        Information will be retained according to applicable legal, contractual and operational
        requirements. Specific retention periods have not yet been approved and are not stated here.
      </p>
    ),
  },
  {
    title: 'Cross-border processing',
    content: (
      <p>
        Any cross-border processing arrangements will be assessed and documented before production
        use. Hosting locations and transfer safeguards are still subject to operational and legal
        confirmation.
      </p>
    ),
  },
  {
    title: 'User and data-subject rights',
    content: (
      <p>
        Individuals may have rights under POPIA and other applicable law, including rights relating
        to access, correction, objection or complaints. The final request process and responsible
        contact details will be published before launch.
      </p>
    ),
  },
  {
    title: 'Cookies and similar technologies',
    content: (
      <p>
        The application may use technologies necessary for secure sessions and essential
        functionality. Any optional analytics or additional cookie use will require a separate
        decision and appropriate notice.
      </p>
    ),
  },
  {
    title: 'Contact information',
    content: (
      <p>
        Privacy contact and Information Officer details will be inserted after the operator and
        responsible persons are formally confirmed.
      </p>
    ),
  },
  {
    title: 'Changes to this notice',
    content: (
      <p>
        This notice may be updated when the platform, legal requirements or operating arrangements
        change. The effective date and material-change process will be added to the production
        notice.
      </p>
    ),
  },
]

/** LEGAL REVIEW REQUIRED before production publication. */
export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      metaDescription="General information about how the FSP Compliance platform is designed to handle account, FSP, document and submission information."
      description="This notice describes the intended approach to personal and business information. It will be finalised to reflect confirmed legal and operational arrangements before production use."
      sections={sections}
    />
  )
}
