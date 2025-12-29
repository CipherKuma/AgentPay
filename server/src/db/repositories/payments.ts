import { getDb, payments, type NewPayment, type Payment } from '../index.js';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

export class PaymentRepository {
  private get db() {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    return db;
  }

  async create(payment: NewPayment): Promise<Payment> {
    const [result] = await this.db.insert(payments).values(payment).returning();
    return result;
  }

  async getByPayer(payer: string, limit = 100): Promise<Payment[]> {
    return this.db.select()
      .from(payments)
      .where(eq(payments.payer, payer))
      .orderBy(desc(payments.createdAt))
      .limit(limit);
  }

  async getStats(payer?: string, startDate?: Date, endDate?: Date) {
    const conditions = [];
    if (payer) conditions.push(eq(payments.payer, payer));
    if (startDate) conditions.push(gte(payments.createdAt, startDate));
    if (endDate) conditions.push(lte(payments.createdAt, endDate));

    const result = await this.db.select({
      totalRequests: sql<number>`count(*)`,
      totalAmount: sql<bigint>`sum(${payments.amount})`,
      avgAmount: sql<number>`avg(${payments.amount})`,
    })
    .from(payments)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0];
  }

  async getDailyStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.db.select({
      date: sql<string>`date_trunc('day', ${payments.createdAt})`,
      requests: sql<number>`count(*)`,
      amount: sql<bigint>`sum(${payments.amount})`,
    })
    .from(payments)
    .where(gte(payments.createdAt, startDate))
    .groupBy(sql`date_trunc('day', ${payments.createdAt})`)
    .orderBy(sql`date_trunc('day', ${payments.createdAt})`);
  }

  async getStatsByService() {
    return this.db.select({
      serviceType: payments.serviceType,
      requests: sql<number>`count(*)`,
      amount: sql<bigint>`sum(${payments.amount})`,
    })
    .from(payments)
    .groupBy(payments.serviceType);
  }
}

export const paymentRepository = new PaymentRepository();
