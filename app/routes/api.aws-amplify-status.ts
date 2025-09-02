import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { AmplifyClient, GetJobCommand, ListJobsCommand, GetDomainAssociationCommand } from '@aws-sdk/client-amplify';

interface StatusRequestBody {
  appId: string;
  jobId: string;
  domainName?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { appId, jobId, domainName } = (await request.json()) as StatusRequestBody;

    // Get AWS credentials from Cloudflare context or environment variables
    const env = (context.cloudflare?.env as any) || process.env;
    const accessKeyId = env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    const region = env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      return json({ error: 'AWS credentials not configured in environment variables' }, { status: 401 });
    }

    // Initialize AWS Amplify client
    const amplifyClient = new AmplifyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Check if this is a manual/fallback job ID (timestamp format)
    const isManualJobId = /^\d{13}$/.test(jobId); // 13-digit timestamp

    if (isManualJobId) {
      // This is a manual deployment, return a mock status
      console.log(`Manual deployment job ${jobId} - returning mock status`);

      return json({
        status: 'UPLOADED',
        statusReason: 'Files uploaded to S3. Manual deployment required.',
        startTime: new Date(parseInt(jobId)).toISOString(),
        endTime: null,
        steps: [
          {
            stepName: 'UPLOAD',
            status: 'SUCCEED',
            startTime: new Date(parseInt(jobId)).toISOString(),
            endTime: new Date(parseInt(jobId) + 5000).toISOString(),
            logUrl: null,
          },
          {
            stepName: 'MANUAL_DEPLOY',
            status: 'PENDING',
            startTime: null,
            endTime: null,
            logUrl: null,
          },
        ],
        artifacts: {},
        isManual: true,
        message: 'This deployment requires manual completion in AWS Amplify console.',
      });
    }

    try {
      // Get job status from AWS Amplify for real job IDs
      const getJobCommand = new GetJobCommand({
        appId,
        branchName: 'main',
        jobId,
      });

      const jobResponse = await amplifyClient.send(getJobCommand);
      const job = jobResponse.job;

      if (!job) {
        // If job not found, try to list recent jobs to see if there's an issue
        try {
          const listJobsCommand = new ListJobsCommand({
            appId,
            branchName: 'main',
            maxResults: 5,
          });
          const listJobsResponse = await amplifyClient.send(listJobsCommand);
          const recentJobs = listJobsResponse.jobSummaries || [];

          console.log(
            `Job ${jobId} not found. Recent jobs:`,
            recentJobs.map((j) => ({
              jobId: j.jobId,
              status: j.status,
              startTime: j.startTime?.toISOString(),
            })),
          );

          return json(
            {
              error: 'Job not found',
              message: 'The deployment job was not found in AWS Amplify.',
              recentJobs: recentJobs.map((j) => ({
                jobId: j.jobId,
                status: j.status,
                startTime: j.startTime?.toISOString(),
                endTime: j.endTime?.toISOString(),
              })),
              suggestion: 'The job may have been completed, failed, or expired. Check the recent jobs above.',
            },
            { status: 404 },
          );
        } catch (listError) {
          console.error('Error listing recent jobs:', listError);
          return json({ error: 'Job not found' }, { status: 404 });
        }
      }

      console.log(`AWS Amplify job ${jobId} status: ${job.summary?.status}`);
      console.log(`Job details:`, {
        jobType: job.summary?.jobType,
        status: job.summary?.status,
        startTime: job.summary?.startTime?.toISOString(),
        endTime: job.summary?.endTime?.toISOString(),
        commitId: job.summary?.commitId,
        commitMessage: job.summary?.commitMessage,
      });

      // Map AWS Amplify job steps to our expected format with enhanced logging
      const steps =
        job.steps?.map((step) => {
          console.log(`Step ${step.stepName}: ${step.status}`, {
            startTime: step.startTime?.toISOString(),
            endTime: step.endTime?.toISOString(),
            logUrl: step.logUrl,
            context: step.context,
          });

          return {
            stepName: step.stepName || 'UNKNOWN',
            status: step.status || 'PENDING',
            startTime: step.startTime?.toISOString() || null,
            endTime: step.endTime?.toISOString() || null,
            logUrl: step.logUrl || null,
            context: step.context || null,
          };
        }) || [];

      // Calculate progress and provide better status messaging
      const status = job.summary?.status || 'PENDING';
      const startTime = job.summary?.startTime;
      const endTime = job.summary?.endTime;

      // Enhanced progress calculation for long-running deployments
      let estimatedCompletion = null;
      let progressMessage = '';
      let troubleshooting = null;

      if (status === 'PENDING' && startTime) {
        const elapsed = Date.now() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsed / 60000);

        // Different messaging based on elapsed time
        if (elapsedMinutes < 3) {
          const estimatedTotal = 5 * 60 * 1000; // 5 minutes typical deployment time
          const remaining = Math.max(0, estimatedTotal - elapsed);
          estimatedCompletion = new Date(Date.now() + remaining).toISOString();

          const minutesRemaining = Math.ceil(remaining / 60000);
          progressMessage = `Deployment in progress. Estimated ${minutesRemaining} minute(s) remaining.`;
        } else if (elapsedMinutes < 10) {
          progressMessage = `Deployment is taking longer than usual (${elapsedMinutes} minutes). This can happen with complex builds or first-time deployments.`;
          troubleshooting = {
            possibleCauses: [
              'First-time deployment (takes longer to set up infrastructure)',
              'Large number of files being processed',
              'Complex build process (npm install, build steps)',
              'Network latency or temporary AWS service delays',
            ],
            recommendation: 'Please wait a few more minutes. Most deployments complete within 10-15 minutes.',
          };
        } else {
          progressMessage = `Deployment has been running for ${elapsedMinutes} minutes. This is unusual and may indicate an issue.`;
          troubleshooting = {
            possibleCauses: [
              'Build process is stuck or encountering errors',
              'Large dependencies causing timeout',
              'AWS service issues or capacity constraints',
              'Invalid build configuration',
            ],
            recommendation:
              'Consider checking AWS Amplify console for detailed logs or canceling and retrying the deployment.',
            consoleUrl: `https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}/YnJhbmNoZXM/main`,
          };
        }
      } else if (status === 'RUNNING') {
        const elapsed = startTime ? Date.now() - startTime.getTime() : 0;
        const elapsedMinutes = Math.floor(elapsed / 60000);
        progressMessage = `Deployment is actively running (${elapsedMinutes} minutes elapsed).`;
      } else if (status === 'SUCCEED') {
        progressMessage = 'Deployment completed successfully!';
      } else if (status === 'FAILED') {
        progressMessage = 'Deployment failed. Check the logs for details.';
        troubleshooting = {
          recommendation: 'Check the step logs for specific error messages.',
          consoleUrl: `https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}/YnJhbmNoZXM/main`,
        };
      } else {
        progressMessage = `Deployment status: ${status}`;
      }

      // Count completed steps for progress indication
      const completedSteps = steps.filter((step) => step.status === 'SUCCEED').length;
      const runningSteps = steps.filter((step) => step.status === 'RUNNING').length;
      const failedSteps = steps.filter((step) => step.status === 'FAILED').length;
      const totalSteps = steps.length;
      const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Find current active step
      const currentStep =
        steps.find((step) => step.status === 'RUNNING') || steps.find((step) => step.status === 'PENDING');

      // Check domain status if domainName is provided
      let domainStatus = null;

      if (domainName) {
        try {
          console.log(`Checking domain status for: ${domainName}`);

          const getDomainCommand = new GetDomainAssociationCommand({
            appId,
            domainName,
          });

          const domainResponse = await amplifyClient.send(getDomainCommand);
          const domainAssociation = domainResponse.domainAssociation;

          if (domainAssociation) {
            const getDomainStatusMessage = (status: string) => {
              switch (status) {
                case 'PENDING_VERIFICATION':
                  return 'Domain verification in progress. This may take a few minutes.';
                case 'IN_PROGRESS':
                  return 'Domain setup is in progress.';
                case 'PENDING_DEPLOYMENT':
                  return 'Domain verified, deployment in progress.';
                case 'AVAILABLE':
                  return 'Domain is active and ready to use!';
                case 'UPDATING':
                  return 'Domain configuration is being updated.';
                case 'FAILED':
                  return 'Domain setup failed. Please check your DNS configuration.';
                default:
                  return `Domain status: ${status}`;
              }
            };

            domainStatus = {
              domainName,
              status: domainAssociation.domainStatus,
              message: getDomainStatusMessage(domainAssociation.domainStatus || 'UNKNOWN'),
              isReady: domainAssociation.domainStatus === 'AVAILABLE',
              url: domainAssociation.domainStatus === 'AVAILABLE' ? `https://${domainName}` : null,
            };

            console.log(`Domain ${domainName} status: ${domainAssociation.domainStatus}`);
            console.log(`Full domain association:`, {
              domainName: domainAssociation.domainName,
              domainStatus: domainAssociation.domainStatus,
              statusReason: domainAssociation.statusReason,
              certificate: domainAssociation.certificate,
              enableAutoSubDomain: domainAssociation.enableAutoSubDomain,
              subDomains: domainAssociation.subDomains?.map((sub) => ({
                subDomainSetting: sub.subDomainSetting,
                verified: sub.verified,
                dnsRecord: sub.dnsRecord,
              })),
            });
          }
        } catch (domainError) {
          console.warn('Failed to get domain status:', domainError);
          domainStatus = {
            domainName,
            status: 'UNKNOWN',
            message: 'Unable to check domain status. Domain may still be setting up.',
            isReady: false,
            url: null,
          };
        }
      }

      return json({
        status,
        statusReason: progressMessage,
        startTime: startTime?.toISOString() || null,
        endTime: endTime?.toISOString() || null,
        estimatedCompletion,
        progress: {
          percentage: progressPercentage,
          completedSteps,
          runningSteps,
          failedSteps,
          totalSteps,
          currentStep: currentStep?.stepName || null,
        },
        steps,
        artifacts: {},
        troubleshooting,
        isManual: false,
        debugInfo: {
          jobType: job.summary?.jobType,
          commitId: job.summary?.commitId,
          elapsedTime: startTime ? `${Math.floor((Date.now() - startTime.getTime()) / 60000)} minutes` : null,
        },
        domain: domainStatus,
      });
    } catch (error) {
      console.error('Error getting job status from AWS Amplify:', error);

      // If the job is not found and it looks like a real job ID, provide helpful error
      if (error instanceof Error && error.message.includes('not found')) {
        return json(
          {
            error: 'Job not found',
            message: 'The deployment job was not found in AWS Amplify. It may have been completed or expired.',
            suggestion: 'Check the AWS Amplify console for the latest deployment status.',
          },
          { status: 404 },
        );
      }

      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('AWS Amplify status check error:', error);
    return json({ error: 'Failed to check deployment status' }, { status: 500 });
  }
}
