export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { checkCompanyReplies } = await import('@/lib/agents/reply-agent');
    const { getDb } = await import('@/lib/db');

    // Prevent duplicate cron jobs during Next.js hot-reloading
    const globalRef = global as any;
    if (globalRef.emailCronTask) {
      console.log('⏰ [Cron] Stopping existing background reply-checker task (Reload)...');
      globalRef.emailCronTask.stop();
    }

    console.log('⏰ [Cron] Registering background email reply-checker (Runs every 5 minutes)...');

    globalRef.emailCronTask = cron.default.schedule('*/5 * * * *', async () => {
      try {
        console.log('⏰ [Cron] Checking company replies...');
        
        const db = getDb();
        const users = db.prepare('SELECT id FROM users').all() as { id: string }[];
        
        if (users.length === 0) {
          console.log('⏰ [Cron] No registered users. Skipping.');
          return;
        }

        for (const user of users) {
          const result = await checkCompanyReplies(user.id);
          if (result.processed > 0 || result.updates.length > 0) {
            console.log(`⏰ [Cron] Checked user ${user.id}: parsed ${result.processed} new emails, updated ${result.updates.length} applications.`);
          }
        }
      } catch (err: any) {
        console.error('⏰ [Cron Error] Failed during automated check:', err.message);
      }
    });
  }
}
