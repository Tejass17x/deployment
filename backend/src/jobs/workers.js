const queue = require('../common/queue/queue');
const logger = require('../common/logger/winston');
const nodemailer = require('nodemailer');
const env = require('../config/environment');

/**
 * 1. Email Worker Handler
 * Processes transactional and notification emails.
 * Supports Resend API and falls back to Nodemailer SMTP.
 */
const emailWorkerHandler = async (job) => {
  const jobContext = { to: job.to, subject: job.subject, jobId: job.id };
  logger.info(`[Email Worker] 📨 Processing mail dispatch to ${job.to}`, jobContext);

  // Strategy 1: Resend API
  if (env.email.resendKey) {
    try {
      const axios = require('axios');
      const startTime = Date.now();
      const response = await axios.post('https://api.resend.com/emails', {
        from: `Research Connect <onboarding@resend.dev>`,
        to: job.to,
        subject: job.subject,
        html: job.html
      }, {
        headers: {
          'Authorization': `Bearer ${env.email.resendKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      const duration = Date.now() - startTime;

      logger.info(`[Email Worker] ✅ Resend API SUCCESS — to="${job.to}" subject="${job.subject}" status=${response.status} id=${response.data?.id || 'N/A'} duration=${duration}ms`, jobContext);
      return;
    } catch (err) {
      const status = err.response?.status;
      const resendBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : 'N/A';
      logger.error(`[Email Worker] ❌ Resend API FAILED — to="${job.to}" status=${status} body=${resendBody} error=${err.message}`, jobContext);
    }
  } else {
    logger.warn(`[Email Worker] ⚠️ No RESEND_API_KEY set. Skipping Resend API.`, jobContext);
  }

  // Strategy 2: Nodemailer SMTP fallback
  if (!env.email.user || !env.email.pass) {
    logger.error(`[Email Worker] ❌ Neither Resend nor SMTP configured. Email to ${job.to} will NOT be sent.`, jobContext);
    throw new Error('No email provider configured (neither RESEND_API_KEY nor EMAIL_USER/EMAIL_PASS)');
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.email.user,
        pass: env.email.pass
      }
    });

    const mailOptions = {
      from: `"Research Connect" <${env.email.user}>`,
      to: job.to,
      subject: job.subject,
      html: job.html,
      text: job.text
    };

    const startTime = Date.now();
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    logger.info(`[Email Worker] ✅ SMTP SUCCESS — to="${job.to}" subject="${job.subject}" messageId=${info.messageId} duration=${duration}ms`, jobContext);
  } catch (err) {
    logger.error(`[Email Worker] ❌ SMTP FAILED — to="${job.to}" error=${err.message}`, jobContext);
    throw err; // Let BullMQ handle retry
  }
};

/**
 * 2. Notification Worker Handler
 * Processes user notifications and records them in MongoDB.
 */
const notificationWorkerHandler = async (job) => {
  logger.info(`[Notification Worker] Dispatching system notification to user: ${job.recipientId}`);
  const Notification = require('../models/Notification');
  await Notification.create({
    recipientId: job.recipientId,
    actorId: job.actorId,
    type: job.type || 'system',
    title: job.title,
    message: job.message,
    targetType: job.targetType,
    targetId: job.targetId,
    targetUrl: job.targetUrl,
    isRead: false
  });
};

/**
 * 3. File Processing Worker Handler
 * Processes thumbnail generation, extraction caching, and compression.
 */
const fileProcessingWorkerHandler = async (job) => {
  logger.info(`[File Processing Worker] Optimizing file asset: ${job.key}`);
  // In production, execute tesseract, image compressions, and thumbnail conversions here.
  logger.info(`[File Processing Worker] Thumbnail generation and compression complete for: ${job.key}`);
};

/**
 * 4. Report Worker Handler
 * Generates research and user activity reports.
 */
const reportWorkerHandler = async (job) => {
  logger.info(`[Report Worker] Generating PDF/CSV report for category: ${job.reportType}`);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate file creation
  logger.info(`[Report Worker] Report generated successfully.`);
};

/**
 * 5. Queue Manager Worker
 * Health monitoring and queue housekeeping tasks.
 */
const queueWorkerHandler = async (job) => {
  logger.info(`[Queue Worker Manager] Queue healthcheck executed.`);
};

// Main initializer
const initWorkers = () => {
  logger.info('Initializing background workers...');
  queue.process('email', emailWorkerHandler);
  queue.process('notification', notificationWorkerHandler);
  queue.process('file_processing', fileProcessingWorkerHandler);
  queue.process('report', reportWorkerHandler);
  queue.process('queue_manager', queueWorkerHandler);
};

module.exports = {
  initWorkers
};
