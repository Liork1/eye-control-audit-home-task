-- Reference seed data (16 rows across 3 tenants).
-- Prefer: npm run db:seed (idempotent via service-role client)

TRUNCATE audit_log;

INSERT INTO audit_log (tenant_id, user_id, action, resource, payload, created_at) VALUES
  ('tenant-a', 'user-1', 'PATIENT_VIEWED',   'patient/101', '{"department":"cardiology"}', '2025-06-01T09:15:00Z'),
  ('tenant-a', 'user-1', 'PATIENT_UPDATED',  'patient/101', '{"field":"notes"}',           '2025-06-01T10:30:00Z'),
  ('tenant-a', 'user-2', 'APPOINTMENT_CREATED', 'appointment/501', '{"duration":30}',      '2025-06-02T08:00:00Z'),
  ('tenant-a', 'user-2', 'REPORT_EXPORTED',  'report/monthly', '{"format":"pdf"}',         '2025-06-03T14:45:00Z'),
  ('tenant-a', 'user-1', 'LOGIN',            'auth/session',  '{}',                        '2025-06-04T07:00:00Z'),
  ('tenant-a', 'user-3', 'PRESCRIPTION_ISSUED','patient/205', '{"medication":"amoxicillin"}','2025-06-05T11:20:00Z'),

  ('tenant-b', 'user-4', 'PATIENT_VIEWED',   'patient/301', '{"department":"neurology"}',  '2025-06-01T12:00:00Z'),
  ('tenant-b', 'user-4', 'LAB_RESULT_ADDED', 'patient/301/lab/12', '{"type":"blood"}',     '2025-06-02T16:30:00Z'),
  ('tenant-b', 'user-5', 'USER_INVITED',     'user/509',      '{"role":"nurse"}',           '2025-06-03T09:10:00Z'),
  ('tenant-b', 'user-5', 'SETTINGS_CHANGED', 'settings/notifications', '{"email":true}',    '2025-06-04T13:00:00Z'),
  ('tenant-b', 'user-4', 'LOGOUT',           'auth/session',  '{}',                        '2025-06-05T18:45:00Z'),

  ('tenant-c', 'user-6', 'PATIENT_VIEWED',   'patient/401', '{"department":"orthopedics"}','2025-06-01T08:30:00Z'),
  ('tenant-c', 'user-6', 'IMAGING_ORDERED',  'patient/401/imaging', '{"type":"xray"}',      '2025-06-02T10:15:00Z'),
  ('tenant-c', 'user-7', 'BILLING_UPDATED',  'billing/invoice/88', '{"amount":250}',      '2025-06-03T15:40:00Z'),
  ('tenant-c', 'user-7', 'NOTE_ADDED',       'patient/402', '{"visibility":"internal"}',    '2025-06-04T11:55:00Z'),
  ('tenant-c', 'user-6', 'PATIENT_ARCHIVED', 'patient/399', '{}',                          '2025-06-06T09:00:00Z');
