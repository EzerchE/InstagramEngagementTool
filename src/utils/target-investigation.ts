import {
  EngagementConfidence,
  EngagementSignal,
  TargetUserInvestigation,
} from '../model/engagement';

const normalizeUsername = (username: string): string =>
  username.trim().toLowerCase();

const getConfidence = (
  signals: readonly EngagementSignal[],
  followsViewer: boolean | null,
  followedByViewer: boolean | null,
): EngagementConfidence => {
  if (signals.length >= 3 && followsViewer !== null && followedByViewer !== null) {
    return 'high';
  }

  if (signals.length > 0 || followsViewer !== null || followedByViewer !== null) {
    return 'medium';
  }

  return 'low';
};

const getSummary = (
  username: string,
  signals: readonly EngagementSignal[],
  followsViewer: boolean | null,
  followedByViewer: boolean | null,
): string => {
  const relationKnown = followsViewer !== null || followedByViewer !== null;

  if (signals.length === 0 && !relationKnown) {
    return `${username} icin henuz gozlemlenmis ilgi veya takip iliskisi sinyali yok.`;
  }

  if (signals.length === 0) {
    return `${username} icin takip iliskisi biliniyor, ancak icerik veya profil ilgisi sinyali henuz yok.`;
  }

  return `${username} icin ${signals.length} gozlemlenmis ilgi sinyali bulundu.`;
};

export const buildTargetUserInvestigation = (
  username: string,
  allSignals: readonly EngagementSignal[],
  relationship: {
    readonly followsViewer: boolean | null;
    readonly followedByViewer: boolean | null;
  } = {
    followsViewer: null,
    followedByViewer: null,
  },
): TargetUserInvestigation => {
  const normalizedUsername = normalizeUsername(username);
  const signals = allSignals.filter(signal => normalizeUsername(signal.username) === normalizedUsername);

  return {
    username: normalizedUsername,
    signals,
    followsViewer: relationship.followsViewer,
    followedByViewer: relationship.followedByViewer,
    confidence: getConfidence(signals, relationship.followsViewer, relationship.followedByViewer),
    summary: getSummary(normalizedUsername, signals, relationship.followsViewer, relationship.followedByViewer),
  };
};
