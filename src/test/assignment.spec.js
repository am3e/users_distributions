const { expect } = require("chai");
const { getDistanceFromLatLonInKm } = require("../distanceUtils");
const {
  calculateDistances,
  getUnfulfilledAdvisors,
  assignUsers,
} = require("../assignment/assignment");

describe("assignment", () => {
  const users = [
    {
      Lat: 45.4123,
      Long: -74.7108,
      PostalProvince: "ON",
      household_id: "1",
      email: "joe@ontario.com",
    },
    {
      Lat: 44.8734,
      Long: -75.4416,
      PostalProvince: "ON",
      household_id: "2",
      email: "kent@ontario.com",
    },
    {
      Lat: 62.456,
      Long: -114.353,
      PostalProvince: "NT",
      household_id: "3",
      email: "julie@nwt.com",
    },
    {
      Lat: 51.0497,
      Long: -114.139,
      PostalProvince: "AB",
      household_id: "4",
      email: "fred@alberta.com",
    },
  ];

  const advisors = [
    {
      Lat: 44.8734,
      Long: -75.4416,
      Province: "ON",
      Recipient: "Jack",
      NewUsers: 2,
      referral_code: "pw-jack",
    },
    {
      Lat: 51.0497,
      Long: -114.139,
      Province: "AB",
      Recipient: "Karen",
      NewUsers: 1,
      referral_code: "pw-karen",
    },
    {
      Lat: 45.4123,
      Long: -75.7108,
      Province: "ON",
      Recipient: "Rob",
      NewUsers: 2,
      referral_code: "pw-rob",
    },
  ];

  it("should calculate distance correctly between two locations", () => {
    const location1 = [45.4123, -75.7108];
    const location2 = [49.2646, -123.165];
    const distance = getDistanceFromLatLonInKm(
      location1[0],
      location1[1],
      location2[0],
      location2[1]
    );
    expect(distance).to.eql(3541.9788580449444);
  });

  it("calculates all distance pairs", () => {
    const distances = calculateDistances(users, advisors);
    const expcetation = [
      {
        user: users[1],
        advisor: advisors[0],
        distance: 0,
      },
      {
        user: users[3],
        advisor: advisors[1],
        distance: 0,
      },
      {
        user: users[1],
        advisor: advisors[2],
        distance: 63.53364669246928,
      },
      {
        user: users[0],
        advisor: advisors[2],
        distance: 78.0583562594453,
      },
      {
        user: users[0],
        advisor: advisors[0],
        distance: 82.92087501566125,
      },
    ];
    expect(distances).to.eql(expcetation);
  });

  it("gets advisors that need users", () => {
    const unfulfilled = getUnfulfilledAdvisors(advisors, {});
    expect(unfulfilled).to.eql(advisors);
  });

  it("assigns all users", () => {
    const [userAssignments, advisorUsers] = assignUsers(users, advisors);
    expect(userAssignments).to.eql({
      "1": "pw-rob",
      "2": "pw-jack",
      "4": "pw-karen",
    });
    expect(advisorUsers).to.eql({
      "pw-jack": ["2"],
      "pw-karen": ["4"],
      "pw-rob": ["1"],
    });
  });
});
