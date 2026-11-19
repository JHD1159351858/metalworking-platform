import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';

// 登录用户只能读取个人档案，自助建档时身份固定为未分班学生。
export const metalworkProfiles = pgTable(
  'metalwork_profiles',
  {
    user_id: uuid('user_id').primaryKey().default(sql`auth.uid()`),
    display_name: text('display_name').notNull(),
    student_number: text('student_number'),
    class_name: text('class_name').notNull(),
    role: text('role').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('metalwork_profiles_class_idx').on(table.class_name),
    pgPolicy('metalwork_profiles_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT auth.uid()) = user_id`,
    }),
    pgPolicy('metalwork_profiles_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id AND role = 'student' AND class_name = '未分班'`,
    }),
  ],
);

// 课前素养测评与问卷：学生只能读取和提交自己的记录，提交后不可更改。
export const metalworkPreAssessments = pgTable(
  'metalwork_pre_assessments',
  {
    user_id: uuid('user_id')
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => metalworkProfiles.user_id, { onDelete: 'cascade' }),
    trade_id: text('trade_id').notNull(),
    experience: text('experience').notNull(),
    confidence: text('confidence').notNull(),
    focus: text('focus').notNull(),
    note: text('note').notNull().default(''),
    answers: jsonb('answers').notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.trade_id] }),
    index('metalwork_pre_assessments_trade_idx').on(table.trade_id),
    pgPolicy('metalwork_pre_assessments_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT auth.uid()) = user_id`,
    }),
    pgPolicy('metalwork_pre_assessments_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
  ],
);

// 课程反馈：学生只能读取和提交自己的记录。
export const metalworkCourseFeedback = pgTable(
  'metalwork_course_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => metalworkProfiles.user_id, { onDelete: 'cascade' }),
    trade_id: text('trade_id').notNull(),
    type: text('type').notNull(),
    text: text('text').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('metalwork_course_feedback_student_trade_idx').on(
      table.user_id,
      table.trade_id,
      table.created_at,
    ),
    pgPolicy('metalwork_course_feedback_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT auth.uid()) = user_id`,
    }),
    pgPolicy('metalwork_course_feedback_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
  ],
);
