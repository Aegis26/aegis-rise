export interface DeferredNotificationResult {
  success: true;
  delivery: "deferred";
}

const deferredResult: DeferredNotificationResult = {
  success: true,
  delivery: "deferred",
};

export async function sendApprovalNotification(
  _recipient: { email: string; name: string },
): Promise<DeferredNotificationResult> {
  return deferredResult;
}

export async function sendRejectionNotification(
  _recipient: { email: string; name: string },
): Promise<DeferredNotificationResult> {
  return deferredResult;
}