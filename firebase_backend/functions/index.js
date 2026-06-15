const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. onUserCreated - Automatically creates a Firestore user profile document 
 *    when a user signs up via Firebase Authentication.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;
  
  // Set default role and credentials
  let role = "student";
  if (email && email.endsWith("@admin.campusstay.com")) {
    role = "admin";
  } else if (email && email.includes("owner")) {
    role = "owner";
  }

  const userDocRef = db.collection("users").doc(uid);
  
  const defaultProfile = {
    uid,
    name: displayName || email.split("@")[0],
    email: email || "",
    phone: user.phoneNumber || "",
    role: role,
    profilePic: photoURL || "https://api.dicebear.com/7.x/adventurer/svg?seed=" + uid,
    verified: role === "admin", // admins auto-verified
    verificationDocs: [],
    trustScore: 85, // Default average trust score
    joinedDate: admin.firestore.FieldValue.serverTimestamp(),
    preferences: {
      budgetMin: 2000,
      budgetMax: 15000,
      sleepHabit: "flexible", // early_bird, night_owl, flexible
      dietary: "any",        // veg, non-veg, any
      cleanliness: "medium",  // high, medium, low
      socialStatus: "medium" // quiet, balanced, social
    },
    savedRooms: []
  };

  try {
    await userDocRef.set(defaultProfile);
    
    // Set custom user claims for roles
    await admin.auth().setCustomUserClaims(uid, { role });
    
    // Auto-create initial welcome notification
    await db.collection("notifications").doc(uid).collection("userNotifications").add({
      type: "system",
      title: "Welcome to CampusStay!",
      message: `Your profile has been created successfully as a ${role}.`,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`User profile initialized for UID: ${uid} with role: ${role}`);
  } catch (error) {
    console.error("Error creating user profile in Firestore: ", error);
  }
});

/**
 * 2. matchRoommates - Computes compatibility matching scores for roommate recommendation.
 *    Callable function triggered by Flutter clients.
 */
exports.matchRoommates = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const targetUid = context.auth.uid;
  
  try {
    // 1. Fetch current user data
    const targetUserDoc = await db.collection("users").doc(targetUid).get();
    if (!targetUserDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User profile not found.");
    }
    const targetUser = targetUserDoc.data();
    const tPref = targetUser.preferences || {};

    // 2. Fetch other students
    const usersSnapshot = await db.collection("users")
      .where("role", "==", "student")
      .limit(50)
      .get();

    const matches = [];

    usersSnapshot.forEach((doc) => {
      const otherUser = doc.data();
      if (otherUser.uid === targetUid) return;

      const oPref = otherUser.preferences || {};
      let score = 0;
      let breakdown = [];

      // Weight 1: Budget compatibility (30 pts)
      const targetAvgBudget = ((tPref.budgetMin || 0) + (tPref.budgetMax || 15000)) / 2;
      const otherAvgBudget = ((oPref.budgetMin || 0) + (oPref.budgetMax || 15000)) / 2;
      const budgetDiff = Math.abs(targetAvgBudget - otherAvgBudget);
      const budgetScore = Math.max(0, 30 - (budgetDiff / 500));
      score += budgetScore;
      breakdown.push({ criteria: "Budget Match", score: Math.round(budgetScore) });

      // Weight 2: Sleep Schedule compatibility (25 pts)
      let sleepScore = 0;
      if (tPref.sleepHabit === oPref.sleepHabit) {
        sleepScore = 25;
      } else if (tPref.sleepHabit === "flexible" || oPref.sleepHabit === "flexible") {
        sleepScore = 15;
      } else {
        sleepScore = 5; // Direct mismatch (night owl vs early bird)
      }
      score += sleepScore;
      breakdown.push({ criteria: "Sleep Schedule", score: sleepScore });

      // Weight 3: Cleanliness levels (25 pts)
      let cleanScore = 0;
      if (tPref.cleanliness === oPref.cleanliness) {
        cleanScore = 25;
      } else {
        cleanScore = 12;
      }
      score += cleanScore;
      breakdown.push({ criteria: "Cleanliness Habit", score: cleanScore });

      // Weight 4: Social / Party Preferences (20 pts)
      let socialScore = 0;
      if (tPref.socialStatus === oPref.socialStatus) {
        socialScore = 20;
      } else {
        socialScore = 10;
      }
      score += socialScore;
      breakdown.push({ criteria: "Social Compatibility", score: socialScore });

      // Push final report
      matches.push({
        uid: otherUser.uid,
        name: otherUser.name,
        email: otherUser.email,
        profilePic: otherUser.profilePic,
        trustScore: otherUser.trustScore,
        matchPercentage: Math.round(score),
        breakdown
      });
    });

    // Sort by compatibility descending
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return { matches: matches.slice(0, 10) }; // return top 10 matches
  } catch (error) {
    console.error("Error matching roommates: ", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 3. suggestOptimalPrice - Runs pricing intelligence suggestions for owners 
 *    based on local city listings and market data.
 */
exports.suggestOptimalPrice = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const { city, amenities = [], currentPrice } = data;
  if (!city) {
    throw new functions.https.HttpsError("invalid-argument", "City parameter is required.");
  }

  try {
    const roomsSnapshot = await db.collection("rooms")
      .where("address.city", "==", city)
      .get();

    let totalPrice = 0;
    let count = 0;

    roomsSnapshot.forEach((doc) => {
      const room = doc.data();
      if (room.rent) {
        totalPrice += room.rent;
        count++;
      }
    });

    const averagePrice = count > 0 ? (totalPrice / count) : 6500; // default average if no rooms in city
    let optimalPrice = averagePrice;

    // Adjust based on amenities count (+5% per amenity up to 25%)
    const modifier = Math.min(0.25, amenities.length * 0.05);
    optimalPrice = optimalPrice * (1 + modifier);

    let priceDifferencePercent = 0;
    let pricingReview = "Optimal";
    
    if (currentPrice) {
      priceDifferencePercent = ((currentPrice - optimalPrice) / optimalPrice) * 100;
      if (priceDifferencePercent > 10) {
        pricingReview = `High (${priceDifferencePercent.toFixed(1)}% above average)`;
      } else if (priceDifferencePercent < -10) {
        pricingReview = `Competitive (${Math.abs(priceDifferencePercent).toFixed(1)}% below average)`;
      }
    }

    return {
      averageMarketPrice: Math.round(averagePrice),
      suggestedOptimalPrice: Math.round(optimalPrice),
      pricingStatus: pricingReview,
      priceDifferencePercent: Math.round(priceDifferencePercent),
      competitorsCount: count,
      tips: [
        "High WiFi speed listings report 35% higher booking success rates.",
        "AC is high in demand in this zone during summers. Consider a seasonal surcharge.",
        priceDifferencePercent > 15 ? "Your pricing is currently in the luxury bracket. Offer free laundry to improve booking conversion." : "Your pricing is highly competitive. Boost premium features."
      ]
    };
  } catch (error) {
    console.error("Error analyzing price intelligence: ", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 4. generateRentReceipt - Simulates generating dynamic PDF payment receipts, 
 *    updating status in Firestore and responding with the URL.
 */
exports.generateRentReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const { paymentId, bookingId, amount, studentName, month } = data;
  if (!paymentId || !bookingId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing parameters.");
  }

  // Simulated receipt storage url
  const receiptUrl = `https://firebasestorage.googleapis.com/v0/b/mock-project/o/receipts%2Freceipt_${paymentId}.pdf?alt=media`;

  try {
    await db.collection("payments").doc(paymentId).update({
      receipt: receiptUrl,
      receiptGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      receiptUrl: receiptUrl,
      msg: `Receipt generated successfully for ${studentName} for the amount of ₹${amount}.`
    };
  } catch (error) {
    console.error("Error generating receipt: ", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 5. escalateTicket - Firestore trigger to auto-escalate ticket if owner 
 *    hasn't responded/acknowledged maintenance ticket status within SLA thresholds.
 */
exports.escalateTicket = functions.firestore
  .document("maintenance/{ticketId}")
  .onUpdate(async (change, context) => {
    const ticketId = context.params.ticketId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if status changed from "open" to "acknowledged" 
    // In production, we'd run a scheduled job, but this trigger demonstrates SLA transitions
    if (beforeData.status === "Open" && afterData.status === "Escalated") {
      const ownerId = afterData.owner_id;
      const roomAddress = afterData.room_address || "Accommodation";
      
      // Auto push notify owner about escalation SLA breach
      const notificationRef = db.collection("notifications").doc(ownerId).collection("userNotifications").doc();
      await notificationRef.set({
        type: "sla_breach",
        title: "⚠️ SLA ESCALATION ALARM",
        message: `Maintenance Ticket #${ticketId} for ${roomAddress} was escalated due to non-response inside 24 hours.`,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Reduce owner trust score for SLA breach
      const ownerRef = db.collection("users").doc(ownerId);
      const ownerDoc = await ownerRef.get();
      if (ownerDoc.exists) {
        const currentTrust = ownerDoc.data().trustScore || 100;
        await ownerRef.update({
          trustScore: Math.max(50, currentTrust - 5) // -5 trust points
        });
      }

      console.log(`Ticket #${ticketId} escalated successfully. Owner penalised.`);
    }
  });

/**
 * 6. sendPaymentReminder - Simulates a scheduled scheduler triggering due notifications.
 *    For demo, we make it callable so admins can test-fire payment cycles instantly.
 */
exports.sendPaymentReminder = functions.https.onCall(async (data, context) => {
  try {
    const activeBookings = await db.collection("bookings")
      .where("status", "==", "Active")
      .get();

    let notificationsSent = 0;

    for (const doc of activeBookings.docs) {
      const booking = doc.data();
      const studentId = booking.student_id;
      const ownerId = booking.owner_id;
      const rentAmount = booking.rent || 5000;

      // Push notification to student
      await db.collection("notifications").doc(studentId).collection("userNotifications").add({
        type: "rent_due",
        title: "🔔 Rent Payment Reminder",
        message: `Your monthly rent of ₹${rentAmount} is due in 3 days. Please complete your transaction.`,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      notificationsSent++;
    }

    return {
      success: true,
      remindersSent: notificationsSent
    };
  } catch (error) {
    console.error("Error triggering payment reminder daemon: ", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
