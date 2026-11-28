import { MembershipStatus, SettlementStatus, Status } from '../enum';

export function isDueForRetirement(member: any): boolean {
  if (!member || member.Status != Status.Active || !member.RetirementDate) {
    return false;
  }
  const ret = new Date(member.RetirementDate);
  if (isNaN(ret.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  ret.setHours(0, 0, 0, 0);
  return ret <= today;
}

export function getMemberLifecycleLabel(member: any): string {
  if (!member) return 'Unknown';
  const mStatus = Number(member.MembershipStatus || (member.Status == Status.Active ? MembershipStatus.Active : MembershipStatus.LeftSociety));
  const sStatus = Number(member.SettlementStatus ?? (member.Status == Status.Active ? SettlementStatus.NotApplicable : SettlementStatus.Settled));

  if (member.Status == Status.Active || mStatus === MembershipStatus.Active) {
    return 'Active';
  }
  const base = mStatus === MembershipStatus.Retired ? 'Retired' : 'Left Society';
  return sStatus === SettlementStatus.Pending
    ? `${base} - Settlement Pending`
    : `${base} - Settled`;
}

export function getMemberLifecycleBadgeClass(member: any): string {
  if (!member) return 'badge text-bg-secondary';
  const mStatus = Number(member.MembershipStatus || (member.Status == Status.Active ? MembershipStatus.Active : MembershipStatus.LeftSociety));
  const sStatus = Number(member.SettlementStatus ?? (member.Status == Status.Active ? SettlementStatus.NotApplicable : SettlementStatus.Settled));

  if (member.Status == Status.Active || mStatus === MembershipStatus.Active) {
    return 'badge text-bg-success';
  }
  if (sStatus === SettlementStatus.Pending) {
    return 'badge bg-warning text-dark';
  }
  return mStatus === MembershipStatus.Retired ? 'badge text-bg-secondary' : 'badge text-bg-danger';
}

export function formatMemberSearchLabel(member: any): string {
  if (!member) return '';
  const sailPart = member.SailPersonalNo ? ` - ${member.SailPersonalNo}` : '';
  const base = `${member.MemberName} - ${member.MemberNo} - ${member.StaffNo}${sailPart}`;
  if (member.Status != Status.Active) {
    return `${base} [${getMemberLifecycleLabel(member)}]`;
  }
  return base;
}

const ACTION_LABELS: Record<string, string> = {
  ACTIVATED: 'Activated',
  RETIRED: 'Marked Retired',
  LEFT_SOCIETY: 'Left Society',
  SETTLED: 'Settlement Completed',
  REJOINED: 'Rejoined (New Member No.)',
  REJOINED_TO_NEW: 'Rejoined Under New No.'
};

export function getMemberStatusActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] || actionType || '-';
}
