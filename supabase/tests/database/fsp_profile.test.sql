begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(33);

select extensions.has_function('public','update_fsp_profile',array['uuid','text'],'profile update gateway exists');
select extensions.has_function('public','save_fsp_address',array['uuid','uuid','text','text','text','text','text','text','text','text','boolean'],'address gateway exists');
select extensions.has_function('public','save_fsp_contact',array['uuid','uuid','text','text','text','text','text','boolean'],'contact gateway exists');
select extensions.ok(not has_table_privilege('authenticated','public.fsps','UPDATE'),'authenticated cannot directly update FSP rows');
select extensions.ok(not has_table_privilege('authenticated','public.addresses','INSERT'),'authenticated cannot directly insert addresses');
select extensions.ok(not has_table_privilege('authenticated','public.contacts','UPDATE'),'authenticated cannot directly update contacts');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc1","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.update_fsp_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','  Profile security test  ')$$,
  'FSP administrator can update allowlisted organisation data'
);
select extensions.is((select trade_name from public.fsps where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'),'Profile security test','profile values are normalized');
select extensions.is((select fsp_number from public.fsps where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'),'51234','protected FSP number remains unchanged');
select extensions.is((select actor_user_id from public.audit_events where event_type='FSP_PROFILE_UPDATED' order by occurrence_date desc limit 1),'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,'profile audit actor comes from auth context');
select extensions.throws_ok(
  $$select public.update_fsp_profile(target_fsp_id => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', target_trade_name => 'Valid', target_fsp_number => '99999')$$,
  null,null,'mass assignment of a protected field cannot resolve a gateway'
);
select extensions.lives_ok(
  $$select public.save_fsp_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,'POSTAL','10 Test Road','','','Cape Town','Western Cape','8000','ZA',true)$$,
  'administrator can add an address'
);
select extensions.is((select count(*) from public.addresses where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and line_1='10 Test Road' and active),1::bigint,'new address belongs to the selected FSP');
select extensions.throws_ok(
  $$select public.save_fsp_address(target_fsp_id => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', target_address_id => null, target_address_type => 'POSTAL', target_line_1 => 'Bad', target_line_2 => '', target_suburb => '', target_city => 'Cape Town', target_province => '', target_postal_code => '8000', target_country_code => 'ZA', target_primary => false, target_new_fsp_id => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')$$,
  null,null,'address FSP ownership cannot be mass-assigned'
);
select extensions.lives_ok(
  $$select public.save_fsp_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,'POSTAL','11 Test Road','','','Cape Town','Western Cape','8001','ZA',true)$$,
  'a second address can become primary atomically'
);
select extensions.is((select count(*) from public.addresses where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and address_type='POSTAL' and active and "primary"),1::bigint,'only one active primary address exists per type');
select extensions.lives_ok(
  $$select public.remove_fsp_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',(select id from public.addresses where line_1='10 Test Road' order by create_date desc limit 1))$$,
  'administrator can remove an owned address'
);
select extensions.is((select count(*) from public.addresses where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and line_1='10 Test Road' and not active),1::bigint,'address removal retains an inactive audit record');
select extensions.ok((select count(*) from public.audit_events where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and event_type like 'FSP_ADDRESS_%') >= 3,'address changes are audited');
select extensions.lives_ok(
  $$select public.save_fsp_contact('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,'Profile','Test','','profile.test@example.test','+27 21 555 0199',true)$$,
  'administrator can add a contact'
);
select extensions.is((select count(*) from public.contacts where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and email='profile.test@example.test' and active),1::bigint,'new contact belongs to the selected FSP');
select extensions.is((select count(*) from public.contacts where fsp_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001' and active and "primary"),1::bigint,'only one active primary contact exists');
select extensions.is((select count(*) from public.list_fsp_members('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')),3::bigint,'adding a contact does not grant platform access');
select extensions.lives_ok(
  $$select public.remove_fsp_contact('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',(select id from public.contacts where email='profile.test@example.test' limit 1))$$,
  'administrator can soft-remove an owned contact'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc2","role":"authenticated"}';
select extensions.throws_ok($$select public.update_fsp_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','Denied')$$,'42501',null,'submitter cannot update the profile');
select extensions.throws_ok($$select public.save_fsp_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',null,'BUSINESS','Denied','','','Cape Town','','8000','ZA',false)$$,'42501',null,'submitter cannot add an address');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.throws_ok($$select public.save_fsp_contact('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',null,'Denied','Viewer','','','','false')$$,null,null,'viewer cannot add a contact');
select extensions.throws_ok($$select public.remove_fsp_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','ab000000-0000-4000-8000-000000000001')$$,'42501',null,'cross-FSP address mutation is denied');
select extensions.throws_ok($$select public.remove_fsp_contact('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','ac000000-0000-4000-8000-000000000001')$$,'42501',null,'cross-FSP contact mutation is denied');
reset role;

update public.fsp_users set role='ADMIN' where id='fd000000-0000-4000-8000-000000000004';
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc4","role":"authenticated"}';
select extensions.lives_ok($$select public.update_fsp_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','Multi-FSP admin test')$$,'role is evaluated as administrator for FSP A');
select extensions.throws_ok($$select public.update_fsp_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','Denied')$$,'42501',null,'the same user remains a viewer for FSP B');
reset role;

update public.fsp_users set status='REVOKED' where id='fd000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","role":"authenticated"}';
select extensions.is((select count(*) from public.fsps where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002'),0::bigint,'revoked membership loses profile read access');
select extensions.throws_ok($$select public.update_fsp_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','Denied')$$,'42501',null,'revoked membership cannot update the profile');
reset role;

select * from extensions.finish();
rollback;
