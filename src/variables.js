
//Change for unassigned users
const daysOutFree = 60;
const daysOutBonus = 6

//AUM threshold
const AUM_BUCKET = 125000;

const aumGreaterThan = (aum, amount) => {
  return aum >= amount;
}
const aumLessThan = (aum, amount) => {
  return aum <= amount;
}
const aumComparisonType = aumGreaterThan;
const aumUserCount = 6
;

//distance of user to advisor
const tier1 = 25;
const tier2 = 100;
const tier3 = 225;
const tier4 = 450;

//percentage of users distances to advisor
const pctTier1 = 0.35;
const pctTier2 = 0.55;
const pctTier3 = 0.75;
const pctTier4 = 0.85;
const pctTier5 = 1.00;

module.exports = {
    daysOutFree,
    daysOutBonus,
    AUM_BUCKET,
    aumComparisonType,
    aumUserCount,
    tier1,
    tier2,
    tier3,
    tier4,
    pctTier1,
    pctTier2,
    pctTier3,
    pctTier4,
    pctTier5,
  };