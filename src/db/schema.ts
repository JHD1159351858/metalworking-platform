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

// 同班教师可见学生的判定表达式：全部使用裸列名，避免生成 Schema 或别名限定写法。
const classScope = sql.raw(`(user_id IN (
    SELECT user_id FROM metalwork_profiles
    WHERE role = 'student'
      AND class_name IN (
        SELECT class_name FROM metalwork_profiles
        WHERE user_id = (SELECT auth.uid()) AND role = 'teacher'
      )
  ))`);

// 班级名单：登录用户可读名单（教师据此查看本班学生），只能为自己建档。
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
      using: sql`(SELECT auth.uid()) IS NOT NULL`,
    }),
    pgPolicy('metalwork_profiles_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
  ],
);

// 课前素养测评与问卷：学生自读写，教师可读同班学生。
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
      using: sql`(SELECT auth.uid()) = user_id OR ${classScope}`,
    }),
    pgPolicy('metalwork_pre_assessments_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
    pgPolicy('metalwork_pre_assessments_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT auth.uid()) = user_id`,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
  ],
);

// 课程反馈：学生提交后不可修改，教师可读同班学生。
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
      using: sql`(SELECT auth.uid()) = user_id OR ${classScope}`,
    }),
    pgPolicy('metalwork_course_feedback_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT auth.uid()) = user_id`,
    }),
  ],
);
