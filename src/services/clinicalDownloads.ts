const pending = new Map<string, Set<AbortController>>();

export const cancelClinicalDownloads = (token: string | null) => {
  if (!token) return;
  pending.get(token)?.forEach(controller => controller.abort());
  pending.delete(token);
};

export const beginClinicalDownload = (token: string) => {
  const controller = new AbortController();
  const controllers = pending.get(token) ?? new Set<AbortController>();
  controllers.add(controller);
  pending.set(token, controllers);
  return {
    signal: controller.signal,
    isActive: () => !controller.signal.aborted,
    release: () => {
      controllers.delete(controller);
      if (!controllers.size && pending.get(token) === controllers) pending.delete(token);
    },
  };
};
