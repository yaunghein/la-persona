export const EVENT_ONBOARDING_STEPS = [
  'mingalarbar',
  'create-card',
  'setting-up',
  'download-wallpaper',
  'register-success',
  'how-to-use',
] as const;

export type EventOnboardingStep = (typeof EVENT_ONBOARDING_STEPS)[number];

export const EVENT_ONBOARDING_NEXT: Record<
  EventOnboardingStep,
  EventOnboardingStep | null
> = {
  mingalarbar: 'create-card',
  'create-card': 'setting-up',
  'setting-up': 'download-wallpaper',
  'download-wallpaper': 'register-success',
  'register-success': 'how-to-use',
  'how-to-use': null,
};

export function parseEventOnboardingStep(
  value: unknown
): EventOnboardingStep | null {
  const step = Array.isArray(value) ? value[0] : value;
  if (typeof step !== 'string') return null;
  return (EVENT_ONBOARDING_STEPS as readonly string[]).includes(step)
    ? (step as EventOnboardingStep)
    : null;
}
