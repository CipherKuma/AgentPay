import { pgTable, serial, text, timestamp, bigint, integer, varchar, boolean, index } from 'drizzle-orm/pg-core';

// Payment records
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  payer: varchar('payer', { length: 66 }).notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  serviceType: varchar('service_type', { length: 20 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  payerIdx: index('payments_payer_idx').on(table.payer),
  createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
}));

// Provider health metrics
export const providerMetrics = pgTable('provider_metrics', {
  id: serial('id').primaryKey(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  latencyMs: integer('latency_ms').notNull(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('metrics_provider_idx').on(table.providerId),
  recordedAtIdx: index('metrics_recorded_at_idx').on(table.recordedAt),
}));

// Daily usage aggregates (for dashboard)
export const dailyUsage = pgTable('daily_usage', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  payer: varchar('payer', { length: 66 }),  // null = all users
  totalRequests: integer('total_requests').default(0).notNull(),
  totalAmount: bigint('total_amount', { mode: 'bigint' }).default(0n).notNull(),
  serviceType: varchar('service_type', { length: 20 }),
}, (table) => ({
  datePayerIdx: index('daily_payer_idx').on(table.date, table.payer),
}));

// Types for inserts
export type NewPayment = typeof payments.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewProviderMetric = typeof providerMetrics.$inferInsert;
export type NewDailyUsage = typeof dailyUsage.$inferInsert;
