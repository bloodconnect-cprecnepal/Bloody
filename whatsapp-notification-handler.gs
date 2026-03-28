// ==========================================
// WHATSAPP NOTIFICATION HANDLER - GOOGLE APPS SCRIPT
// Using CallMeBot API (Free) - Perfect for Nepal
// ==========================================

const CALLMEBOT_API_KEY = 'YOUR_CALLMEBOT_API_KEY'; // Get free from: https://www.callmebot.com/blog/free-api-whatsapp-messages/
const WHATSAPP_ENABLED = true;
const WHATSAPP_QUEUE_LIMIT = 100; // Daily message limit

// WhatsApp notification rate limit (prevent spam)
const NOTIFICATION_RATE_LIMIT = {
  'REQUEST_SUBMITTED': 1,    // Send 1 time
  'REQUEST_APPROVED': 1,      // Send 1 time
  'REQUEST_REJECTED': 1,      // Send 1 time
  'REQUEST_FULFILLED': 1,     // Send 1 time
  'EMERGENCY_BROADCAST': 5    // Send up to 5 times
};

// ==========================
// WhatsApp Message Sending
// ==========================

/**
 * Send WhatsApp message using CallMeBot API (Free)
 * @param {string} phoneNumber - Phone number in format: 977XXXXXXXXX or +977XXXXXXXXX
 * @param {string} message - Message text (max 4096 characters)
 * @returns {object} - Success/failure result
 */
function sendWhatsApp(phoneNumber, message) {
  if (!WHATSAPP_ENABLED) {
    Logger.log('WhatsApp disabled. Message: ' + message);
    return { success: false, message: 'WhatsApp disabled' };
  }

  try {
    // Validate and format phone number
    phoneNumber = formatPhoneNumber(phoneNumber);
    if (!phoneNumber) {
      logAction('WHATSAPP_ERROR', phoneNumber, 'Failed', 'Invalid phone format');
      return { success: false, error: 'Invalid phone number format' };
    }

    // Truncate message if too long
    if (message.length > 4096) {
      message = message.substring(0, 4093) + '...';
    }

    // CallMeBot API endpoint
    const url = 'https://api.callmebot.com/whatsapp.php?' +
      'phone=' + phoneNumber +
      '&text=' + encodeURIComponent(message) +
      '&apikey=' + CALLMEBOT_API_KEY;

    const options = {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200 || responseCode === 201) {
      logAction('WHATSAPP_SENT', phoneNumber, 'Success', 'Message delivered');
      return { success: true, messageId: phoneNumber + '_' + new Date().getTime() };
    } else if (responseCode === 429) {
      logAction('WHATSAPP_ERROR', phoneNumber, 'Failed', 'Rate limit exceeded');
      return { success: false, error: 'Rate limit exceeded. Try later.' };
    } else {
      logAction('WHATSAPP_ERROR', phoneNumber, 'Failed', `Code: ${responseCode}`);
      return { success: false, error: `API Error: ${responseCode}` };
    }
  } catch (error) {
    logAction('WHATSAPP_EXCEPTION', phoneNumber, 'Failed', error.toString());
    return { success: false, error: error.toString() };
  }
}

// ==========================
// Phone Number Formatting
// ==========================

function formatPhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digit characters except +
  phone = phone.replace(/[^\d+]/g, '');

  // Remove + if present
  phone = phone.replace('+', '');

  // Handle Nepali numbers
  if (phone.startsWith('977')) {
    // Already in format: 977XXXXXXXXX
    if (phone.length === 12) return phone;
  } else if (phone.startsWith('0')) {
    // Format: 0XXXXXXXXX -> Convert to 977XXXXXXXXX
    if (phone.length === 10) {
      return '977' + phone.substring(1);
    }
  } else if (phone.length === 10) {
    // Format: XXXXXXXXX -> Convert to 977XXXXXXXXX
    return '977' + phone;
  } else if (phone.length === 12 && !phone.startsWith('977')) {
    // Already full format
    return phone;
  }

  return null;
}

// ==========================
// WhatsApp Message Templates
// ==========================

function getOTPWhatsApp(otp, expiryMinutes = 5) {
  return `🩸 *Blood Connect Nepal*

Your OTP: *${otp}*

Valid for ${expiryMinutes} minutes.
Do not share with anyone.

Visit: https://blood-connect.org.np`;
}

function getBloodRequestConfirmationWhatsApp(requestId, bloodType, quantity, urgency) {
  return `🩸 *Blood Connect Nepal*

✓ *Blood Request Received*

Request ID: *${requestId}*
Blood Type: *${bloodType}*
Quantity: *${quantity} units*
Urgency: *${urgency}*

Your request has been submitted successfully. You will receive updates shortly.

Track Status: https://blood-connect.org.np/tracking?id=${requestId}`;
}

function getBloodRequestApprovedWhatsApp(requestId, expectedDeliveryDate, notes = '') {
  let message = `🩸 *Blood Connect Nepal*

✓ *Blood Request Approved*

Request ID: *${requestId}*
Status: *Approved*
Expected Delivery: *${expectedDeliveryDate}*`;

  if (notes) {
    message += `\n\nNotes: _${notes}_`;
  }

  message += `\n\nYou can track your request here:
https://blood-connect.org.np/tracking?id=${requestId}

Thank you for using Blood Connect Nepal!`;

  return message;
}

function getBloodRequestRejectedWhatsApp(requestId, reason = '') {
  let message = `🩸 *Blood Connect Nepal*

ℹ️ *Request Status Update*

Request ID: *${requestId}*
Status: *Unable to Fulfill*`;

  if (reason) {
    message += `\nReason: _${reason}_`;
  }

  message += `\n\nPlease contact your hospital for alternative arrangements.

Hospital Support: https://blood-connect.org.np/support`;

  return message;
}

function getBloodRequestFulfilledWhatsApp(requestId, deliveryDetails = '') {
  let message = `🩸 *Blood Connect Nepal*

✅ *Blood Request Fulfilled*

Request ID: *${requestId}*

Your blood has been successfully delivered.`;

  if (deliveryDetails) {
    message += `\n\nDelivery Details:\n_${deliveryDetails}_`;
  }

  message += `\n\nThank you for using Blood Connect Nepal!`;

  return message;
}

function getEmergencyBloodRequestWhatsApp(bloodType, quantity, location, hospitalPhone, hospitalName) {
  return `🚨 *EMERGENCY - Blood Connect Nepal*

*${bloodType} BLOOD NEEDED URGENTLY*

Location: *${location}*
Hospital: *${hospitalName}*
Quantity: *${quantity} units*
Contact: *${hospitalPhone}*

Can you help? *Reply YES* or contact hospital immediately.

Every second counts! 🩸`;
}

function getDonorInvitationWhatsApp(bloodType, lastDonationDate = '') {
  let message = `🩸 *Blood Connect Nepal*

We need YOU! 

Your blood type *${bloodType}* is urgently needed.

Donation is safe, quick (10-15 minutes), and saves lives.`;

  if (lastDonationDate) {
    message += `\n\nLast donated: _${lastDonationDate}_`;
  }

  message += `\n\nSchedule donation now:
https://blood-connect.org.np/donate

Every donation saves 3 lives! 💉`;

  return message;
}

function getStatusUpdateWhatsApp(requestId, newStatus, additionalInfo = '') {
  let emoji = '';
  if (newStatus === 'Approved') emoji = '✓';
  if (newStatus === 'Fulfilled') emoji = '✅';
  if (newStatus === 'Rejected') emoji = 'ℹ️';

  let message = `🩸 *Blood Connect Nepal*

${emoji} *Request Status Update*

Request ID: *${requestId}*
New Status: *${newStatus}*`;

  if (additionalInfo) {
    message += `\n\n${additionalInfo}`;
  }

  message += `\n\nTrack full details:
https://blood-connect.org.np/tracking?id=${requestId}`;

  return message;
}

// ==========================
// WhatsApp Notification Triggers
// ==========================

function sendBloodRequestConfirmationWhatsApp(contactPhone, requestId, bloodType, quantity, urgency) {
  if (!shouldSendNotification('REQUEST_SUBMITTED', contactPhone)) {
    return { success: false, message: 'Notification throttled' };
  }

  const message = getBloodRequestConfirmationWhatsApp(requestId, bloodType, quantity, urgency);
  return sendWhatsApp(contactPhone, message);
}

function sendBloodRequestApprovedWhatsApp(contactPhone, requestId, expectedDate, notes = '') {
  if (!shouldSendNotification('REQUEST_APPROVED', contactPhone)) {
    return { success: false, message: 'Notification throttled' };
  }

  const message = getBloodRequestApprovedWhatsApp(requestId, expectedDate, notes);
  return sendWhatsApp(contactPhone, message);
}

function sendBloodRequestRejectedWhatsApp(contactPhone, requestId, reason = '') {
  if (!shouldSendNotification('REQUEST_REJECTED', contactPhone)) {
    return { success: false, message: 'Notification throttled' };
  }

  const message = getBloodRequestRejectedWhatsApp(requestId, reason);
  return sendWhatsApp(contactPhone, message);
}

function sendBloodRequestFulfilledWhatsApp(contactPhone, requestId, details = '') {
  if (!shouldSendNotification('REQUEST_FULFILLED', contactPhone)) {
    return { success: false, message: 'Notification throttled' };
  }

  const message = getBloodRequestFulfilledWhatsApp(requestId, details);
  return sendWhatsApp(contactPhone, message);
}

function sendOTPWhatsApp(phoneNumber, otp) {
  const message = getOTPWhatsApp(otp);
  return sendWhatsApp(phoneNumber, message);
}

function broadcastEmergencyRequestWhatsApp(bloodType, quantity, location, hospitalPhone, hospitalName) {
  const donorList = getDonorsWithBloodType(bloodType);
  
  if (donorList.length === 0) {
    logAction('BROADCAST_ERROR', location, 'Failed', 'No donors found');
    return { success: false, error: 'No donors available' };
  }

  const message = getEmergencyBloodRequestWhatsApp(bloodType, quantity, location, hospitalPhone, hospitalName);
  
  let successCount = 0;
  let failureCount = 0;

  donorList.forEach((donor, index) => {
    // Add small delay to prevent rate limiting
    if (index > 0) Utilities.sleep(1000);

    if (shouldSendNotification('EMERGENCY_BROADCAST', donor.phone)) {
      const result = sendWhatsApp(donor.phone, message);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  });

  logAction('BROADCAST_WHATSAPP', location, 'Complete', `Sent: ${successCount}, Failed: ${failureCount}`);
  return { 
    success: true, 
    sent: successCount, 
    failed: failureCount, 
    total: donorList.length 
  };
}

// ==========================
// Rate Limiting & Throttling
// ==========================

function shouldSendNotification(notificationType, targetId) {
  const cacheKey = notificationType + '_' + targetId;
  const cache = CacheService.getScriptCache();
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return false; // Already sent recently, throttle
  }

  const maxAttempts = NOTIFICATION_RATE_LIMIT[notificationType] || 1;
  const expirySeconds = 3600; // 1 hour

  cache.put(cacheKey, 'sent', expirySeconds);
  return true;
}

// ==========================
// Integration with Blood Request Handler
// ==========================

function handleBloodRequestStatusUpdateWithWhatsApp(requestId, newStatus, notes = '', sendWhatsAppNotification = true) {
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

  // Send WhatsApp notification
  if (sendWhatsAppNotification && request[15]) { // ContactPhone column
    let result = null;

    if (newStatus === 'Approved') {
      result = sendBloodRequestApprovedWhatsApp(request[15], requestId, notes);
    } else if (newStatus === 'Rejected') {
      result = sendBloodRequestRejectedWhatsApp(request[15], requestId, notes);
    } else if (newStatus === 'Fulfilled') {
      result = sendBloodRequestFulfilledWhatsApp(request[15], requestId, notes);
    }

    if (result && result.success) {
      logAction('WHATSAPP_NOTIFICATION', requestId, 'Success', `Status: ${newStatus}`);
    } else {
      logAction('WHATSAPP_NOTIFICATION', requestId, 'Failed', result?.error || 'Unknown error');
    }
  }

  logAction('REQUEST_STATUS_UPDATE', requestId, 'Success', `Status: ${newStatus}`);
  return { success: true, message: 'Status updated with WhatsApp notification' };
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
    if (data[i][6] === bloodType && data[i][4]) { // BloodType and Phone columns
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
// Test Functions
// ==========================

function testSendWhatsApp() {
  const testPhone = '9779803369377'; // Replace with your Nepali phone
  const testMessage = '🩸 Blood Connect Nepal - Test Message\n\nThis is a test message from Blood Connect Nepal system.\n\nIf you received this, WhatsApp integration is working!';
  
  const result = sendWhatsApp(testPhone, testMessage);
  Logger.log(result);
  return result;
}

function testOTPWhatsApp() {
  const testPhone = '9774XXXXXXXX'; // Replace with your phone
  const testOTP = '123456';
  
  const result = sendOTPWhatsApp(testPhone, testOTP);
  Logger.log(result);
  return result;
}

function testEmergencyBroadcast() {
  const result = broadcastEmergencyRequestWhatsApp(
    'O+',
    3,
    'Kathmandu Medical College, Sinamangal',
    '9801234567',
    'Kathmandu Medical College'
  );
  Logger.log(result);
  return result;
}
