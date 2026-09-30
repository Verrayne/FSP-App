import { Badge, Card } from '../../../components/ui'
import { formatTimestamp } from '../../dashboard/lib/dashboardPresentation'
import { displayAnswer, questionState } from '../lib/submissionRules'
import type { QuestionValue, SubmissionWorkflow } from '../types/submission'

export function ReviewPanel({
  workflow,
  responses,
  route,
}: {
  workflow: SubmissionWorkflow
  responses: Record<string, QuestionValue>
  route: SubmissionWorkflow['route']
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Review submission</h2>
        <Badge variant="info">
          {route === 'AFFIDAVIT'
            ? 'Affidavit'
            : route === 'CERTIFICATE'
              ? 'Certificate'
              : 'Route pending'}
        </Badge>
      </div>
      {workflow.sections.map((section) => (
        <Card key={section.id} className="p-5">
          <h3 className="font-semibold">{section.title}</h3>
          <dl className="mt-3 divide-y">
            {section.questions
              .filter((question) => questionState(question, workflow.conditions, responses).visible)
              .map((question) => (
                <div
                  key={question.id}
                  className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="text-sm text-slate-600">{question.label}</dt>
                  <dd className="text-sm font-medium text-slate-950">
                    {displayAnswer(question, responses[question.id])}
                  </dd>
                </div>
              ))}
          </dl>
        </Card>
      ))}
      <Card className="p-5">
        <h3 className="font-semibold">{route === 'AFFIDAVIT' ? 'Declaration' : 'Certificate'}</h3>
        {route === 'AFFIDAVIT' ? (
          workflow.declaration ? (
            <p className="mt-2 text-sm text-slate-600">
              Accepted by {workflow.declaration.declarantName} on{' '}
              {formatTimestamp(workflow.declaration.acceptedDate)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-red-700">Declaration acknowledgement is incomplete.</p>
          )
        ) : workflow.document?.currentVersion ? (
          <p className="mt-2 text-sm text-slate-600">
            {workflow.document.currentVersion.originalFilename}
          </p>
        ) : (
          <p className="mt-2 text-sm text-red-700">Certificate upload is incomplete.</p>
        )}
      </Card>
    </div>
  )
}
