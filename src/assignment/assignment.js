const { getDistanceFromLatLonInKm } = require("../distanceUtils");
const Country = require("../regionUtils.js");
const { AUM_BUCKET, aumComparisonType, aumUserCount, tier1, tier2, tier3, tier4, pctTier1, pctTier2, pctTier3, pctTier4, pctTier5 } = require("../variables.js");

const calculateDistances = (users, advisors) => {
  return users
    .reduce((acc, a) => [...acc, ...advisors.map((b) => [a, b])], [])
    .filter(([user, advisor]) => user[Country.Columns.Region.title] === advisor[Country.Columns.Region.title])
    .map(([user, advisor]) => ({
      user,
      advisor,
      distance: getDistanceFromLatLonInKm(
        user.Lat,
        user.Long,
        advisor.lat,
        advisor.long
      ),
    }))
    .sort(
      ({ distance: distance1 }, { distance: distance2 }) =>
        distance1 - distance2
    );
};

const calculateBuckets = (advisors, usersField) => {
  return Object.fromEntries(advisors
    .map((advisor) => {
      const users = parseInt(advisor[usersField])
      return [ advisor["referral_code"], [
        Math.ceil(users * pctTier1),
        Math.ceil(users * pctTier2),
        Math.ceil(users * pctTier3),
        Math.ceil(users * pctTier4),
        Math.ceil(users * pctTier5),
      ]];
    }));
};

const calculateAumBuckets = (advisors) => {
  return Object.fromEntries(advisors
    .map((advisor) => [advisor["referral_code"], aumUserCount ]));
};

const fullAumBucket = (count, user_aum) => {
  // console.log(user_aum, count);
  return (aumComparisonType(user_aum,AUM_BUCKET)) && count === 0;
}

const decrementAumBucket = (advisorAumBuckets, referral_code, user_aum) => {
  if (aumComparisonType(user_aum,AUM_BUCKET)) {
    advisorAumBuckets[referral_code]--;
  }
}
const getUnfulfilledAdvisors = (advisors, advisorUsers, usersField) => {
  return advisors.filter((advisor) => {
    const advisorUsersForAdvisor = advisorUsers[advisor["referral_code"]];
    const requiredUsers = parseInt(advisor[usersField]);
    return (
      requiredUsers > 0  && (
      !advisorUsersForAdvisor ||
      advisorUsersForAdvisor.length < requiredUsers
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
const assignUsers = (users, advisors, usersField) => {
  let distances = calculateDistances(users, advisors);
  let currentDistances = distances;
  let unfulfilledAdvisors = advisors;
  let advisorBuckets = calculateBuckets(advisors, usersField);
  let advisorAumBuckets = calculateAumBuckets(advisors);
  const userAssignments = {};
  const userDistances = {};
  const advisorUsers = {};
  let noMatches = false;
  while (!noMatches && currentDistances.length > 0 ) {
    const advisorsToFulfill = [...unfulfilledAdvisors];
    noMatches = true;
    let position = 0;
    while (advisorsToFulfill.length > 0 && currentDistances.length > position) {
      const match = currentDistances[position];
      if (userAssignments[match.user["household_id"]]) {
        currentDistances = [...currentDistances.slice(0, position), ...currentDistances.slice(position + 1)];
      } else {
        const referral_code = match.advisor["referral_code"];
        const user_aum = parseInt(match.user["user_aum"]);
        const advisorIndex = advisorsToFulfill.findIndex(
          (advisor) => advisor["referral_code"] === referral_code
        );
        if (advisorIndex != -1 && 
          !fullBucket(advisorBuckets[referral_code],match.distance) &&
          !fullAumBucket(advisorAumBuckets[referral_code], user_aum)) {
          noMatches = false;
          const household_id = match.user["household_id"];
          userAssignments[household_id] = referral_code;
          userDistances[household_id] = match.distance;
          advisorUsers[referral_code] = advisorUsers[referral_code]
            ? [...advisorUsers[referral_code], household_id]
            : [household_id];
          advisorsToFulfill.splice(advisorIndex, 1);
          currentDistances = [...currentDistances.slice(0, position), ...currentDistances.slice(position + 1)];
          decrementBucket(advisorBuckets[referral_code],match.distance);
          decrementAumBucket(advisorAumBuckets, referral_code, user_aum);
        } else {
          position++;
        }
      }
    }
    unfulfilledAdvisors = getUnfulfilledAdvisors(
      unfulfilledAdvisors,
      advisorUsers,
      usersField
    );
  }
  return [userAssignments, advisorUsers, userDistances, distances, unfulfilledAdvisors];
};

module.exports = {
  calculateDistances,
  getUnfulfilledAdvisors,
  assignUsers,
};
