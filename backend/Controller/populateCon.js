const UserModel = require("../models/userModel");
const ConnectionModel = require("../models/ConnectionModel");
const bcrypt = require("bcrypt");
require("dotenv").config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const fs = require('fs');


// for reg bulk start
function logBatch(batchNumber, totalInserted) {
  const LOG_FILE = 'insertedBatch_log.txt';
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Batch ${batchNumber} inserted. Total so far: ${totalInserted}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
}
const usedEmails = new Set();
function generateUniqueEmail() {
  let email,fullName;
  do {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    fullName = `${firstName} ${lastName}`;
    // Generate random 3-digit number
    const randomDigits = faker.number.int({ min: 100, max: 999 });

    // Create email using full name + 3-digit number
    email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomDigits}@example.com`;
    // fullName= faker.person.fullName();
    // email = faker.internet.email();
  } while (usedEmails.has(email));

  usedEmails.add(email);
  return {email,fullName};
}
// for reg bulk end

// for connection start
function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}
// for connection end

module.exports = {
  // for store user in bulk
  registerBulk: async (req, res) => {
    const TOTAL_USERS = 1000000; //1million
    const BATCH_SIZE = 10000;


    // Use a common hashed password for performance
    const plainPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
      const users = [];

      for (let j = 0; j < BATCH_SIZE; j++) {
        let unData=generateUniqueEmail();
        // console.log('unData');
        // console.log(unData);
        users.push({
          fullName: unData.fullName,
          email:unData.email ,
          password: hashedPassword,
          profile_pic: faker.image.avatar(),
        });
      }

      await UserModel.insertMany(users);
      logBatch(i, i + BATCH_SIZE);
      console.log(`Inserted ${i + BATCH_SIZE} / ${TOTAL_USERS}`);
    }

    console.log('Finished inserting users');
  },


  populateConnections: async () => {
    console.log('populateConnections calling');
    const MIN_CONNECTIONS = 10;
    const BATCH_SIZE = 10000;
    const totalUsers = await UserModel.countDocuments();
    const userCursor = UserModel.find({}, { _id: 1 }).cursor();
    const userIds = [];

    for await (const user of userCursor) {
      userIds.push(user._id.toString());
    }

    const totalConnectionsToInsert = [];
    const globalConnectionSet = new Set();

    for (let i = 0; i < userIds.length; i++) {
      const currentUser = userIds[i];
      const localSet = new Set();

      while (localSet.size < MIN_CONNECTIONS) {
        const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
        if (randomUser === currentUser) continue;

        const [userA, userB] = normalizePair(currentUser, randomUser);
        const key = `${userA}_${userB}`;

        if (globalConnectionSet.has(key)) continue;

        totalConnectionsToInsert.push({
          userA,
          userB,
          initiator: Math.random() > 0.5 ? userA : userB,
          status: 'connected',
        });

        globalConnectionSet.add(key);
        localSet.add(randomUser);
      }

      // Bulk insert when reaching BATCH_SIZE
      if (totalConnectionsToInsert.length >= BATCH_SIZE) {
        await ConnectionModel.insertMany(totalConnectionsToInsert, { ordered: false }).catch((err) => {
          if (err.code !== 11000) console.error('Insert error:', err);
        });
        console.log(`Inserted ${totalConnectionsToInsert.length} connections`);
        totalConnectionsToInsert.length = 0; // reset batch
      }

      if ((i + 1) % 10000 === 0) {
        console.log(`Processed ${i + 1} users`);
      }
    }

    // Insert remaining
    if (totalConnectionsToInsert.length > 0) {
      await ConnectionModel.insertMany(totalConnectionsToInsert, { ordered: false }).catch((err) => {
        if (err.code !== 11000) console.error('Insert error:', err);
      });
      console.log(`Inserted final ${totalConnectionsToInsert.length} connections`);
    }

    console.log('✅ All connections populated.');
  }
};