import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle/schema';
import * as relations from './drizzle/relations';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error('DATABASE_URL is required');
        const client = postgres(connectionString, { prepare: false }); // prepare: false for PgBouncer
        return drizzle(client, { schema: { ...schema, ...relations } });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
