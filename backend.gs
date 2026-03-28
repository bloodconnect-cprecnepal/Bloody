// backend.gs

// Constants for security
const TOKEN_SECRET = 'your_secret_key';
const RATE_LIMIT = 100; // requests per hour
const AUDIT_LOG_FILE = 'audit_log.txt';

// In-memory store for rate limiting
let rateLimitStore = {};

// Hashing function (use a library for a real project)
function hashPassword(password) {
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    return hash.map(byte => ('0' + (byte + 256).toString(16)).slice(-2)).join('');
}

// Token generation function
function generateToken(data) {
    return Utilities.base64Encode(JSON.stringify(data) + '.' + TOKEN_SECRET);
}

// Input validation function
function validateInput(input) {
    if (typeof input !== 'string' || input.trim() === '') {
        throw new Error('Invalid input.');
    }
}

// Rate limiting check
function checkRateLimit(user) {
    const now = Date.now();
    if (!rateLimitStore[user]) {
        rateLimitStore[user] = {count: 0, last: now};
    }
    const userData = rateLimitStore[user];
    if (now - userData.last > 3600000) {
        userData.count = 0;
        userData.last = now;
    }
    userData.count++;
    if (userData.count > RATE_LIMIT) {
        throw new Error('Rate limit exceeded. Try again later.');
    }
}

// Audit logging
function logAudit(action) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${action}\n`;
    const file = DriveApp.getFileById(AUDIT_LOG_FILE);
    file.append(logEntry);
}

// Main function to illustrate functionality
function mainFunction(userInput, action) {
    try {
        validateInput(userInput);
        checkRateLimit(action.user);
        const hashedPassword = hashPassword(userInput);
        const token = generateToken({user: action.user});
        logAudit(`User ${action.user} performed action: ${action.description}`);
        return {token, hashedPassword};
    } catch (error) {
        throw error;
    }
}
// Add to backend.gs - within doPost function
else if (data.action === 'updateRequestStatus') {
    const result = handleBloodRequestStatusUpdate(
        data.requestId,
        data.status,
        data.notes || '',
        data.sendSMS !== false
    );
    return success(result);
}

// Add getRequestStatus handler
else if (data.action === 'getRequestStatus') {
    const request = findBloodRequest(data.requestId, data.phone);
    if (request) {
        return success({ request: request });
    }
    return error('Request not found');
}

// Helper function
function findBloodRequest(requestId, contactPhone) {
    const sheet = getBloodRequestSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId && data[i][15] === contactPhone) {
            return {
                RequestID: data[i][0],
                Date: data[i][1],
                PatientName: data[i][2],
                BloodType: data[i][8],
                Quantity: data[i][9],
                Urgency: data[i][10],
                HospitalName: data[i][16],
                Department: data[i][17],
                ContactName: data[i][12],
                ContactRelationship: data[i][13],
                ContactPhone: data[i][14],
                Status: data[i][22],
                CreatedAt: data[i][23],
                UpdatedAt: data[i][24]
            };
        }
    }
    return null;
}
