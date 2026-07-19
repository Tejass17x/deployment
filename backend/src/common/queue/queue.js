const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../logger/winston');

// Redis URL fallback to localhost
const REDIS_URI = process.env.REDIS_URL || 'redis://localhost:6379';

// ioredis connection instance with graceful fallback
let connection = null;
let redisAvailable = false;

try {
  const options = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableOfflineQueue: false, // Don't queue commands when disconnected
    retryStrategy: (times) => {
      // Upstash frequently drops idle connections. We MUST keep retrying.
      // Exponential backoff: 50ms → 100ms → 150ms ... max 3000ms
      return Math.min(times * 50, 3000);
    },
    keepAlive: 30000,          // Send TCP keepalive every 30s to prevent idle drops
    connectionTimeout: 10000,  // Timeout if connection takes >10s
    maxRetriesPerRequest: null,
    lazyConnect: true,         // Don't connect until first operation
    reconnectOnError: (err) => {
      logger.warn(`[BULLMQ] Redis reconnect triggered by error: ${err.message}`);
      return true;             // Always try to reconnect
    }
  };
  connection = new IORedis(REDIS_URI, options);

  connection.on('connect', () => {
    redisAvailable = true;
    logger.info('[BULLMQ] Redis connected for queue management.');
  });

  connection.on('ready', () => {
    redisAvailable = true;
    logger.info('[BULLMQ] Redis client ready.');
  });

  connection.on('error', (err) => {
    if (redisAvailable) {
      redisAvailable = false;
      logger.warn(`[BULLMQ] Redis error: ${err.message}. Queue jobs will be processed inline.`);
    }
  });

  connection.on('close', () => {
    redisAvailable = false;
    logger.warn('[BULLMQ] Redis connection closed. Will auto-reconnect.');
  });

  connection.on('reconnecting', (delay) => {
    logger.info(`[BULLMQ] Redis reconnecting in ${delay}ms...`);
  });
} catch (err) {
  logger.warn('[BULLMQ] Redis not available. Queue jobs will be processed inline.');
}

const queues = {};
const workers = {};

class BullMQAdapter {
  /**
   * Enqueue a job to BullMQ
   */
  async enqueue(queueName, jobData) {
    if (!redisAvailable || !connection) {
      logger.warn(`[BULLMQ] Redis unavailable. Skipping queue job for ${queueName}.`);
      return null;
    }

    try {
      if (!queues[queueName]) {
        queues[queueName] = new Queue(queueName, {
          connection,
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        });
      }

      const job = await queues[queueName].add('job', jobData);
      logger.info(`[BULLMQ] Job ${job.id} successfully enqueued to ${queueName}`);
      return job.id;
    } catch (err) {
      logger.warn(`[BULLMQ] Redis unavailable for ${queueName}. Job skipped.`);
      return null;
    }
  }

  /**
   * Register and start a background worker loop for a queue
   */
  process(queueName, handler) {
    if (workers[queueName]) {
      logger.warn(`[BULLMQ] Worker for queue ${queueName} already registered.`);
      return;
    }

    if (!redisAvailable || !connection) {
      logger.warn(`[BULLMQ] Redis unavailable. Worker for ${queueName} not started.`);
      return;
    }

    logger.info(`[BULLMQ] Starting Worker loop for queue: ${queueName}`);

    const worker = new Worker(queueName, async (job) => {
      // Execute the original handler passing job data
      return handler(job.data);
    }, {
      connection,
      concurrency: 10 // process up to 10 jobs concurrently
    });

    worker.on('completed', (job) => {
      logger.info(`[BULLMQ SUCCESS] Job ${job.id} in queue ${queueName} completed.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[BULLMQ FAILED] Job ${job?.id} in queue ${queueName} failed with error: ${err.message}`);
    });

    workers[queueName] = worker;
  }
}

module.exports = new BullMQAdapter();
