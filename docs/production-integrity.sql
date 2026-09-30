-- Read-only production integrity check. Run with a privileged read-only session.
-- Every count should be zero. Investigate; never auto-delete or auto-repair.
begin read only;

select 'duplicate_fsp_numbers' as check_name, count(*) as issue_count
from (select fsp_number from public.fsps group by fsp_number having count(*) > 1) issues
union all
select 'orphan_tenant_fsps', count(*)
from public.tenant_fsps tf
left join public.tenants t on t.id = tf.tenant_id
left join public.fsps f on f.id = tf.fsp_id
where t.id is null or f.id is null
union all
select 'orphan_submissions', count(*)
from public.submissions s
left join public.submission_periods sp on sp.id = s.submission_period_id
left join public.tenant_fsps tf on tf.id = s.tenant_fsp_id
where sp.id is null or tf.id is null or sp.tenant_id <> tf.tenant_id
union all
select 'orphan_documents', count(*)
from public.documents d left join public.submissions s on s.id = d.submission_id
where s.id is null
union all
select 'broken_current_document_versions', count(*)
from public.documents d
left join public.document_versions dv on dv.id = d.current_version_id and dv.document_id = d.id
where d.current_version_id is not null and dv.id is null
union all
select 'orphan_attempt_documents', count(*)
from public.submission_attempt_documents sad
left join public.submission_attempts sa on sa.id = sad.attempt_id
left join public.documents d on d.id = sad.document_id
left join public.document_versions dv on dv.id = sad.document_version_id
where sa.id is null or d.id is null or dv.id is null or d.submission_id <> sa.submission_id or dv.document_id <> d.id
union all
select 'cross_questionnaire_responses', count(*)
from public.submission_responses sr
join public.submissions s on s.id = sr.submission_id
join public.submission_periods sp on sp.id = s.submission_period_id
join public.questionnaire_questions qq on qq.id = sr.questionnaire_question_id
where qq.questionnaire_version_id <> sp.questionnaire_version_id
union all
select 'duplicate_notifications', count(*)
from (select event_id, user_id from public.notifications where event_id is not null group by event_id, user_id having count(*) > 1) issues
union all
select 'orphan_notification_deliveries', count(*)
from public.notification_deliveries d
left join public.notification_events e on e.id = d.event_id
left join public.notifications n on n.id = d.notification_id
where e.id is null or n.id is null
union all
select 'orphan_registry_records', count(*)
from public.fsp_source_records r
left join public.fsp_registry_imports i on i.id = r.import_id
left join public.fsp_registry_sources s on s.id = r.source_id
where i.id is null or s.id is null;

rollback;
