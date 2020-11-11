
//Change for unassigned leads
const daysOutFree = 240;
const daysOutBonus = 6;

//AUM threshold
const AUM_BUCKET = 125000;

const aumGreaterThan = (aum, amount) => {
  return aum >= amount;
}
const aumLessThan = (aum, amount) => {
  return aum <= amount;
}
const aumComparisonType = aumLessThan;
const aumLeadCount = 4;

//distance of lead to advisor
const tier1 = 25;
const tier2 = 75;
const tier3 = 100;
const tier4 = 275;

//percentage of leads distances to advisor
const pctTier1 = 0.65;
const pctTier2 = 0.45;
const pctTier3 = 0.55;
const pctTier4 = 0.75;
const pctTier5 = 1.00;

module.exports = {
    daysOutFree,
    daysOutBonus,
    AUM_BUCKET,
    aumComparisonType,
    aumLeadCount,
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