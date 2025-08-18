import { AnimatePresence, motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { DomainAlert } from '~/types/actions';

interface DomainAlertProps {
  alert: DomainAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export default function DomainChatAlert({ alert, clearAlert, postMessage }: DomainAlertProps) {
  const { type, title, description, content, url, domainName, status, statusMessage } = alert;

  // Map status to progress steps
  const getStatusStep = (currentStatus: string) => {
    const steps = ['PENDING_VERIFICATION', 'IN_PROGRESS', 'PENDING_DEPLOYMENT', 'AVAILABLE'];
    return steps.indexOf(currentStatus) + 1;
  };

  const currentStep = getStatusStep(status);
  const isComplete = status === 'AVAILABLE';
  const isFailed = status === 'FAILED';

  // Status step configurations
  const steps = [
    { key: 'PENDING_VERIFICATION', label: 'Verification', number: 1 },
    { key: 'IN_PROGRESS', label: 'Processing', number: 2 },
    { key: 'PENDING_DEPLOYMENT', label: 'Deployment', number: 3 },
    { key: 'AVAILABLE', label: 'Ready', number: 4 },
  ];

  const getStepStatus = (stepNumber: number) => {
    if (isFailed) return 'failed';
    if (stepNumber < currentStep) return 'complete';
    if (stepNumber === currentStep) return 'running';
    return 'pending';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 mb-2`}
      >
        <div className="flex items-start">
          {/* Icon */}
          <motion.div
            className="flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className={classNames(
                'text-xl',
                type === 'success' || isComplete
                  ? 'i-ph:globe-duotone text-bolt-elements-icon-success'
                  : type === 'error' || isFailed
                    ? 'i-ph:warning-duotone text-bolt-elements-button-danger-text'
                    : 'i-ph:globe-duotone text-bolt-elements-loader-progress',
              )}
            ></div>
          </motion.div>
          {/* Content */}
          <div className="ml-3 flex-1">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`text-sm font-medium text-bolt-elements-textPrimary`}
            >
              {title}
            </motion.h3>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`mt-2 text-sm text-bolt-elements-textSecondary`}
            >
              <p>{description}</p>
              
              {/* Domain Name */}
              <div className="mt-2 text-xs text-bolt-elements-textTertiary">
                Domain: <span className="font-mono text-bolt-elements-textSecondary">{domainName}</span>
              </div>

              {/* Domain Setup Progress Visualization */}
              <div className="mt-4 mb-2">
                <div className="flex items-center space-x-2 mb-3 overflow-x-auto">
                  {steps.map((step, index) => {
                    const stepStatus = getStepStatus(step.number);
                    const isLastStep = index === steps.length - 1;
                    
                    return (
                      <div key={step.key} className="flex items-center flex-shrink-0">
                        {/* Step Circle */}
                        <div className="flex items-center">
                          <div
                            className={classNames(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                              stepStatus === 'running'
                                ? 'bg-bolt-elements-loader-progress text-white'
                                : stepStatus === 'complete'
                                  ? 'bg-bolt-elements-icon-success text-white'
                                  : stepStatus === 'failed'
                                    ? 'bg-bolt-elements-button-danger-background text-white'
                                    : 'bg-bolt-elements-textTertiary text-white',
                            )}
                          >
                            {stepStatus === 'running' ? (
                              <div className="i-svg-spinners:90-ring-with-bg text-white text-xs"></div>
                            ) : stepStatus === 'complete' ? (
                              <div className="i-ph:check text-white text-xs"></div>
                            ) : stepStatus === 'failed' ? (
                              <div className="i-ph:x text-white text-xs"></div>
                            ) : (
                              <span>{step.number}</span>
                            )}
                          </div>
                          <span className="ml-2 text-xs whitespace-nowrap">{step.label}</span>
                        </div>

                        {/* Connector Line */}
                        {!isLastStep && (
                          <div
                            className={classNames(
                              'h-0.5 w-6 mx-2',
                              stepStatus === 'complete'
                                ? 'bg-bolt-elements-icon-success'
                                : 'bg-bolt-elements-textTertiary',
                            )}
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Status Message */}
                {statusMessage && (
                  <div className="text-xs text-bolt-elements-textTertiary mt-2">
                    {statusMessage}
                  </div>
                )}
              </div>

              {content && (
                <div className="text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-4 mb-4">
                  {content}
                </div>
              )}
              
              {url && isComplete && (
                <div className="mt-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bolt-elements-item-contentAccent hover:underline flex items-center"
                  >
                    <span className="mr-1">Visit custom domain</span>
                    <div className="i-ph:arrow-square-out"></div>
                  </a>
                </div>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={classNames('flex gap-2')}>
                {type === 'error' && (
                  <button
                    onClick={() =>
                      postMessage(`*Fix this domain setup error*\n\`\`\`\n${content || description}\n\`\`\`\n`)
                    }
                    className={classNames(
                      `px-2 py-1.5 rounded-md text-sm font-medium`,
                      'bg-bolt-elements-button-primary-background',
                      'hover:bg-bolt-elements-button-primary-backgroundHover',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-danger-background',
                      'text-bolt-elements-button-primary-text',
                      'flex items-center gap-1.5',
                    )}
                  >
                    <div className="i-ph:chat-circle-duotone"></div>
                    Ask WiderMl
                  </button>
                )}
                <button
                  onClick={clearAlert}
                  className={classNames(
                    `px-2 py-1.5 rounded-md text-sm font-medium`,
                    'bg-bolt-elements-button-secondary-background',
                    'hover:bg-bolt-elements-button-secondary-backgroundHover',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-secondary-background',
                    'text-bolt-elements-button-secondary-text',
                  )}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
