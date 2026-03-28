// ==========================================
// SMS NOTIFICATION HANDLER - GOOGLE APPS SCRIPT
// Integrates Twilio for SMS notifications
// ==========================================

const TWILIO_ACCOUNT_SID = 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_FROM_NUMBER = '+977XXXXXXXXX'; // Your Twilio number
const SMS_ENABLED = true;

// ==========================
// SMS Sending Functions
// ==========================

function sendSMS(toNumber, message) {
  if (!SMS_ENABLED) {
    console.log('SMS disabled. Message would be: ' + message);
    return { success: false, message: 'SMS disabled' };
  }

  try {
    // Validate phone number
    if (!toNumber || toNumber.length < 7) {
      logAction('SMS_ERROR', toNumber, 'Failed', 'Invalid phone number');
      return { success: false, error: 'Invalid phone number' };
    }

    // Format phone number to international format
    if (!toNumber.startsWith('+')) {
      toNumber = '+977' + toNumber.replace(/^0/, '');
    }

    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';
    
    const payload = {
      To: toNumber,
      From: TWILIO_FROM_NUMBER,
      Body: message
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN)
      },
      payload: payload,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 201) {
      logAction('SMS_SENT', toNumber, 'Success', 'SID: ' + result.sid);
      return { success: true, sid: result.sid };
    } else {
      logAction('SMS_ERROR', toNumber, 'Failed', result.message || 'Unknown error');
      return { success: false, error: result.message };
    }
  } catch (error) {
    logAction('SMS_EXCEPTION', toNumber, 'Failed', error.toString());
    return { success: false, error: error.toString() };
  }
}

// ==========================
// SMS Templates
// ==========================

function getOTPSMS(otp, expiryMinutes = 5) {
  return `🩸 Blood Connect Nepal\n\nYour OTP: ${otp}\n\nValid for ${expiryMinutes} minutes.\n\nDo not share with anyone.`;
}

function getBloodRequestConfirmationSMS(requestId, bloodType, quantity, urgency) {
  return `🩸 Blood Connect Nepal\n\n✓ Blood request received!\n\nRequest ID: ${requestId}\nBlood Type: ${bloodType}\nQuantity: ${quantity} units\nUrgency: ${urgency}\n\nYou will receive updates soon.`;
}

function getBloodRequestApprovedSMS(requestId, expectedDeliveryDate, notes = '') {
  let message = `🩸 Blood Connect Nepal\n\n✓ Your blood request has been approved!\n\nRequest ID: ${requestId}\nExpected Delivery: ${expectedDeliveryDate}`;
  
  if (notes) {
    message += `\n\nNotes: ${notes}`;
  }
  
  message += `\n\nFor assistance, contact us or reply to this message.`;
  return message;
}

function getBloodRequestRejectedSMS(requestId, reason = '') {
  let message = `🩸 Blood Connect Nepal\n\nℹ️ Your blood request has been reviewed.\n\nRequest ID: ${requestId}\nStatus: Unable to fulfill`;
  
  if (reason) {
    message += `\n\nReason: ${reason}`;
  }
  
  message += `\n\nPlease contact your hospital for alternatives.`;
  return message;
}

function getDonorRequestSMS(bloodType, quantity, urgency, location) {
  let urgent = '';
  if (urgency === 'Emergency') {
    urgent = '🚨 URGENT - ';
  } else if (urgency === 'Urgent') {
    urgent = '⚠️ ';
  }

  return `${urgent}Blood Connect Nepal\n\n${bloodType} blood units needed immediately!\n\nQuantity: ${quantity} units\nLocation: ${location}\nUrgency: ${urgency}\n\nPlease respond if you can donate.\nReply YES or contact: [Hospital Phone]`;
}

function getStatusUpdateSMS(requestId, newStatus, additionalInfo = '') {
  let statusEmoji = '';
  if (newStatus === 'Approved') statusEmoji = '✓ ';
  if (newStatus === 'Fulfilled') statusEmoji = '✅ ';
  if (newStatus === 'Rejected') statusEmoji = '❌ ';

  let message = `🩸 Blood Connect Nepal\n\n${statusEmoji}Request Status Update\n\nRequest ID: ${requestId}\nNew Status: ${newStatus}`;
  
  if (additionalInfo) {
    message += `\n\n${additionalInfo}`;
  }

  return message;
}

// ==========================
// SMS Notification Triggers
// ==========================

function sendBloodRequestConfirmationSMS(requestId, contactPhone, bloodType, quantity, urgency) {
  const message = getBloodRequestConfirmationSMS(requestId, bloodType, quantity, urgency);
  return sendSMS(contactPhone, message);
}

function sendBloodRequestApprovedSMS(contactPhone, requestId, expectedDate, notes = '') {
  const message = getBloodRequestApprovedSMS(requestId, expectedDate, notes);
  return sendSMS(contactPhone, message);
}

function sendBloodRequestRejectedSMS(contactPhone, requestId, reason = '') {
  const message = getBloodRequestRejectedSMS(requestId, reason);
  return sendSMS(contactPhone, message);
}

function sendOTPSMS(phoneNumber, otp) {
  const message = getOTPSMS(otp);
  return sendSMS(phoneNumber, message);
}

function sendDonorRequestSMS(donorPhone, bloodType, quantity, urgency, location) {
  const message = getDonorRequestSMS(bloodType, quantity, urgency, location);
  return sendSMS(donorPhone, message);
}

function broadcastEmergencyRequest(bloodType, quantity, location, hospitalPhone) {
  // Get list of donors with matching blood type
  const donorList = getDonorsWithBloodType(bloodType);
  
  const message = `🚨 EMERGENCY BLOOD NEEDED\n\n${bloodType} blood required immediately!\n\nQuantity: ${quantity} units\nLocation: ${location}\n\nCan you help? Contact: ${hospitalPhone}`;
  
  let successCount = 0;
  donorList.forEach(donor => {
    const result = sendSMS(donor.phone, message);
    if (result.success) successCount++;
  });

  logAction('BROADCAST_SMS', location, 'Success', `Sent to ${successCount}/${donorList.length} donors`);
  return { success: true, sent: successCount, total: donorList.length };
}

// ==========================
// Helper Functions
// ==========================

function getDonorsWithBloodType(bloodType) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const donors = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === bloodType && data[i][4]) { // BloodType column and Phone column
      donors.push({
        name: data[i][3],
        phone: data[i][4],
        bloodType: data[i][6]
      });
    }
  }

  return donors;
}

function logAction(action, target, status, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Logs');
    if (!sheet) sheet = ss.insertSheet('Logs');
    sheet.appendRow([new Date(), action, target, status, details]);
  } catch (e) {
    console.error('Logging failed: ' + e);
  }
}

// ==========================
// Integration with Blood Request Handler
// ==========================

function handleBloodRequestStatusUpdate(requestId, newStatus, notes = '', sendSMSNotification = true) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('BloodRequests');
  if (!sheet) return { success: false, error: 'BloodRequests sheet not found' };

  const data = sheet.getDataRange().getValues();
  let requestRow = null;
  let request = null;

  // Find request
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      requestRow = i + 1;
      request = data[i];
      break;
    }
  }

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  // Update status
  sheet.getRange(requestRow, 23).setValue(newStatus); // Status column
  sheet.getRange(requestRow, 25).setValue(new Date()); // UpdatedAt

  // Send SMS notification if enabled
  if (sendSMSNotification && request[15]) { // ContactEmail/Phone column
    let result = null;

    if (newStatus === 'Approved') {
      result = sendBloodRequestApprovedSMS(request[15], requestId, notes);
    } else if (newStatus === 'Rejected') {
      result = sendBloodRequestRejectedSMS(request[15], requestId, notes);
    } else if (newStatus === 'Fulfilled') {
      result = sendSMS(request[15], `✅ Your blood request (${requestId}) has been fulfilled! Thank you for your patience.`);
    }

    if (result && result.success) {
      logAction('SMS_NOTIFICATION', requestId, 'Success', `Status update: ${newStatus}`);
    }
  }

  logAction('REQUEST_STATUS_UPDATE', requestId, 'Success', `Status: ${newStatus}, SMS: ${sendSMSNotification}`);
  return { success: true, message: 'Status updated with SMS notification' };
}

// ==========================
// Test Functions
// ==========================

function testSendSMS() {
  // Replace with a test phone number
  const testPhone = '+9779803369377';
  const testMessage = '🩸 Blood Connect Nepal - Test SMS\n\nThis is a test message from Blood Connect Nepal system.';
  
  const result = sendSMS(testPhone, testMessage);
  Logger.log(result);
  return result;
}

function testOTPSMS() {
  const testPhone = '+977XXXXXXXXX';
  const testOTP = '123456';
  
  const result = sendOTPSMS(testPhone, testOTP);
  Logger.log(result);
  return result;
}
