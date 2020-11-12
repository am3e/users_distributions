const { getDistanceFromLatLonInKm } = require("../distanceUtils");
const Country = require("../regionUtils.js");
const { AUM_BUCKET, aumComparisonType, aumLeadCount, tier1, tier2, tier3, tier4, pctTier1, pctTier2, pctTier3, pctTier4, pctTier5 } = require("../variables.js");

const calculateDistances = (leads, advisors) => {
  return leads
    .reduce((acc, a) => [...acc, ...advisors.map((b) => [a, b])], [])
    .filter(([lead, advisor]) => lead[Country.Columns.Region.title] === advisor[Country.Columns.Region.title])
    .map(([lead, advisor]) => ({
      lead,
      advisor,
      distance: getDistanceFromLatLonInKm(
        lead.Lat,
        lead.Long,
        advisor.Lat,
        advisor.Long
      ),
    }))
    .sort(
      ({ distance: distance1 }, { distance: distance2 }) =>
        distance1 - distance2
    );
};

const calculateBuckets = (advisors, leadsField) => {
  return Object.fromEntries(advisors
    .map((advisor) => {
      const leads = parseInt(advisor[leadsField])
      return [ advisor["referral_code"], [
        Math.ceil(leads * pctTier1),
        Math.ceil(leads * pctTier2),
        Math.ceil(leads * pctTier3),
        Math.ceil(leads * pctTier4),
        Math.ceil(leads * pctTier5),
      ]];
    }));
};

const calculateAumBuckets = (advisors) => {
  return Object.fromEntries(advisors
    .map((advisor) => [advisor["referral_code"], aumLeadCount ]));
};

const fullAumBucket = (count, lead_aum) => {
  // console.log(lead_aum, count);
  return (aumComparisonType(lead_aum,AUM_BUCKET)) && count === 0;
}

const decrementAumBucket = (advisorAumBuckets, referral_code, lead_aum) => {
  if (aumComparisonType(lead_aum,AUM_BUCKET)) {
    advisorAumBuckets[referral_code]--;
  }
}
const getUnfulfilledAdvisors = (advisors, advisorLeads, leadsField) => {
  return advisors.filter((advisor) => {
    const advisorLeadsForAdvisor = advisorLeads[advisor["referral_code"]];
    const requiredLeads = parseInt(advisor[leadsField]);
    return (
      requiredLeads > 0  && (
      !advisorLeadsForAdvisor ||
      advisorLeadsForAdvisor.length < requiredLeads
    ));
  });
};

const fullBucket = (bucket, distance) => {
    if (distance <= tier1) {
      return bucket[0] === 0;
    } else if (distance <= tier2) {
      return bucket[1] === 0;
    } else if (distance <= tier3) {
      return bucket[2] === 0;
    } else if (distance <= tier4) {
      return bucket[3] === 0;
    } else {
      return bucket[4] === 0;
    }
}
const decrementBucket = (bucket, distance) => {
  if (distance <= tier1) {
    return bucket[0]--;
  } else if (distance <= tier2) {
    return bucket[1]--;
  } else if (distance <= tier3) {
    return bucket[2] === 0;
  } else if (distance <= tier4) {
    return bucket[3]--;
  } else {
    return bucket[4]--;
  }
}
const assignLeads = (leads, advisors, leadsField) => {
  let distances = calculateDistances(leads, advisors);
  let currentDistances = distances;
  let unfulfilledAdvisors = advisors;
  let advisorBuckets = calculateBuckets(advisors, leadsField);
  let advisorAumBuckets = calculateAumBuckets(advisors);
  const leadAssignments = {};
  const leadDistances = {};
  const advisorLeads = {};
  let noMatches = false;
  while (!noMatches && currentDistances.length > 0 ) {
    const advisorsToFulfill = [...unfulfilledAdvisors];
    noMatches = true;
    let position = 0;
    while (advisorsToFulfill.length > 0 && currentDistances.length > position) {
      const match = currentDistances[position];
      if (leadAssignments[match.lead["household_id"]]) {
        currentDistances = [...currentDistances.slice(0, position), ...currentDistances.slice(position + 1)];
      } else {
        const referral_code = match.advisor["referral_code"];
        const lead_aum = parseInt(match.lead["lead_aum"]);
        const advisorIndex = advisorsToFulfill.findIndex(
          (advisor) => advisor["referral_code"] === referral_code
        );
        if (advisorIndex != -1 && 
          !fullBucket(advisorBuckets[referral_code],match.distance) &&
          !fullAumBucket(advisorAumBuckets[referral_code], lead_aum)) {
          noMatches = false;
          const household_id = match.lead["household_id"];
          leadAssignments[household_id] = referral_code;
          leadDistances[household_id] = match.distance;
          advisorLeads[referral_code] = advisorLeads[referral_code]
            ? [...advisorLeads[referral_code], household_id]
            : [household_id];
          advisorsToFulfill.splice(advisorIndex, 1);
          currentDistances = [...currentDistances.slice(0, position), ...currentDistances.slice(position + 1)];
          decrementBucket(advisorBuckets[referral_code],match.distance);
          decrementAumBucket(advisorAumBuckets, referral_code, lead_aum);
        } else {
          position++;
        }
      }
    }
    unfulfilledAdvisors = getUnfulfilledAdvisors(
      unfulfilledAdvisors,
      advisorLeads,
      leadsField
    );
  }
  return [leadAssignments, advisorLeads, leadDistances, distances, unfulfilledAdvisors];
};

module.exports = {
  calculateDistances,
  getUnfulfilledAdvisors,
  assignLeads,
};
